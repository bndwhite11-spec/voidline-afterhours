"""Dedicated private-room policy using Synapse's documented module API."""
from pathlib import Path
from urllib.parse import urlsplit

from synapse.api.errors import SynapseError
from twisted.internet.defer import ensureDeferred

ALGORITHM = "m.megolm.v1.aes-sha2"
MAX_MEMBERS = 64
ROOM_STATE = {
    "m.room.power_levels", "m.room.name", "m.room.avatar", "m.room.topic",
    "m.room.join_rules", "m.room.guest_access", "m.room.history_visibility",
    "m.room.encryption",
}


class VoidlineRoomPolicy:
    @staticmethod
    def parse_config(config):
        origin = config.get("decision_origin", "")
        url = urlsplit(origin)
        if url.scheme != "https" or not url.hostname or url.username or url.password or url.path or url.query or url.fragment:
            raise ValueError("decision_origin must be the exact HTTPS VOIDLINE origin")
        token = Path(config["token_file"]).read_text(encoding="ascii").strip()
        if not 32 <= len(token) <= 256 or not token.isprintable() or any(c.isspace() for c in token):
            raise ValueError("invalid policy credential")
        return {"url": origin + "/api/encryption/policy/decision", "token": token}

    def __init__(self, config, api):
        # Synapse has installed its event reactor before module initialization.
        from twisted.internet import reactor
        self.reactor = reactor
        self.api = api
        self.url = config["url"]
        self.headers = {b"Authorization": [("Bearer " + config["token"]).encode("ascii")]}
        api.register_third_party_rules_callbacks(
            on_create_room=self.on_create_room,
            check_event_allowed=self.check_event_allowed,
            check_threepid_can_be_invited=self.no_third_party,
            check_visibility_can_be_modified=self.private_visibility,
        )

    async def decision(self, action, actor, members):
        participants = sorted(set(members) | {actor})
        if len(participants) > MAX_MEMBERS:
            return False
        try:
            # Bound the entire JSON response, including reading the body.
            query = self.api.http_client.post_json_get_json(
                self.url, {"action": action, "actor": actor, "members": participants}, self.headers
            )
            result = await ensureDeferred(query).addTimeout(5, self.reactor)
            return isinstance(result, dict) and result.get("allowed") is True
        except Exception:
            return False

    async def on_create_room(self, requester, config, is_requester_admin):
        actor = requester.user.to_string()
        if (config.get("visibility", "private") != "private"
                or config.get("preset", "private_chat") not in ("private_chat", "trusted_private_chat")
                or config.get("room_alias_name") or config.get("invite_3pid")
                or config.get("creation_content", {}).get("type")
                or not await self.decision("create", actor, config.get("invite", []))):
            raise SynapseError(403, "Private conversation unavailable")
        # Supported on_create_room input mutations apply to ordinary Matrix clients too.
        config.setdefault("creation_content", {})["m.federate"] = False
        initial = config.setdefault("initial_state", [])
        required = {
            "m.room.encryption": {"algorithm": ALGORITHM},
            "m.room.history_visibility": {"history_visibility": "joined"},
            "m.room.join_rules": {"join_rule": "invite"},
            "m.room.guest_access": {"guest_access": "forbidden"},
        }
        for kind, content in required.items():
            matching = [e for e in initial if e.get("type") == kind and e.get("state_key", "") == ""]
            if any(any(e.get("content", {}).get(k) != v for k, v in content.items()) for e in matching):
                raise SynapseError(403, "Private conversation settings required")
            if not matching:
                initial.append({"type": kind, "state_key": "", "content": content})

    async def check_event_allowed(self, event, state):
        kind, actor = event.type, event.sender
        membership = event.content.get("membership") if kind == "m.room.member" else None
        if membership == "leave" and event.state_key == actor:
            # A user can always remove themselves or decline an invitation.
            return True, None
        if kind == "m.room.create":
            return event.content.get("m.federate") is False and not event.content.get("type") and await self.decision("create", actor, []), None
        create = state.get(("m.room.create", ""))
        if not create or create.content.get("m.federate") is not False or create.content.get("type"):
            return False, None
        membership_state = {key: e.content.get("membership") for (etype, key), e in state.items() if etype == "m.room.member"}
        peers = {key for key, status in membership_state.items() if status in ("join", "invite")}
        if kind == "m.room.member":
            target = event.state_key
            if membership in ("ban", "leave"):
                return membership_state.get(actor) == "join" and await self.decision("remove", actor, []), None
            if membership == "invite" and membership_state.get(actor) == "join":
                return await self.decision("invite", actor, peers | {target}), None
            if membership == "join" and actor == target:
                admitted = membership_state.get(actor) in ("invite", "join") or (actor == create.sender and not membership_state)
                return admitted and await self.decision("join", actor, peers), None
            return False, None
        if membership_state.get(actor) != "join":
            return False, None
        if kind == "m.room.encrypted":
            encryption = state.get(("m.room.encryption", ""))
            if not encryption or encryption.content.get("algorithm") != ALGORITHM or event.content.get("algorithm") != ALGORITHM:
                return False, None
            return await self.decision("send", actor, peers), None
        if kind in ROOM_STATE and event.is_state() and event.state_key == "":
            fixed = {"m.room.encryption": ("algorithm", ALGORITHM), "m.room.join_rules": ("join_rule", "invite"),
                     "m.room.history_visibility": ("history_visibility", "joined"), "m.room.guest_access": ("guest_access", "forbidden")}
            guard = fixed.get(kind)
            if guard and event.content.get(guard[0]) != guard[1]:
                return False, None
            return await self.decision("state", actor, peers), None
        if kind == "m.room.redaction":
            return await self.decision("remove", actor, []), None
        return False, None

    async def no_third_party(self, medium, address, state):
        return False

    async def private_visibility(self, room_id, state, new_visibility):
        return new_visibility == "private"
