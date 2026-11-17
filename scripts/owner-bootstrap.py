"""Trusted operator helper. No bearer or claim code appears in argv or output."""
import argparse
import getpass
import gzip
import json
import urllib.error
import urllib.parse
import urllib.request


def request(origin, action, token, code):
    payload = json.dumps({"code": code}).encode()
    operation = urllib.request.Request(
        origin + "/api/admin/bootstrap/" + action,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json",
                 "Authorization": "Bearer " + token,
                 "User-Agent": "VOIDLINE-Authorized-Owner-Setup/1.0"},
    )
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *_arguments, **_keywords):
            return None
    try:
        response = urllib.request.build_opener(NoRedirect).open(operation, timeout=30)
    except urllib.error.HTTPError as error:
        response = error
    raw = response.read()
    if response.headers.get('content-encoding') == 'gzip':
        raw = gzip.decompress(raw)
    try:
        result = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise SystemExit('Owner setup returned an invalid response. Nothing was confirmed.')
    if not 200 <= response.status < 300:
        raise SystemExit("Owner setup did not complete: " + result.get("error", {}).get("code", "unavailable"))
    return result


parser = argparse.ArgumentParser(description="Resolve or bind a verified owner request through trusted infrastructure authorization.")
parser.add_argument("action", choices=["resolve", "bind"])
parser.add_argument("--origin", required=True)
parser.add_argument("--expected-account-id")
arguments = parser.parse_args()
parsed = urllib.parse.urlsplit(arguments.origin)
if parsed.scheme != "https" or parsed.username or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
    raise SystemExit("Use the exact HTTPS Site origin.")
origin = parsed.scheme + "://" + parsed.netloc
if arguments.action == "bind" and not arguments.expected_account_id:
    raise SystemExit("Binding requires --expected-account-id from an independently verified ownership request.")
token = getpass.getpass("Infrastructure bootstrap token: ")
code = getpass.getpass("Five-minute ownership request code: ")
resolved = request(origin, "resolve", token, code)
if arguments.action == "resolve":
    print(json.dumps(resolved, indent=2))
else:
    if resolved.get("accountId") != arguments.expected_account_id:
        raise SystemExit("The verified account ID does not match the expected account. Nothing was bound.")
    result = request(origin, "bind", token, code)
    print(json.dumps({"bound": result.get("bound"), "accountId": result.get("accountId"),
                      "nextStep": "Remove bootstrap runtime values and redeploy."}, indent=2))
token = code = ""
