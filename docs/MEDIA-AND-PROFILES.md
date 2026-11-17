# Profile images and Standard media

VOIDLINE uses the private `MEDIA` R2 binding. There is no public bucket URL or remote-image proxy. The application serves files through authenticated `/api/media/:id` requests with `private, no-store`, `nosniff`, same-origin resource policy and a restrictive document CSP. PDFs and text download as attachments. Image and audio responses support authorized single byte ranges.

This is **Standard storage**, readable by the service. It never uploads to a Matrix room or substitutes for the separate Rust-encrypted Matrix attachment path. Native upload scopes accept only native conversation/channel UUIDs. Captions travel as ordinary Standard message text.

## Upload and commit

`POST /api/media/uploads` accepts JSON containing `expectedAccountId`, a stable UUID `clientId`, `kind`, `filename`, `contentType` and base64 bytes. Attachments/voice also require exactly one `conversationId` or `channelId`. Cookies, CSRF, origin, active account/session, rate limits and write permissions are checked. Maximum file size is 8 MiB; up to four attachments may be committed per message. The fixed account allowance is 200 non-deleting objects and 512 MiB.

The server derives an opaque asset ID from the account and upload ID. A reserved metadata row records the content digest, filename, type and scope **before** R2 receives bytes. Retries must match all those fields. A failed put leaves a retryable reservation. Session or membership changes during a put prevent successful staging and queue compensation. A crash leaves a discoverable reservation rather than an untracked R2 object.

Unclaimed files expire after 24 hours. A profile save atomically assigns an owned, eligible avatar/banner and makes it ready. A native message transaction claims staged assets belonging to that author and exact destination; retrying a stable message ID preserves the original message/asset relationship. An acknowledged upload is not a sent message. The client adds a reviewed file to the durable Standard outbox before presenting it as queued; the messenger reports server acceptance separately.

## Image behavior and privacy

Profile editing preserves the existing preset avatars/banners. Uploads offer a local Canvas crop with drag, arrow-key movement, zoom, position sliders, reset and explicit confirmation. Avatar output is 512×512 PNG; banner output is 1536×512 PNG. The normal editor re-encodes the crop locally and removes original image metadata. Save is separate from upload. Reset, cancellation, newer edits during a save, and a failed save preserve intentional draft behavior.

Allowed still image formats are PNG, JPEG and WebP. Client/server check bounded byte size, signatures, dimensions and supported container structure; animated PNG/WebP, SVG and GIF are rejected. Maximum source dimensions are 16 megapixels and 16,384 pixels on either axis. Profile API images have an additional 4-megapixel bound, square avatar/3:1 banner constraint and 1024/3072-pixel width bounds. Workers do not fully decode and re-encode direct API image submissions; browser decoder behavior is a separate acceptance test. No claim of malware scanning is made.

A custom avatar follows the existing basic profile gate: the owner, accepted friends, members of a shared community, or a profile with public details. Native group membership alone does not create profile access. A banner additionally requires visibility of richer profile details. Blocks override public access. The media endpoint rechecks active account, current image reference and privacy after the storage read. Old URLs cease working when an image is replaced/reset. Failed loads retain the preset fallback.

Message files require current conversation/community membership and a non-deleted linked message. New group members follow the existing retained-history policy. Personal blocks do not erase history already shared with group participants. Files are not public merely because someone learns an asset ID.

## Voice notes

The Standard recorder requests microphone access only after a deliberate Record action. It offers stop/review, discard, native audio playback/seeking, upload acknowledgment and retry. Recordings stop after two minutes or exceeding 8 MiB. Closing/replacing the dialog or locking the account stops tracks and releases local Blob URLs. Supported encodings are browser-produced WebM, Ogg or MP4 audio; unavailable codecs/permission failures produce an explicit error. Audio remains service-readable in Standard conversations. Calls and live voice rooms are separate features.

## Cleanup and retention

Profile replacement, message redaction, metadata deletion and account deletion create durable `media_cleanup` entries. Account deletion removes profile and unclaimed media while retaining attached Standard files for legitimate recipient history. Suspension hides profiles/access without deleting restorable media. Message deletion revokes file access immediately; storage removal follows the cleanup queue.

`cleanupMedia(env, limit)` expires unclaimed reservations, deletes bounded batches and backs off failed R2 deletions. The operations writer and authenticated request maintenance invoke it; database deletion is not assumed to delete an R2 object automatically. Queue keys survive soft account deletion. A genuinely lost database requires the protected database/backup restore process to reconcile object metadata. R2 objects and D1 data are distinct backup scopes.

## Verification boundary

`backend/media-test.mjs` uses the actual migration chain and production handlers with controlled R2 failures, revocation races, privacy, idempotency, native claims, ranges and cleanup. `backend/media-runtime-test.mjs` uses actual local workerd/D1/R2 bindings and real bytes, claims, range responses and cleanup. Client suites exercise crop geometry, keyboard/drag state, stale-account handling, upload retries and recorder cleanup with controlled Canvas/decoder/DOM/recording implementations.

Those checks do not establish native file-picker behavior, actual browser image decoding, microphone recording quality, phone keyboard/layout behavior, hosted R2 integration, or an independent security review. Report hosted and browser/device results separately.
