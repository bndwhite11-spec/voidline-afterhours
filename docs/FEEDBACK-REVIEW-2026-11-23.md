# Messaging app feedback review — 23 November 2026

Reviewed against `main` at `d96e018` (collector release 1.0.11). The earlier password feedback is already merged. This branch extends the latest colleague implementation and preserves its account, gift, artwork, encryption and calling architecture.

## Section results

| Feedback | Reviewed implementation and changes |
| --- | --- |
| General UI | Improved the empty messenger's friend/community/collection entry points, text size and grouped conversation controls. Account navigation now renders before an optional collection download, so a slow download cannot trap the user on the opening screen. |
| Gift variety and acquisition | Preserved all 72 gifts, seven collectible families, free editions, earned capsules, check-ins, weekly milestones and exact-copy transfers. Added illustrated family choices, authoritative owned/discovered progress, and read-only edition/material comparison with inspect-and-return. Fixed the Copium family filter omitting its six free designs. Capsule choices still use each capsule's saved families and odds. |
| Gift animation | Retained the latest model-specific mechanisms, deliberate previews, reduced motion and frozen receipt artwork. Family browsing and comparison do not draw, award or transfer a gift. |
| Badges | Reviewed and retained the latest 49 decoration designs and two separately earned awards, including distinct small emblems, source attribution and entitlement boundaries. A cosmetic never grants an earned badge or administrative authority. |
| Voice and video | Retained encrypted Matrix signaling and relay-only WebRTC. Fixed a delayed offer acknowledgement installing a no-answer timer after connection; stale playback promises changing the next call's controls; and a revoked/replaced selected device staying eligible while another trusted device remained. Current selected-device identity is checked again after media capture and during access checks. |
| Encryption | Added an accessible status view separating HTTPS, selected-room encryption, SDK connection, verified device identity, backup and recovery. Added an explicit authenticated, CSRF-protected, bounded public-capability check. It cannot enroll a device, issue a JWT, verify keys or declare encrypted-by-default readiness. Standard history remains service-readable. |
| Email login and signup | Preserved upstream verified-email-first registration and legacy-account migration. Signup links are now checked before collecting a profile or password, show the private address, and have invalid/expired/retry states. Existing sessions require deliberate sign-out to use a signup link. Pending sign-out cannot be duplicated or misleadingly cancelled. Skip-to-content preserves credential fragments, and late inspections cannot replace later navigation. |

The supplied screenshot includes a voice-message thumbnail without playable audio or a transcript. This review covers its visible written feedback.

## Compatibility and local development

No account IDs, messages, ownership records, frozen editions, signed native packages or historical migrations changed. No duplicate authentication or calling stack was introduced.

The local preview previously failed because Wrangler split historical trigger bodies at their internal semicolons. A local-only runner now applies the original Drizzle statement boundaries and the compatible migration ledger in one D1 transaction per migration. It refuses untracked or unknown history, supports an isolated `--persist-to` folder, and never resets an existing database. See `DEVELOPMENT.txt`.

## Verification

- All 54 client suites passed, including 155 production-entry checks, 10 signup DOM checks, nine password feedback checks, six new family browsing checks and nine encryption status checks.
- All 56 server suites were verified. The first broad run needed the repository's pinned Python backup dependency; the affected hosted-backup suite then passed 8/8 in that environment. Other suites passed in the broad run. This includes six signup-inspection checks, eight service-discovery checks, 11 calling checks, four playback checks, 29 Matrix adapter boundary checks and five actual local D1 migration checks.
- The separate encrypted SQLite backup/restore checks passed 2/2, including tamper, wrong-key and overwrite rejection.
- Production build and compiled Worker asset/API checks passed. The Worker includes 14 unchanged migrations. JavaScript syntax, CSS parsing and `git diff --check` passed.
- Browser review used a disposable local account and isolated D1 state. Checked real login, empty messenger, collection discovery, free/capsule comparison, profile/status navigation and the unavailable-service result. Collection layout fit both the default desktop viewport and 390 × 844 with no document or main-pane horizontal overflow.

Screenshots: [desktop discovery](feedback-proof/discover-desktop.jpg), [phone discovery](feedback-proof/discover-mobile.jpg). These are browser screenshots of local source, not production or physical-device acceptance.

## Production gates

The public production auth configuration returned HTTP 200 on 23 November with email delivery, Google and Matrix unconfigured; verified-email registration and legacy username access were advertised. Real email delivery, an operated Synapse service/policy, TURN credentials and cross-device recovery/calling acceptance remain required. No service credentials were invented or entered, and no new native binaries were signed.

The existing Site was readable at version 39, but its source-write credential endpoint returned HTTP 404. This session cannot publish that Site or change its runtime secrets. The GitHub branch/pull request is the reviewable delivery; a Git push does not imply a live deployment.
