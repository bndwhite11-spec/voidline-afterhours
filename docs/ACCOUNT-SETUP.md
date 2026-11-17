# Voidline account setup

Create a native account with a unique username and a 12–128-character password.
Save the one-time offline recovery code in a password manager. A new account
starts empty. Add a verified recovery email when the mail provider is configured.
Google sign-in is an optional genuine OpenID Connect integration; it is shown
only when the server is configured. Existing provider accounts keep their IDs.

Passwords use Argon2id, sessions use server-validated secure cookies, and owner
administration additionally requires a user-verifying passkey. Public usernames
and display names never confer administrative authority.

See [AUTHENTICATION.md](AUTHENTICATION.md) for architecture, exact configuration,
legacy password migration, recovery behavior, passkey/device management and test
limits. See [OWNER-BOOTSTRAP.md](OWNER-BOOTSTRAP.md) for verified owner binding.
Account recovery and encrypted-message key recovery are separate operations.
