CREATE TABLE `auth_login_codes` (
	`challenge_hash` text PRIMARY KEY NOT NULL,
	`browser_hash` text NOT NULL,
	`code_hash` text NOT NULL,
	`account_id` text NOT NULL,
	`email` text NOT NULL,
	`credential_marker` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `auth_login_codes_expiry` ON `auth_login_codes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `auth_login_codes_account` ON `auth_login_codes` (`account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_login_codes_browser` ON `auth_login_codes` (`browser_hash`);
--> statement-breakpoint
CREATE TRIGGER login_code_account_status AFTER UPDATE OF account_status ON live_accounts
WHEN OLD.account_status IS NOT NEW.account_status
BEGIN DELETE FROM auth_login_codes WHERE account_id=OLD.id; END;
--> statement-breakpoint
CREATE TRIGGER login_code_email_changed AFTER UPDATE OF email,verified_at ON account_emails
WHEN OLD.email IS NOT NEW.email OR OLD.verified_at IS NOT NEW.verified_at
BEGIN DELETE FROM auth_login_codes WHERE account_id=OLD.account_id; END;
--> statement-breakpoint
CREATE TRIGGER login_code_email_removed AFTER DELETE ON account_emails
BEGIN DELETE FROM auth_login_codes WHERE account_id=OLD.account_id; END;
