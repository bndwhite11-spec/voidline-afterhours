"""Exercise the installed Synapse callbacks and the production decision handler on loopback.

Use a Synapse virtual environment with Node 22.13+ and OpenSSL on PATH.
"""
import hashlib
import json
import os
from pathlib import Path
import secrets
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from contextlib import ExitStack

import synapse
import yaml
from synapse._scripts.register_new_matrix_user import request_registration

HERE = Path(__file__).resolve().parent
DOMAIN = "policy.test"


def loopback_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def process(stack, args, directory, **extra):
    log = stack.enter_context((directory / (str(len(args)) + ".log")).open("ab"))
    child = subprocess.Popen(args, cwd=directory, stdout=log, stderr=subprocess.STDOUT, **extra)
    def stop():
        if child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=8)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()
    stack.callback(stop)
    return child


def ready(port, process):
    for _ in range(160):
        if process.poll() is not None:
            raise RuntimeError("Isolated service exited during startup")
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=.2):
                return
        except OSError:
            time.sleep(.1)
    raise RuntimeError("Loopback service did not become ready")


def main():
    with tempfile.TemporaryDirectory(prefix="voidline-room-policy-") as name, ExitStack() as stack:
        directory = Path(name)
        port, edge_port = loopback_port(), loopback_port()
        origin = f"http://127.0.0.1:{port}"
        token = directory / "token"
        token.write_text(secrets.token_hex(32))
        token.chmod(0o600)
        subprocess.run(["openssl","req","-x509","-newkey","rsa:2048","-nodes","-days","1","-subj","/CN=localhost",
                        "-addext","subjectAltName=DNS:localhost,IP:127.0.0.1","-keyout","key.pem","-out","cert.pem"],
                       cwd=directory, capture_output=True, check=True)
        edge = process(stack, ["node", str(HERE/"proof-oracle.mjs"), name, str(edge_port)], directory)
        ready(edge_port, edge)
        server = [sys.executable, "-m", "synapse.app.homeserver"]
        subprocess.run(server + ["--server-name", DOMAIN, "--config-path", "homeserver.yaml",
                       "--generate-config", "--report-stats=no"], cwd=directory, capture_output=True, check=True)
        path = directory / "homeserver.yaml"
        config = yaml.safe_load(path.read_text())
        registration = secrets.token_hex(32)
        config.update(public_baseurl=origin+"/", enable_registration=False, registration_shared_secret=registration,
                      trusted_key_servers=[], federation_domain_whitelist=[], suppress_key_server_warning=True,
                      rc_message={"per_second":100,"burst_count":200}, rc_login={"address":{"per_second":10,"burst_count":20}},
                      listeners=[{"port":port,"tls":False,"type":"http","bind_addresses":["127.0.0.1"],
                                  "resources":[{"names":["client"],"compress":False}]}],
                      modules=[{"module":"voidline_room_policy.VoidlineRoomPolicy","config":{
                        "decision_origin":f"https://127.0.0.1:{edge_port}", "token_file":str(token)}}])
        path.write_text(yaml.safe_dump(config))
        env = dict(os.environ, PYTHONPATH=str(HERE), SSL_CERT_FILE=str(directory/"cert.pem"))
        home = process(stack, server + ["-c", str(path)], directory, env=env)
        ready(port, home)
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        def api(method, path, data=None, token=None, expect=200):
            headers = {"Content-Type":"application/json"}
            if token:
                headers["Authorization"] = "Bearer "+token
            req = urllib.request.Request(origin+"/_matrix/client/v3/"+path,
                                         data=json.dumps(data).encode() if data is not None else None,
                                         headers=headers, method=method)
            try:
                with opener.open(req, timeout=12) as res:
                    status, value = res.status, json.load(res)
            except urllib.error.HTTPError as exc:
                status, value = exc.code, json.load(exc)
            if status != expect:
                raise RuntimeError(f"{method} {path.split('/')[0]} expected {expect}, got {status} {value.get('errcode','')} {value.get('error','')}")
            return value
        db = sqlite3.connect(directory/"native.sqlite")
        stack.callback(db.close)
        ids, sessions = {}, {}
        for who in ("alice","bob","third","unlinked"):
            local = "v_"+hashlib.sha256(who.encode()).hexdigest()
            ids[who] = "@"+local+":"+DOMAIN
            password = secrets.token_urlsafe(28)
            request_registration(local, password, origin, registration, _print=lambda _:None)
            sessions[who] = api("POST","login",{"type":"m.login.password","identifier":{
                "type":"m.id.user","user":local},"password":password})["access_token"]
            db.execute("INSERT INTO live_accounts(id,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,1,1,1)",(who,who))
            db.execute("INSERT INTO matrix_account_links VALUES(?,?,?,?,?,?)",
                       (who,ids[who],local,"https://"+DOMAIN,None if who=="unlinked" else 1,1))
        db.commit()
        a,b,t,u = (sessions[k] for k in ("alice","bob","third","unlinked"))
        api("POST","createRoom",{},u,403)
        api("POST","createRoom",{"visibility":"public"},a,403)
        creation = api("POST","createRoom",{"preset":"private_chat","invite":[ids["bob"]]},a)
        room = "rooms/"+urllib.parse.quote(creation["room_id"],safe="")+"/"
        assert api("GET",room+"state/m.room.create/",token=a)["m.federate"] is False
        assert api("GET",room+"state/m.room.encryption/",token=a)["algorithm"]=="m.megolm.v1.aes-sha2"
        assert api("GET",room+"state/m.room.history_visibility/",token=a)["history_visibility"]=="joined"
        api("POST",room+"join",{},b)
        def send(token,tx,expect):
            api("PUT",room+"send/m.room.encrypted/"+str(tx),{"algorithm":"m.megolm.v1.aes-sha2",
                "ciphertext":"synthetic-envelope-for-authorization-test"},token,expect)
        send(b,1,200)
        api("PUT",room+"send/m.room.message/plain",{"msgtype":"m.text","body":"fixture"},a,403)
        api("POST",room+"invite",{"user_id":ids["unlinked"]},a,403)
        db.execute("INSERT INTO social_blocks VALUES('bob','alice',1)")
        db.commit()
        send(a,2,403)
        send(b,3,403)
        api("POST",room+"invite",{"user_id":ids["third"]},a,403)
        db.execute("DELETE FROM social_blocks")
        db.commit()
        api("POST",room+"invite",{"user_id":ids["third"]},a)
        api("POST",room+"join",{},t)
        send(t,4,200)
        db.execute("UPDATE live_accounts SET account_status='suspended' WHERE id='third'")
        db.commit()
        send(a,5,403)
        send(t,6,403)
        api("POST",room+"leave",{},t)
        send(t,7,403)
        send(a,8,200)
        db.execute("DELETE FROM matrix_account_links WHERE account_id='bob'")
        db.commit()
        send(a,9,403)
        api("POST",room+"leave",{},b)
        send(a,10,200)
        edge.terminate()
        edge.wait(timeout=8)
        send(a,11,403)
        api("POST",room+"leave",{},a)
        print("PASS real Synapse", synapse.__version__,"private room creation, local binding, restricted history, group admits, encrypted envelope authorization, plaintext refusal, native blocks, suspension, outdated memberships, missing bindings, outage denial and self-leave.")


if __name__ == "__main__":
    main()
