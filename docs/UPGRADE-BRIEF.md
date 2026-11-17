# VOIDLINE account and product upgrade

The immediate problem is that visitors cannot create accounts because Google
OAuth credentials are absent. Replace that dependency with a complete native
account flow and make the rest of the client feel like a practical messenger.

## Product direction

Use Discord's understandable server rail, channel hierarchy, role boundaries,
member details and distinctive profile cosmetics. Use Telegram's compact chat
list, clear unread indicators, readable conversations and direct message actions.
Preserve Voidline's original charcoal, muted violet and metal artwork. Create
original icons and objects; do not copy another product's badges or gifts.

Prefer short labels and useful information. Remove repeated slogans, giant
marketing cards, ornamental counters and technical warnings from routine flows.
Explain limitations when the user reaches the affected action. Keep account
security and encryption details available in settings.

## Accounts and sessions

- A visitor can choose Log in or Create account without configuring a provider.
- Registration collects a unique username, display name and password. Passwords
  are salted and hashed on the server; the browser receives an opaque session.
- New accounts have zero servers, friends, requests, messages, gifts and badges.
  Nothing is automatically claimed, awarded or joined.
- Login, logout, account switching, password confirmation, recovery and session
  revocation must use real database records and preserve existing account data.
- Recovery uses an explicitly saved account recovery code; no email delivery is
  implied. A login password does not decrypt message encryption keys.
- Strict origin, CSRF, rate limits, account checks and atomic writes remain part
  of the server boundary. Cosmetic choices never grant roles or membership.

## Friends and conversations

Make Add friend a functioning username request flow. Show actual incoming and
outgoing requests, accepting, declining, cancelling and removal. Support block
and unblock. Requests and gifts must respect the same block relationship.
Do not invent contacts or online status. Existing encryption requirements remain
in force; an unavailable encrypted chat cannot silently send private plaintext.

## Free badges and gifts

Offer an original catalogue with distinct small badge silhouettes and larger
inspection artwork. Keep LARP PRO MAX and Voidline's established object names.
A claim is an explicit free cosmetic action, not a fabricated achievement or
staff verification. The account inventory and equipped badge are server owned.

Make original collectible gifts free to send by exact username. Use actual gift
requests with accept/decline and account inventory records. Retrying a send must
not duplicate a gift. Include gift privacy and abuse limits. Avoid paid flows,
credits, invented stock counts, rarity claims and scarcity timers.

## Interface and accessibility

Desktop uses a compact server rail, contextual sidebar and central conversation.
Phone layouts show one primary view with Chats, Servers and Profile navigation.
Maintain readable metadata, clear active states, approximately 44px main touch
targets, visible keyboard focus and labels. Dialogs fit short screens and scroll
internally. Long usernames and content wrap or truncate without breaking layout.
Respect text sizing, high contrast, reduced motion, keyboard and IME behavior.

## Acceptance and delivery

Verify registration/login, duplicate usernames, password failures, recovery,
session revocation, explicit server joining, friend permissions, cosmetic
ownership, free claims, gift retries/acceptance/decline, blocking and privacy.
Use real migrated SQLite tests and controlled client tests. After publishing,
exercise native account flows against the deployed API using isolated temporary
accounts, and close those accounts afterward. Never test against real contacts.

Keep source, offline recovery download and deployment assets consistent. Preserve
the Site ID, audience, database history and genuine local data. Check live asset
bytes and compression rather than relying solely on a successful deployment.
Browser screenshots and visual interaction tests require supported browser tools;
state their availability accurately. Document completed features and remaining
service dependencies without claiming unfinished features are operational.
