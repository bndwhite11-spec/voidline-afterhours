# Profile images and Standard media

VOIDLINE uses the private `MEDIA` R2 binding. There is no public bucket URL or remote-image proxy. The application serves files through authenticated `/api/media/:id` requests with `private, no-store`, `nosniff`, same-origin resource policy and a restrictive document CSP. PDFs and text download as attachments. Image and audio responses support authorized single byte ranges.

This is **Standard storage**, readable by the service. It never uploads to a Matrix room or substitutes for the separate Rust-encrypted Matrix attachment path. Native upload scopes accept only native conversation/channel UUIDs. Captions travel as ordinary Standard message text.

## Upload and commit

`POST /api/media/uploads` accepts JSON containing `expectedAccountId`, a stable UUID `clientId`, `kind`, `filename`, `contentType` and base64 bytes. Attachments/voice also require exactly one `conversationId` or `channelId`. Cookies, CSRF, origin, active account/session, rate limits and write permissions are checked. Maximum file size is 8 MiB; up to four attachments may be committed per message. The fixed account allowance is 200 non-deleting objects and 512 MiB.

The server derives an opaque asset ID from the account and upload ID. A reserved metadata row records the content digest, filename, type and scope **before** R2 receives bytes. Retries must match all those fields. A failed put leaves a retryable reservation. Session or membership changes during a put prevent successful staging and queue compensation. A crash leaves a discoverable reservation rather than an untracked R2 object.

Unclaimed files expire after 24 hours. A profile save atomically assigns an owned, eligible avatar/banner and makes it ready. A native message transaction claims staged assets belonging to that author and exact destination; retrying a stable message ID preserves the original message/asset relationship. An acknowledged upload is not a sent message. The client adds a reviewed file to the durable Standard outbox before presenting it as queued; the messenger reports server acceptance separately.

## Image behavior and privacy

Open your profile and choose **Edit profile**. Under **Avatar** or **Banner**, choose **Upload image or GIF**. Supported still-image imports offer a local crop with drag, arrow keys, zoom, position sliders and reset; choose **Use this crop** to stage it. Avatar output is 512×512 PNG; banner output is 1536×512 PNG. Only this still-image crop is re-encoded locally with original image metadata removed.

For a GIF, the confirmation panel shows dimensions, frame count and loop duration. Choose **Use this GIF** to preserve its original bytes and animation. GIFs use centered cover framing in the avatar/banner: the file itself is not cropped or flattened. A private still preview appears after upload. Embedded metadata in the original GIF is retained; do not rely on this upload to remove it.

Each image groups its upload, remove and preset controls. Selecting a preset explicitly replaces that custom image in the draft; the opposite image and its pending upload are preserved. Text, accent and privacy edits update the preview without replacing its image nodes. Earned slots appear only when legitimate awards exist, and newly earned options update after saving. The owner always sees their own preview; audience settings govern other viewers.

The image controls precede the large profile preview. Selecting a file shows local preparation state and brings the crop/GIF confirmation controls into view; profile actions stay accessible while editing. Validation, decoding and upload errors appear in the image workflow, and a failed selection cannot be presented as a saved image. Still-image decoding uses the validated MIME type, including when a mobile picker omits or misreports it.

The profile editor also accepts complete JPEG primary images with appended camera data, including the layout used by Android Motion Photos and multi-image JPEG containers. A profile-only structural preflight locates the actual primary image ending across marker segments and entropy scans, rather than assuming it occupies the final two file bytes. It ignores marker-like bytes inside length-delimited metadata and decodes only the complete primary still. The normal crop uploads a PNG; extra video, sound, secondary image data and original metadata are not uploaded. Truncated primary JPEGs remain errors. This does not add HEIC/AVIF support or promise HDR preservation. Direct server JPEG uploads retain their strict original validation.

The format reference is [Android Motion Photo format1.0](https://developer.android.com/media/platform/motion-photo-format); this documents valid appended data and does not identify the format of a particular user photo.

The profile-only importer additionally recognizes still AVIF, BMP, ICO, HEIC/HEIF, supported uncompressed TIFF, APNG/animated WebP and a self-contained SVG vector subset. The source format is detected from bytes rather than trusting the file name or picker MIME. HEIC and TIFF conversion runs in a same-origin dedicated worker with local maintained decoders; it is canceled when the selection/account changes. AVIF and ordinary raster formats use supported native browser decoding. All decoded outputs are checked against pixel/dimension limits before entering the crop. Animated PNG/WebP imports become still images; GIF originals retain their existing separate animation path.

SVG imports pass a bounded, maintained DOMPurify sanitizer and vector allowlist. Scripts, events, external/embedded resources, filters, animation and foreign content are rejected. Only sanitized vector bytes reach the browser image decoder, and the source SVG is never uploaded or inserted into the visible document. Unsupported SVG features, TIFF compression/tiled variants, or missing browser codecs receive an actionable error. This is broad common-format support rather than a claim that every proprietary, RAW or damaged image can be decoded.

Raw server upload rules remain unchanged: these extra profile source formats are converted to the existing cropped PNG before upload. HEIC motion/video, TIFF extra pages, camera metadata and SVG source are excluded from that uploaded crop. See PROFILE-IMAGE-DEPENDENCIES.txt for decoder licenses and corresponding-source references.

Choose **Save profile** after uploading. Uploading alone does not publish an image. **Cancel GIF** or **Cancel crop** closes that selection; **Discard changes** keeps the saved profile. Failed uploads show an error and permit retry of the same selection. Once a still-image upload has been attempted, its prepared bytes and crop stay fixed for an exact retry; cancel and select the image again to adjust the crop. This also handles an upload that reached the server before the acknowledgement was lost. A failed profile save retains the draft. Resetting, changing accounts or closing the editor cannot commit a stale upload to another profile.

Profile GIFs start on a static first-frame preview. **Play GIFs** animates only the profile being viewed, and **Pause GIFs** restores its previews. Inline message and conversation-list avatars remain static. Playback stops when the profile is closed or hidden, and reduced-motion settings take priority. **Allow GIF playback on my profile** controls whether a profile offers playback; uploading a new GIF checks it, and the owner can turn it off before saving. This control is shown when a GIF is selected; its stored preference is preserved when hidden. GIFs never autoplay merely because they were uploaded.

All uploads are limited to 8 MiB. GIFs are accepted for profile avatars and banners, with these additional limits: 1024 pixels per side, one megapixel per frame canvas, 200 frames, 32 megapixels across all frame canvases and a 30-second loop. These limits apply together, so a larger GIF may require fewer frames. Unsupported, damaged or overly complex GIFs are rejected with an error rather than silently converted to a still image. Profile format tools load on demand after image selection. The shared browser validator checks structure and resource bounds; the server decodes every GIF frame before storage and generates the first-frame PNG preview.

For PNG, JPEG and WebP, client/server check bounded byte size, signatures, dimensions and supported container structure. Animated PNG/WebP and SVG remain unsupported. Maximum still-image source dimensions are 16 megapixels and 16,384 pixels on either axis. Direct profile API still images have an additional 4-megapixel bound, square avatar/3:1 banner constraint and 1024/3072-pixel width bounds. Workers do not fully decode and re-encode those direct still-image submissions. No claim of malware scanning is made.

A custom avatar follows the existing basic profile gate: the owner, accepted friends, members of a shared community, or a profile with public details. Native group membership alone does not create profile access. A banner additionally requires visibility of richer profile details. Blocks override public access. GIF previews and originals use the same authorization checks: `/api/media/:id` serves the still PNG preview, and `/api/media/:id/animation` serves the original GIF. The media endpoint rechecks active account, current image reference and privacy after the storage read. Old URLs cease working when an image is replaced/reset. Failed loads retain the preset fallback.

Message files require current conversation/community membership and a non-deleted linked message. New group members follow the existing retained-history policy. Personal blocks do not erase history already shared with group participants. Files are not public merely because someone learns an asset ID.

## Voice notes

The Standard recorder requests microphone access only after a deliberate Record action. It offers stop/review, discard, native audio playback/seeking, upload acknowledgment and retry. Recordings stop after two minutes or exceeding 8 MiB. Closing/replacing the dialog or locking the account stops tracks and releases local Blob URLs. Supported encodings are browser-produced WebM, Ogg or MP4 audio; unavailable codecs/permission failures produce an explicit error. Audio remains service-readable in Standard conversations. Calls and live voice rooms are separate features.

## Cleanup and retention

Profile replacement, message redaction, metadata deletion and account deletion create durable `media_cleanup` entries. Account deletion removes profile and unclaimed media while retaining attached Standard files for legitimate recipient history. Suspension hides profiles/access without deleting restorable media. Message deletion revokes file access immediately; storage removal follows the cleanup queue.

`cleanupMedia(env, limit)` expires unclaimed reservations, deletes bounded batches and backs off failed R2 deletions. The operations writer and authenticated request maintenance invoke it; database deletion is not assumed to delete an R2 object automatically. Queue keys survive soft account deletion. A genuinely lost database requires the protected database/backup restore process to reconcile object metadata. R2 objects and D1 data are distinct backup scopes.

## Verification boundary

`backend/media-test.mjs` uses the actual migration chain and production handlers with controlled R2 failures, revocation races, privacy, idempotency, native claims, ranges and cleanup. `backend/media-runtime-test.mjs` uses actual local workerd/D1/R2 bindings and real bytes, claims, range responses and cleanup. Client suites exercise crop geometry, keyboard/drag state, original GIF byte preservation, explicit playback controls, reduced-motion/lifecycle cleanup, stale-account handling, upload retries and recorder cleanup with controlled Canvas/decoder/DOM/recording implementations.

Those checks do not establish native file-picker behavior, actual browser image decoding, microphone recording quality, phone keyboard/layout behavior, hosted R2 integration, or an independent security review. Report hosted and browser/device results separately.
