# Collector edition · 1.0.11

Open Collection in the account rail. My gifts shows the copies the account currently owns. Discover compares families and editions and explains how each design is acquired. Earn shows the UTC week, participation and the possible outcomes of each earned capsule. Requests shows incoming and outgoing gifts and transfers.

A free Rain Check stays a free Rain Check. The six capsule cartridges have separate design IDs, articulated mechanisms and receipt artwork. A collector can find the original green model, its five free siblings and six capsule models together under Copium Cartridges. Pocket Terminal and Egoist’s Volume each add four models. The public gallery accepts family links, and its Open in Collection link opens the same design after sign-in. Look at the original resting poses and motion holds in the [model studies](collectible-proof/choice-v3-models.png) and [profile-size artwork](collectible-proof/profile-emblems.png).

The complete catalog contains 72 gifts, 49 name decorations and two earned badges. An earned badge keeps its requirement, issuer and award record. Wearing a cosmetic gives no administrative permission. The new small emblems and larger artwork share the same catalog identities.

## Earning, ownership and restoration

Check in or post in a Standard community on three distinct UTC days in one Monday-to-Sunday week. Both actions count at most once per day. The first completed collector-edition week also grants a transferable classic green cartridge. No encrypted message or room metadata is needed for a check-in.

The server commits a chosen family's draw before showing the opening. An interrupted reveal recovers its receipt, original odds and artwork. Duplicate drops are separate copies. Offering a copy reserves it until the recipient accepts, the sender cancels or the request otherwise closes. A previous owner can revisit their original opening receipt.

Migration 0012 adds edition policy, participation and milestone enforcement. Earlier family tables and issued capsules keep their original probabilities. Migration 0013 adds single-use signup-email challenges. Neither migration replaces the accounts, histories, award records or owned-copy tables. Leave the additive schema installed on a rollback. The independent issuance/opening pause settings and protected restore procedure are documented in [Capsules](CAPSULES.md) and [Backup and restore](BACKUP-RESTORE.md).

## Accounts, messaging and calling

New password accounts verify an email before choosing a public username and password. Older password accounts without verified email can continue using their existing username while enrolling. After verification, use email and password. Private email addresses stay off public profiles. A sender authorized to deliver email must be configured in the Site secret settings. [Account setup](ACCOUNT-SETUP.md)

Standard messaging continues to store service-readable content. Opt-in encrypted rooms use the Matrix SDK's Rust crypto engine. Password recovery and encrypted-history recovery are separate. The private-room policy module checks native eligibility and blocks at the homeserver. Voice and video use encrypted Matrix signaling and a TURN relay between verified endpoints. Device verification, recovery, membership and media behavior have isolated service tests. Production enrollment, encrypted-by-default DMs, cross-network calling and signed iPhone calling require the documented service configuration and deployment checks. [Encrypted setup and verification](ENCRYPTED-SETUP.md)

Basic profile information can appear while collectibles load. Inbox sections fail and retry independently. Background conversation activity preserves the sidebar reading position. Message search starts in the current conversation when one is open, with advanced filters available on demand.

## Design and protocol references

- Telegram collectible gift model and presentation attributes. [Telegram API](https://core.telegram.org/constructor/starGiftAttributeModel)
- Discord profile badge meanings and eligibility. [Discord Support](https://support.discord.com/hc/en-us/articles/360035962891-Profile-Badges-101)
- Device encryption, verification and key backup. [Matrix JS SDK](https://matrix-org.github.io/matrix-js-sdk/)
- Homeserver policy callbacks. [Synapse module API](https://element-hq.github.io/synapse/latest/modules/)
- Signaling and relay connectivity. [WebRTC peer connections](https://webrtc.org/getting-started/peer-connections)
- Verified sender domains. [Resend documentation](https://resend.com/docs/dashboard/domains/introduction)
