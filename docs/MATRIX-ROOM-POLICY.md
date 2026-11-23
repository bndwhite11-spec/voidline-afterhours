# Managed private room policy

The module in `backend/synapse` checks new events in invite-only, nonfederating private rooms against VOIDLINE's current native account records. It was exercised on Synapse 1.165.0. Install it only on a homeserver dedicated to this service. Its rules apply to the entire homeserver and will reject incompatible existing rooms. Assess earlier rooms and discuss migration with their participants before enabling the module there.

## Operator setup

1. Complete native account enrollment and namespace reservation in [the encryption setup guide](ENCRYPTED-SETUP.md). Confirm that the Worker already has its D1 binding, `MATRIX_HOMESERVER` (exact, canonical HTTPS origin) and `MATRIX_SERVER_NAME` (immutable Matrix server name).
2. Generate 32 random bytes with a cryptographically secure generator. Store the hexadecimal representation as `MATRIX_ROOM_POLICY_TOKEN` in the Worker's secret store. Mount the identical value in a private, read-only file for the Synapse service. Give only the service principal access. Use a dedicated credential for this HTTPS decision endpoint and rotate it independently of login and administration secrets. During mismatched credentials new room mutations fail closed.
3. Install `python -m pip install ./backend/synapse` in the Python environment or operator-built container running the pinned Synapse release. Install the same package on each event-processing worker.
4. Add the module under `modules` in Synapse configuration. Replace the example origin with the exact HTTPS origin serving VOIDLINE. The decision path is fixed in the module. Ensure that Synapse trusts its TLS certificate. If a proxy logs request headers, redact Authorization. Keep the policy path uncached.

```yaml
modules:
  - module: voidline_room_policy.VoidlineRoomPolicy
    config:
      decision_origin: "https://voidline.example.com"
      token_file: "/run/secrets/voidline-room-policy"
```

5. Restart the Synapse processes. Use native-bound staging accounts and a raw Matrix client to confirm the acceptance scenarios below before routing users to the service. Monitor request latency and refused operations. Budget a fresh D1 read for each allowed or refused room mutation, including the initial state events. A policy outage or five-second timeout denies new room mutations and still permits a user to leave.

Synapse documents room-creation config edits, current-state event maps and admission callbacks in its [third-party rules](https://element-hq.github.io/synapse/latest/modules/third_party_rules_callbacks.html) and [module API guide](https://element-hq.github.io/synapse/latest/modules/writing_a_module.html).

## Enforcement and visibility

- The homeserver supplies the authenticated event sender and resolved room membership. Browser cookies cannot use the decision service. Every joined or invited participant must have a verified account binding on the configured service, active account status and completed onboarding. A block in either direction between any two participants denies sends, invitations and joins in that room. This includes groups. A member may leave or decline while blocked or suspended. A joined, eligible moderator may remove a stale member subject to Matrix power-level controls. Messages resume once ineligible participants have left or been removed.
- The module sets nonfederation, Megolm encryption, invite-only admission, joined-only history and forbidden guests during room creation. Ordinary plaintext timelines, third-party-address invitations, room directory publication and weakened policy settings are refused. It accepts only the supported protocol envelope for encrypted timeline events. It does not decrypt ciphertext, inspect attachments or prevent a malicious participant from deliberately disclosing data in metadata.
- The Worker receives only the operation category, actor Matrix ID and unique membership list, capped at 64 people. Matrix peer identifiers and membership associations are visible to these two services. No message bodies, encryption keys, attachment URLs or room IDs are sent. The SQL eligibility check uses one current database snapshot per decision. The decision and Synapse's later event persistence happen in separate services. A decision already in flight during a status change can race that change.
- The module governs local private room events. Native community roles and channel membership still need a server-authoritative room mapping, reconciliation and explicit history policy. The module does not revoke Matrix login tokens, filter to-device key sharing and signaling, conceal presence, retrofit older plaintext history, prevent former members using keys already received, or secure other federated homeservers. Use the existing account lifecycle worker for supported session/device revocation. Keep `accountRestrictionsSynced` and `encryptedDefaultReady` false until the complete enrollment, device, policy, recovery and production acceptance route passes.

## Reproducible verification

`node backend/matrix-room-policy-test.mjs` runs as part of the normal server suite. It uses migrated SQLite with the actual Worker handler and checks authorization, blocked pairs, account status, stale origin, unavailable storage, request scope and privacy.

With Node 22.13+, OpenSSL and Synapse 1.165.0 installed in an isolated Python environment, run `python backend/synapse/proof.py`. The script starts a temporary loopback Synapse plus a TLS adapter for the real Worker decision function. It uses four throwaway identities and exercises collection of membership from Synapse state, allowed encrypted envelope shapes, direct and group room mutations, failed attempts to send plaintext, unlinked invites, blocks, reinstated eligibility, removed members, a missing binding and service outage. It removes the homeserver, SQLite database, test CA and bearer credential when it exits. These envelopes test policy only. For Rust encryption, actual decryption and device exchange use the separate `scripts/test-synapse-exchange.py` gate.
