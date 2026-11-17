CREATE TABLE `live_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `live_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'text' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `live_communities`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "live_channels_kind_check" CHECK("live_channels"."kind" IN ('text', 'announcement'))
);
--> statement-breakpoint
CREATE INDEX `live_channels_community` ON `live_channels` (`community_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `live_channels_community_name_unique` ON `live_channels` (`community_id`,`name`);--> statement-breakpoint
CREATE TABLE `live_communities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `live_invites` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`community_id` text NOT NULL,
	`created_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`max_uses` integer NOT NULL,
	`uses` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `live_communities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "live_invites_max_uses_check" CHECK("live_invites"."max_uses" BETWEEN 1 AND 100)
);
--> statement-breakpoint
CREATE TABLE `live_memberships` (
	`community_id` text NOT NULL,
	`account_id` text NOT NULL,
	`role` text NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`community_id`, `account_id`),
	FOREIGN KEY (`community_id`) REFERENCES `live_communities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "live_memberships_role_check" CHECK("live_memberships"."role" IN ('owner', 'moderator', 'member'))
);
--> statement-breakpoint
CREATE INDEX `live_memberships_account` ON `live_memberships` (`account_id`,`community_id`);--> statement-breakpoint
CREATE TABLE `live_messages` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`channel_id` text NOT NULL,
	`author_id` text NOT NULL,
	`client_id` text NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `live_channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `live_messages_id_unique` ON `live_messages` (`id`);--> statement-breakpoint
CREATE INDEX `live_messages_channel_seq` ON `live_messages` (`channel_id`,`seq`);--> statement-breakpoint
CREATE UNIQUE INDEX `live_messages_channel_author_client_unique` ON `live_messages` (`channel_id`,`author_id`,`client_id`);