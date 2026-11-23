CREATE TABLE `auth_email_codes` (
	`account_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`challenge_hash` text NOT NULL,
	`code_hash` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `auth_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `auth_email_codes_expiry` ON `auth_email_codes` (`expires_at`);