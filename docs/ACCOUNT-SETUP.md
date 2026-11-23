# Voidline account setup

To create a password account, enter a private email and open the single-use link within ten minutes. Choose a unique public username and a 12–128-character password. Save the offline recovery code in a password manager. New accounts start empty. Sign in with the verified email and password.

For an older account without a verified email, select **Use a username for an older account** and sign in with your existing password. Open **Devices & security**, enter a private address you control and request a verification code. Open the email from VOIDLINE and enter its eight digits in the app while signed in to the same account. You can keep signing in by username until verification succeeds. The account keeps its ID, profile, chats and gifts. Other sessions are revoked after verification. Your current device stays signed in.

To enable new password signups, configure `VOIDLINE_ORIGIN`, a server-side `RESEND_API_KEY` and an `EMAIL_FROM` sender with a verified domain in Resend. Publish the updated runtime configuration, then complete signup and recovery with a mailbox you control. Existing accounts can still sign in during a delivery outage. [Verify a sending domain](https://resend.com/docs/dashboard/domains/introduction)

Google sign-in is an optional genuine OpenID Connect integration; it is shown
only when the server is configured. Existing provider accounts keep their IDs.

Passwords use Argon2id, sessions use server-validated secure cookies, and owner
administration additionally requires a user-verifying passkey. Public usernames
and display names never confer administrative authority.

See [AUTHENTICATION.md](AUTHENTICATION.md) for architecture, exact configuration,
legacy password migration, recovery behavior, passkey/device management and test
limits. See [OWNER-BOOTSTRAP.md](OWNER-BOOTSTRAP.md) for verified owner binding.
Account recovery and encrypted-message key recovery are separate operations.

If you use a saved account recovery code, enter your username or verified email
and the latest full 64-character code. Spaces, hyphens and letter case are
handled by the recovery form. A successful recovery, password change or email
password reset replaces that code; save the replacement shown on screen.
The 8-digit code emailed when adding an address belongs in the email verification
dialog. It does not reset your password or replace your saved recovery code.
