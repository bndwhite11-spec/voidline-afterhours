CREATE TABLE `native_changes` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` text NOT NULL,
	`message_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `native_conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`message_id`) REFERENCES `native_messages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `native_changes_conversation_seq` ON `native_changes` (`conversation_id`,`seq`);--> statement-breakpoint
CREATE TABLE `native_conversation_preferences` (
	`account_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`favorite` integer DEFAULT 0 NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`muted` integer DEFAULT 0 NOT NULL,
	`folder_id` text,
	`read_seq` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`account_id`, `conversation_id`),
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conversation_id`) REFERENCES `native_conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`folder_id`) REFERENCES `organization_folders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `native_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`security_mode` text DEFAULT 'standard' NOT NULL,
	`created_by` text NOT NULL,
	`client_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`pair_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "native_conversations_kind" CHECK("native_conversations"."kind" IN ('dm','group')),
	CONSTRAINT "native_conversations_security" CHECK("native_conversations"."security_mode"='standard')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `native_conversations_pair_unique` ON `native_conversations` (`pair_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `native_conversations_creator_client_unique` ON `native_conversations` (`created_by`,`client_id`);--> statement-breakpoint
CREATE TABLE `native_members` (
	`conversation_id` text NOT NULL,
	`account_id` text NOT NULL,
	`joined_at` integer NOT NULL,
	`read_seq` integer DEFAULT 0 NOT NULL,
	`read_change_seq` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`conversation_id`, `account_id`),
	FOREIGN KEY (`conversation_id`) REFERENCES `native_conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `native_members_account` ON `native_members` (`account_id`,`conversation_id`);--> statement-breakpoint
CREATE TABLE `native_messages` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`author_id` text NOT NULL,
	`client_id` text NOT NULL,
	`text` text NOT NULL,
	`reply_to_id` text,
	`original_hash` text NOT NULL,
	`edited_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `native_conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `native_messages_id_unique` ON `native_messages` (`id`);--> statement-breakpoint
CREATE INDEX `native_messages_conversation_seq` ON `native_messages` (`conversation_id`,`seq`);--> statement-breakpoint
CREATE INDEX `native_messages_reply` ON `native_messages` (`reply_to_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `native_messages_retry_unique` ON `native_messages` (`conversation_id`,`author_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `native_reactions` (
	`message_id` text NOT NULL,
	`account_id` text NOT NULL,
	`emoji` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`message_id`, `account_id`, `emoji`),
	FOREIGN KEY (`message_id`) REFERENCES `native_messages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
