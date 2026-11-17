CREATE TABLE `auth_credentials` (
	`account_id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`algorithm` text NOT NULL,
	`iterations` integer NOT NULL,
	`recovery_hash` text NOT NULL,
	`change_marker` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cosmetic_gifts` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`catalog_id` text NOT NULL,
	`client_id` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`opened_at` integer,
	FOREIGN KEY (`sender_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cosmetic_gifts_recipient` ON `cosmetic_gifts` (`recipient_id`,`state`,`created_at`);--> statement-breakpoint
CREATE INDEX `cosmetic_gifts_sender` ON `cosmetic_gifts` (`sender_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `cosmetic_gifts_client_unique` ON `cosmetic_gifts` (`sender_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `cosmetic_ownership` (
	`account_id` text NOT NULL,
	`cosmetic_id` text NOT NULL,
	`claimed_at` integer NOT NULL,
	PRIMARY KEY(`account_id`, `cosmetic_id`),
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cosmetic_profiles` (
	`account_id` text PRIMARY KEY NOT NULL,
	`equipped_id` text,
	`gifts_enabled` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `social_blocks` (
	`blocker_id` text NOT NULL,
	`blocked_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`blocker_id`, `blocked_id`),
	FOREIGN KEY (`blocker_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`blocked_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `social_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "social_requests_state" CHECK("social_requests"."state" IN ('pending','accepted','declined','cancelled'))
);
--> statement-breakpoint
CREATE INDEX `social_requests_recipient` ON `social_requests` (`recipient_id`,`state`,`created_at`);--> statement-breakpoint
CREATE INDEX `social_requests_sender` ON `social_requests` (`sender_id`,`state`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `social_requests_pair_unique` ON `social_requests` (`sender_id`,`recipient_id`);--> statement-breakpoint
CREATE TABLE `social_settings` (
	`account_id` text PRIMARY KEY NOT NULL,
	`allow_requests` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
