CREATE TABLE `auth_registration_challenges` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_registration_expiry` ON `auth_registration_challenges` (`expires_at`);--> statement-breakpoint
CREATE INDEX `auth_registration_email` ON `auth_registration_challenges` (`email`);