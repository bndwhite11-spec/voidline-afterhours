# Free badges and gifts

VOIDLINE's account collection has nine original badge designs and six original
collectible gifts. All are free. There is no checkout, currency, paid upgrade,
stock counter, randomly assigned rarity or claimed global scarcity. The free
catalogue grants cosmetics; it does not grant staff roles, permissions,
verified identity or an achievement that the account has not completed.

A new account owns no items and has no equipped badge. The person explicitly
chooses Add to collection. Claims are idempotent and ownership is recorded by
the server. A badge can be equipped only after that account owns it. Gifts can
be collected for oneself or sent as an optional request to an exact username.
A sent request is not a claim that another person has viewed it.

Gift recipients may collect or decline a request, or disable new requests.
Either-direction account blocks prevent sending and collecting gifts, including
an open request racing with a block. A decline does not grant ownership. A
stable client ID prevents a failed response/retry from sending twice. The
server limits new sends to ten per hour and three to the same person per day.
Other cosmetic mutations are limited to sixty per minute per account.

The original badge designs are LARP PRO MAX, 404 Angel, Ghost Frequency,
Velvet Static, Night Shift, Unknown Entity, Dead Internet, Voidwalker and Low
Orbit. Distinct small vector silhouettes are used with brushed-metal details
in the larger inspection views. The six gifts are Chrome Rose, Midnight Tape,
Pocket Star, Afterhours Cup, Paper Ghost and Small Surprise. These are digital
profile cosmetics, not physical gifts or financial assets.

## Data and authorization

`worker/cosmetics.mjs` owns the catalogue and all grants. The generated schema
stores cosmetic_ownership, cosmetic_profiles and cosmetic_gifts. Existing
account IDs and old local archives are preserved; local awards are not silently
uploaded or granted to an account. Sign-in and request verification use the
same secure account sessions, Origin checks, CSRF token and expected-account
checks as the rest of the app.

The service can see cosmetic catalogue IDs, sender/recipient account IDs,
request states and timestamps. No private custom message is accepted in a gift
request, and this feature does not claim message-content end-to-end encryption.
A recipient sees the sender's chosen public username, never a sign-in email.
Equipped marks on another account are available only to the account itself,
an accepted friend or someone with a shared server, and account blocks take
precedence. That endpoint does not expose the private inventory or gift list.

The browser module is `dist/cosmetics.js`; its scoped styles are in
`dist/cosmetics.css`. It registers with the production account shell, clears
state on account lock, ignores stale responses and preserves a conversation's
active composer during collection updates. Every success state follows an
acknowledged server response. Request errors retain the intended gift ID.

## Verification

Run:

- `node backend/cosmetics-test.mjs` — ten migrated-SQLite/session checks covering
  empty ownership, free catalogues, ownership authorization, idempotent gifts,
  recipient acceptance/decline, privacy, blocks, limits, failed transactions,
  CSRF and profile permissions.
- `node tests/voidline-cosmetics-test.cjs` — eight client lifecycle checks for
  explicit claims, failure recovery, stale account/dialog responses, inventory
  ordering, preserved conversation composer, gift retries and original SVG
  silhouette generation.

These use isolated identities and controlled client transport. They do not
claim a browser screenshot, SVG rasterization review or gifts sent to real
contacts. The root delivery checks validate the deployed source and API paths.
