CREATE TABLE `abuse_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`detail_text` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	`resolved_by` text,
	FOREIGN KEY (`reporter_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resolved_by`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `abuse_reports_status_created` ON `abuse_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `account_emails` (
	`account_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`verified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_emails_email_unique` ON `account_emails` (`email`);--> statement-breakpoint
CREATE TABLE `account_organization` (
	`account_id` text PRIMARY KEY NOT NULL,
	`preferences` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `account_passkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`transports` text DEFAULT '[]' NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_passkeys_account` ON `account_passkeys` (`account_id`);--> statement-breakpoint
CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`detail_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `admin_audit_created` ON `admin_audit` (`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `auth_email_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`kind` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `auth_email_tokens_expiry` ON `auth_email_tokens` (`account_id`,`kind`,`expires_at`);--> statement-breakpoint
CREATE TABLE `badge_awards` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`badge_id` text NOT NULL,
	`issuer_id` text,
	`issued_at` integer NOT NULL,
	`revoked_at` integer,
	`reason` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`badge_id`) REFERENCES `badge_definitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issuer_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `badge_awards_account_valid` ON `badge_awards` (`account_id`,`revoked_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `badge_awards_account_badge_unique` ON `badge_awards` (`account_id`,`badge_id`);--> statement-breakpoint
CREATE TABLE `badge_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`requirement` text NOT NULL,
	`rule` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `community_timeouts` (
	`community_id` text NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`issued_by` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`community_id`, `account_id`),
	FOREIGN KEY (`community_id`) REFERENCES `live_communities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issued_by`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `community_timeouts_expiry` ON `community_timeouts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `gift_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`updated_by` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gift_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`catalog_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`origin_gift_id` text,
	`origin_kind` text NOT NULL,
	`created_at` integer NOT NULL,
	`pending_transfer_id` text,
	FOREIGN KEY (`owner_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`origin_gift_id`) REFERENCES `cosmetic_gifts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gift_instances_origin_unique` ON `gift_instances` (`origin_gift_id`);--> statement-breakpoint
CREATE INDEX `gift_instances_owner` ON `gift_instances` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `gift_showcase` (
	`account_id` text NOT NULL,
	`slot` integer NOT NULL,
	`instance_id` text NOT NULL,
	`show_sender` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`account_id`, `slot`),
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instance_id`) REFERENCES `gift_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gift_showcase_instance_unique` ON `gift_showcase` (`account_id`,`instance_id`);--> statement-breakpoint
CREATE TABLE `gift_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`instance_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`client_id` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`handled_at` integer,
	FOREIGN KEY (`instance_id`) REFERENCES `gift_instances`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `gift_transfers_recipient` ON `gift_transfers` (`recipient_id`,`state`);--> statement-breakpoint
CREATE INDEX `gift_transfers_sender` ON `gift_transfers` (`sender_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `gift_transfers_client_unique` ON `gift_transfers` (`sender_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `organization_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `organization_folders_account` ON `organization_folders` (`account_id`,`position`);--> statement-breakpoint
CREATE TABLE `organization_targets` (
	`account_id` text NOT NULL,
	`target_key` text NOT NULL,
	`kind` text NOT NULL,
	`community_id` text,
	`channel_id` text,
	`favorite` integer DEFAULT 0 NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`muted` integer DEFAULT 0 NOT NULL,
	`folder_id` text,
	`read_seq` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`account_id`, `target_key`),
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`community_id`) REFERENCES `live_communities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `live_channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`folder_id`) REFERENCES `organization_folders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "organization_targets_kind" CHECK("organization_targets"."kind" IN ('channel','matrix'))
);
--> statement-breakpoint
CREATE TABLE `owner_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`session_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `auth_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_claims_code_unique` ON `owner_claims` (`code_hash`);--> statement-breakpoint
CREATE TABLE `passkey_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`session_id` text NOT NULL,
	`kind` text NOT NULL,
	`challenge` text NOT NULL,
	`origin` text NOT NULL,
	`rp_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `auth_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `passkey_challenges_expiry` ON `passkey_challenges` (`account_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `platform_owner` (
	`id` integer PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`bound_at` integer NOT NULL,
	`binding_session_id` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`binding_session_id`) REFERENCES `auth_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "platform_owner_singleton" CHECK("platform_owner"."id"=1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_owner_account_unique` ON `platform_owner` (`account_id`);--> statement-breakpoint
CREATE TABLE `profile_preferences` (
	`account_id` text PRIMARY KEY NOT NULL,
	`banner` text DEFAULT 'midnight' NOT NULL,
	`accent` text DEFAULT 'ice' NOT NULL,
	`details_visibility` text DEFAULT 'shared' NOT NULL,
	`collection_visibility` text DEFAULT 'shared' NOT NULL,
	`animation_enabled` integer DEFAULT 0 NOT NULL,
	`badge_order` text DEFAULT '[]' NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD `mfa_verified_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `live_accounts` ADD `account_status` text DEFAULT 'active' NOT NULL;