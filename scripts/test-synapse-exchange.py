"""Run after npm ci, in a Python environment with matrix-synapse installed.

Creates a nonfederating loopback homeserver and three throwaway accounts.
No production tokens, registration capability or external homeserver required.
"""
import json
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

import synapse
import yaml
from synapse._scripts.register_new_matrix_user import request_registration


root = Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix="voidline-matrix-") as work:
    local = Path(work)
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    origin = f"http://127.0.0.1:{port}"
    server = [sys.executable, "-m", "synapse.app.homeserver"]
    with (local / "setup.log").open("wb") as setup:
        subprocess.run(server + ["--server-name", "voidline.test", "--config-path",
                                 "homeserver.yaml", "--generate-config", "--report-stats=no"],
                       cwd=local, stdout=setup, stderr=subprocess.STDOUT, check=True)
    config_path = local / "homeserver.yaml"
    config = yaml.safe_load(config_path.read_text())
    shared_secret = secrets.token_hex(32)
    config.update(
        public_baseurl=origin + "/",
        listeners=[{"port": port, "tls": False, "type": "http", "bind_addresses": ["127.0.0.1"],
                    "resources": [{"names": ["client"], "compress": False}]}],
        registration_shared_secret=shared_secret, enable_registration=False,
        trusted_key_servers=[], federation_domain_whitelist=[], enable_metrics=False,
        suppress_key_server_warning=True, report_stats=False,
        rc_login={"address": {"per_second": 2, "burst_count": 10}},
    )
    config_path.write_text(yaml.safe_dump(config))
    accounts = {u: secrets.token_urlsafe(28) for u in ["proofalice", "proofbob", "proofcarol"]}
    with (local / "homeserver.log").open("wb") as log:
        process = subprocess.Popen(server + ["-c", str(config_path)], cwd=local,
                                   stdout=log, stderr=subprocess.STDOUT)
        try:
            for _ in range(80):
                if process.poll() is not None:
                    raise RuntimeError("Local Synapse exited during startup")
                try:
                    urllib.request.urlopen(origin + "/_matrix/client/versions", timeout=1).close()
                    break
                except (urllib.error.URLError, TimeoutError):
                    time.sleep(.25)
            else:
                raise RuntimeError("Local Synapse did not become ready")
            for user, password in accounts.items():
                request_registration(user, password, origin, shared_secret, _print=lambda _: None)
            print("Isolated Synapse", synapse.__version__, flush=True)
            fixture = {"base": origin, "accounts": accounts,
                       "database": config["database"]["args"]["database"]}
            child = subprocess.run(["node", "scripts/verify-matrix-exchange.mjs"], cwd=root,
                                   input=json.dumps(fixture)+"\n", text=True, capture_output=True, timeout=180)
            for line in child.stdout.splitlines():
                if line.startswith(("PASS ", "RESULT ")):
                    print(line, flush=True)
            if child.returncode:
                errors = [line for line in child.stderr.splitlines() if line.startswith("GATE_FAILURE")]
                raise RuntimeError(next(iter(errors), "Rust/SDK integration gate failed"))
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
