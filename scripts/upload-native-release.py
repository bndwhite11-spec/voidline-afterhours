#!/usr/bin/env python3
"""Upload public VOIDLINE release archives. Secret configuration enters via stdin.

Input: {"token": "...", "origin": "https://...", "files": [
  {"name": "VOIDLINE-Windows-x64.zip", "path": "/absolute/public/archive.zip",
   "sha256": "64 lowercase hex", "bytes": 123}]}.

No command-line token, environment mutation, credential file, redirect, shell,
or artifact execution. Failures leave resumable server state. Repeating identical
input uses the same operation UUID and validates already-acknowledged parts.
"""

import hashlib
import http.client
import json
import math
import re
import ssl
import stat
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
from pathlib import Path

APP_ORIGIN = "https://voidline-afterhours.pipedcactus1.chatgpt.site"
PART_BYTES = 5 * 1024 * 1024
MAX_BYTES = 500 * 1024 * 1024
MAX_ATTEMPTS = 3  # Initial attempt plus two retries, same body and operation ID.
ALLOWED_NAMES = {"VOIDLINE-Windows-x64.zip", "voidline-source.zip"}
BASE_ROUTE = "/api/native-release-upload/"


class UploadError(Exception):
    """Only fixed, nonsecret error text may be placed in this exception."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise UploadError("The upload endpoint attempted a redirect; stopped.")


def emit(value):
    print(json.dumps(value, separators=(",", ":")), flush=True)


def checked_input(config):
    if not isinstance(config, dict) or config.get("origin") != APP_ORIGIN:
        raise UploadError("The origin must be the exact public VOIDLINE HTTPS origin.")
    token = config.get("token")
    if not isinstance(token, str) or not re.fullmatch(r"[A-Za-z0-9._~+/=-]{32,512}", token):
        raise UploadError("A valid upload token is required on standard input.")
    files = config.get("files")
    if not isinstance(files, list) or not 1 <= len(files) <= len(ALLOWED_NAMES):
        raise UploadError("Supply one or two public release files.")
    result = []
    seen = set()
    for source in files:
        if not isinstance(source, dict):
            raise UploadError("Invalid release file metadata.")
        name, filename = source.get("name"), source.get("path")
        digest, size = source.get("sha256"), source.get("bytes")
        if name not in ALLOWED_NAMES or name in seen:
            raise UploadError("Unexpected or duplicate public release filename.")
        if not isinstance(filename, str) or len(filename) > 4096 or not Path(filename).is_absolute():
            raise UploadError("Release file paths must be absolute.")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise UploadError("A SHA-256 digest is required for each public file.")
        if type(size) is not int or not 0 < size <= MAX_BYTES:
            raise UploadError("Invalid public release file size.")
        path = Path(filename)
        try:
            info = path.stat()
            if not stat.S_ISREG(info.st_mode) or info.st_size != size:
                raise UploadError("Public file size or type does not match supplied metadata.")
            actual = hashlib.sha256()
            with path.open("rb") as stream:
                for chunk in iter(lambda: stream.read(PART_BYTES), b""):
                    actual.update(chunk)
            if actual.hexdigest() != digest:
                raise UploadError("Public file SHA-256 does not match supplied metadata.")
            if not zipfile.is_zipfile(path):
                raise UploadError("Expected a public ZIP release archive.")
        except OSError:
            raise UploadError("Unable to read a public release file.") from None
        operation = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{APP_ORIGIN}/downloads/{name}#{size}:{digest}"))
        result.append({"name": name, "path": path, "sha256": digest, "bytes": size, "operationId": operation})
        seen.add(name)
    return token, result


class Client:
    def __init__(self, token, opener=None, pause=time.sleep):
        self._token = token
        self._opener = opener or urllib.request.build_opener(
            NoRedirect(), urllib.request.HTTPSHandler(context=ssl.create_default_context())
        )
        self._pause = pause

    def request(self, route, payload, content_type="application/json", headers=None):
        if not route.startswith(BASE_ROUTE) or route.startswith("//"):
            raise UploadError("Unexpected upload route.")
        url = APP_ORIGIN + route
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != "https" or parsed.netloc != urllib.parse.urlsplit(APP_ORIGIN).netloc or parsed.username or parsed.password:
            raise UploadError("Upload request did not target the expected HTTPS origin.")
        body = payload if isinstance(payload, bytes) else json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        request_headers = {
            "Authorization": "Bearer " + self._token,
            "Content-Type": content_type,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 VOIDLINE-Release-Uploader/1.0",
        }
        request_headers.update(headers or {})
        for attempt in range(MAX_ATTEMPTS):
            req = urllib.request.Request(url, data=body, method="POST", headers=request_headers)
            try:
                with self._opener.open(req, timeout=60) as response:
                    if response.geturl() != url or response.status not in (200, 201):
                        raise UploadError("Unexpected upload endpoint response.")
                    raw = response.read(1024 * 1024 + 1)
                if len(raw) > 1024 * 1024:
                    raise UploadError("Upload response exceeded the expected size.")
                try:
                    result = json.loads(raw)
                except (ValueError, UnicodeError):
                    raise UploadError("Upload response was not valid JSON.") from None
                if not isinstance(result, dict):
                    raise UploadError("Unexpected upload response format.")
                return result
            except urllib.error.HTTPError as error:
                # Never print the response body, headers, request or exception:
                # these may include server upload IDs or authentication values.
                status = error.code
                error.close()
                if status in (408, 429) or 500 <= status <= 599:
                    if attempt + 1 < MAX_ATTEMPTS:
                        self._pause(0.5 * (attempt + 1))
                        continue
                raise UploadError(f"Upload endpoint returned HTTP {status}.") from None
            except (urllib.error.URLError, http.client.HTTPException, TimeoutError, ConnectionError, OSError):
                if attempt + 1 < MAX_ATTEMPTS:
                    self._pause(0.5 * (attempt + 1))
                    continue
                raise UploadError("Upload connection failed after two retries; rerun identical input to resume.") from None

    def upload(self, file):
        name, size, digest, operation = (file[key] for key in ("name", "bytes", "sha256", "operationId"))
        start = self.request(BASE_ROUTE + "start", {"operationId": operation, "name": name, "sha256": digest, "bytes": size})
        if start.get("operationId") != operation or start.get("name") != name:
            raise UploadError("Upload start receipt did not match the requested operation.")
        if start.get("completed") is True:
            return self.ready_receipt(file, start)
        if start.get("partBytes") != PART_BYTES or not isinstance(start.get("uploadId"), str) or not start["uploadId"]:
            raise UploadError("Upload server did not return the expected multipart configuration.")
        parts = start.get("parts")
        if not isinstance(parts, list):
            raise UploadError("Invalid acknowledged part list.")
        acknowledged = {}
        for part in parts:
            if not isinstance(part, dict) or type(part.get("partNumber")) is not int or not 1 <= part["partNumber"] <= math.ceil(size / PART_BYTES) or part["partNumber"] in acknowledged:
                raise UploadError("Invalid acknowledged multipart metadata.")
            acknowledged[part["partNumber"]] = part
        sent = 0
        actual = hashlib.sha256()
        try:
            with file["path"].open("rb") as stream:
                for number in range(1, math.ceil(size / PART_BYTES) + 1):
                    chunk = stream.read(min(PART_BYTES, size - sent))
                    expected_size = min(PART_BYTES, size - sent)
                    if len(chunk) != expected_size:
                        raise UploadError("Public release file changed while uploading; completion stopped.")
                    actual.update(chunk)
                    part_hash = hashlib.sha256(chunk).hexdigest()
                    old = acknowledged.get(number, {})
                    if old.get("sha256") == part_hash and old.get("bytes") == len(chunk) and isinstance(old.get("etag"), str) and old["etag"]:
                        part = old
                    else:
                        route = BASE_ROUTE + "part?" + urllib.parse.urlencode({"operationId": operation, "partNumber": number})
                        part = self.request(route, chunk, "application/octet-stream", {"x-voidline-part-sha256": part_hash})
                    if part.get("partNumber") != number or part.get("bytes") != len(chunk) or not isinstance(part.get("etag"), str) or not part["etag"]:
                        raise UploadError("Multipart acknowledgement did not match uploaded bytes.")
                    sent += len(chunk)
                    emit({"name": name, "progressBytes": sent, "totalBytes": size})
                if stream.read(1) or sent != size or actual.hexdigest() != digest:
                    raise UploadError("Public release file changed while uploading; completion stopped.")
        except OSError:
            raise UploadError("Unable to read the public release file during upload.") from None
        return self.complete(file)

    def complete(self, file):
        receipt = self.request(BASE_ROUTE + "complete", {"operationId": file["operationId"]})
        return self.ready_receipt(file, receipt)

    def ready_receipt(self, file, receipt):
        expected_url = "/downloads/" + file["name"]
        if receipt.get("completed") is not True or receipt.get("name") != file["name"] or receipt.get("bytes") != file["bytes"] or receipt.get("sha256") != file["sha256"] or receipt.get("url") not in (expected_url, APP_ORIGIN + expected_url):
            raise UploadError("Completed receipt did not match the public release metadata.")
        public = {"name": file["name"], "bytes": file["bytes"], "sha256": file["sha256"], "url": APP_ORIGIN + expected_url, "ready": True}
        emit(public)
        return public


def main():
    if len(sys.argv) != 1:
        raise UploadError("Pass configuration through standard input only.")
    raw = sys.stdin.buffer.read(16385)
    if len(raw) > 16384:
        raise UploadError("Input exceeded the expected configuration size.")
    try:
        config = json.loads(raw)
    except (ValueError, UnicodeError):
        raise UploadError("Standard input must contain one JSON configuration.") from None
    token, files = checked_input(config)
    # All files have been prevalidated before any server mutation begins.
    client = Client(token)
    for file in files:
        client.upload(file)


if __name__ == "__main__":
    try:
        main()
    except UploadError as error:
        emit({"error": str(error)})
        sys.exit(1)
    except KeyboardInterrupt:
        emit({"error": "Upload interrupted; rerun identical input to resume."})
        sys.exit(130)
    except Exception:
        # No traceback or arbitrary exception string can expose the stdin secret.
        emit({"error": "Upload stopped unexpectedly; no private diagnostic data was printed."})
        sys.exit(1)
