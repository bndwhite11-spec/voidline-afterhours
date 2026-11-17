CREATE TABLE `live_bookmarks` (
	`message_id` text NOT NULL,
	`account_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`message_id`, `account_id`),
	FOREIGN KEY (`message_id`) REFERENCES `live_messages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `live_bookmarks_account` ON `live_bookmarks` (`account_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `live_changes` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `live_channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`message_id`) REFERENCES `live_messages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `live_changes_channel_seq` ON `live_changes` (`channel_id`,`seq`);--> statement-breakpoint
CREATE TABLE `live_favorites` (
	`channel_id` text NOT NULL,
	`account_id` text NOT NULL,
	PRIMARY KEY(`channel_id`, `account_id`),
	FOREIGN KEY (`channel_id`) REFERENCES `live_channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `live_reactions` (
	`message_id` text NOT NULL,
	`account_id` text NOT NULL,
	`emoji` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`message_id`, `account_id`, `emoji`),
	FOREIGN KEY (`message_id`) REFERENCES `live_messages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `live_read_states` (
	`channel_id` text NOT NULL,
	`account_id` text NOT NULL,
	`seq` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`channel_id`, `account_id`),
	FOREIGN KEY (`channel_id`) REFERENCES `live_channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `live_accounts` ADD `bio` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `live_accounts` ADD `status` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `live_accounts` ADD `theme` text DEFAULT 'obsidian' NOT NULL;--> statement-breakpoint
ALTER TABLE `live_accounts` ADD `avatar` text DEFAULT 'moon' NOT NULL;--> statement-breakpoint
ALTER TABLE `live_communities` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `live_communities` ADD `icon` text DEFAULT 'WL' NOT NULL;--> statement-breakpoint
ALTER TABLE `live_invites` ADD `revoked_at` integer;--> statement-breakpoint
ALTER TABLE `live_messages` ADD `reply_to_id` text;--> statement-breakpoint
ALTER TABLE `live_messages` ADD `thread_root_id` text;--> statement-breakpoint
ALTER TABLE `live_messages` ADD `edited_at` integer;--> statement-breakpoint
ALTER TABLE `live_messages` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `live_messages` ADD `pinned` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `live_messages` ADD `original_hash` text DEFAULT '' NOT NULL;