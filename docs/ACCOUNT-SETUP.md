# Voidline account setup

To create a password account, enter a private email and open the single-use link within ten minutes. Choose a unique public username and a 12–128-character password. Save the offline recovery code in a password manager. New accounts start empty. For each new email-and-password sign-in, enter your password, then enter the eight-digit login code in the browser where you started. The code expires after ten minutes. Resending replaces the previous code. Your existing session stays open when you return to the app.

For an older account without a verified email, select **Use a username for an older account** and sign in with your existing password. Open **Devices & security**, enter a private address you control and request a verification code. Open the email from VOIDLINE and enter its eight digits in the app while signed in to the same account. You can keep signing in by username until verification succeeds. The account keeps its ID, profile, chats and gifts. Other sessions are revoked after verification. Your current device stays signed in.

## Email delivery with a mailbox you own

1. Create a Brevo account. Under **Senders**, add the display name **VOIDLINE** and an address where you can read mail. Enter the verification code Brevo sends to that address in Brevo. A personal mailbox is supported. Brevo may rewrite the displayed From address when you use a free mailbox domain. [Brevo Senders](https://app.brevo.com/senders)
2. Create an API key in Brevo. Store it as the secret `BREVO_API_KEY` in the VOIDLINE Site settings. Keep the key and mailbox verification codes private. [Brevo API keys](https://app.brevo.com/settings/keys/api)
3. Configure `EMAIL_PROVIDER=brevo` and preserve the Site’s exact HTTPS `VOIDLINE_ORIGIN`, then redeploy. When the Brevo account has one active sender, VOIDLINE uses it automatically. For multiple senders, set `EMAIL_FROM` to the verified address you want. Brevo must enable transactional sending on the account.
4. Test with an inbox you control. Confirm that the email arrives and the submitted code or link is accepted by VOIDLINE. A configured API key or a provider delivery receipt alone cannot confirm inbox delivery.

Resend is also supported for operators who own a domain. Choose `EMAIL_PROVIDER=resend`, set the server secrets `RESEND_API_KEY` and `EMAIL_FROM`, and verify the sending domain in Resend. [Resend sender setup](https://resend.com/docs/dashboard/domains/introduction)

Google sign-in is an optional genuine OpenID Connect integration; it is shown
only when the server is configured. Existing provider accounts keep their IDs.

Passwords use Argon2id, sessions use server-validated secure cookies, and owner
administration additionally requires a user-verifying passkey. Public usernames
and display names never confer administrative authority.

See [AUTHENTICATION.md](AUTHENTICATION.md) for architecture, exact configuration,
legacy password migration, recovery behavior, passkey/device management and test
limits. See [OWNER-BOOTSTRAP.md](OWNER-BOOTSTRAP.md) for verified owner binding.
Account recovery and encrypted-message key recovery are separate operations.
