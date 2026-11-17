CREATE TABLE `account_revisions` (
	`account_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `matrix_policy_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`kind` text NOT NULL,
	`subject_id` text,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`lease_until` integer,
	`last_error` text,
	`requested_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "matrix_policy_operations_kind" CHECK("matrix_policy_operations"."kind" IN ('suspend','reinstate','delete','logout_all','logout_session','device_revoke')),
	CONSTRAINT "matrix_policy_operations_status" CHECK("matrix_policy_operations"."status" IN ('pending','running','retry','done','blocked'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matrix_policy_operations_idempotency_unique` ON `matrix_policy_operations` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `matrix_policy_operations_due` ON `matrix_policy_operations` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `matrix_policy_operations_account` ON `matrix_policy_operations` (`account_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`client_id` text NOT NULL,
	`object_key` text NOT NULL,
	`sha256` text NOT NULL,
	`kind` text NOT NULL,
	`content_type` text NOT NULL,
	`bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`filename` text DEFAULT '' NOT NULL,
	`conversation_id` text,
	`channel_id` text,
	`native_message_id` text,
	`live_message_id` text,
	`message_position` integer DEFAULT 0 NOT NULL,
	`state` text DEFAULT 'staged' NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `native_conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `live_channels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`native_message_id`) REFERENCES `native_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`live_message_id`) REFERENCES `live_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "media_assets_kind" CHECK("media_assets"."kind" IN ('avatar','banner','attachment','voice')),
	CONSTRAINT "media_assets_state" CHECK("media_assets"."state" IN ('uploading','staged','ready','attached','deleting')),
	CONSTRAINT "media_assets_scope" CHECK("media_assets"."conversation_id" IS NULL OR "media_assets"."channel_id" IS NULL),
	CONSTRAINT "media_assets_message_scope" CHECK("media_assets"."native_message_id" IS NULL OR "media_assets"."live_message_id" IS NULL),
	CONSTRAINT "media_assets_bytes" CHECK("media_assets"."bytes">0 AND "media_assets"."bytes"<=8388608)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_object_unique` ON `media_assets` (`object_key`);--> statement-breakpoint
CREATE INDEX `media_assets_owner_time` ON `media_assets` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `media_assets_native_message` ON `media_assets` (`native_message_id`);--> statement-breakpoint
CREATE INDEX `media_assets_live_message` ON `media_assets` (`live_message_id`);--> statement-breakpoint
CREATE INDEX `media_assets_expiry` ON `media_assets` (`state`,`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_owner_client_unique` ON `media_assets` (`owner_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `media_cleanup` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`owner_id` text,
	`not_before` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_cleanup_object_unique` ON `media_cleanup` (`object_key`);--> statement-breakpoint
CREATE INDEX `media_cleanup_due` ON `media_cleanup` (`not_before`);--> statement-breakpoint
CREATE TABLE `realtime_streams` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`session_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `auth_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `realtime_streams_account_expiry` ON `realtime_streams` (`account_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `realtime_streams_expiry` ON `realtime_streams` (`expires_at`);--> statement-breakpoint
ALTER TABLE `profile_preferences` ADD `avatar_media_id` text REFERENCES media_assets(id);--> statement-breakpoint
ALTER TABLE `profile_preferences` ADD `banner_media_id` text REFERENCES media_assets(id);
--> statement-breakpoint
CREATE TRIGGER realtime_native_change AFTER INSERT ON native_changes
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT account_id FROM native_members WHERE conversation_id=NEW.conversation_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_native_member_insert AFTER INSERT ON native_members
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT account_id FROM native_members WHERE conversation_id=NEW.conversation_id UNION SELECT NEW.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_native_member_delete AFTER DELETE ON native_members
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT account_id FROM native_members WHERE conversation_id=OLD.conversation_id UNION SELECT OLD.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_native_read AFTER UPDATE OF read_seq,read_change_seq ON native_members
WHEN NEW.read_seq<>OLD.read_seq OR NEW.read_change_seq<>OLD.read_change_seq
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT NEW.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_native_conversation AFTER UPDATE OF name,owner_id,updated_at ON native_conversations
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT account_id FROM native_members WHERE conversation_id=NEW.id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_community_change AFTER INSERT ON live_changes
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT m.account_id FROM live_memberships m JOIN live_channels c ON c.community_id=m.community_id WHERE c.id=NEW.channel_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_community_member_insert AFTER INSERT ON live_memberships
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT account_id FROM live_memberships WHERE community_id=NEW.community_id UNION SELECT NEW.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_community_member_delete AFTER DELETE ON live_memberships
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT account_id FROM live_memberships WHERE community_id=OLD.community_id UNION SELECT OLD.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_community_role AFTER UPDATE OF role ON live_memberships
WHEN NEW.role<>OLD.role
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT account_id FROM live_memberships WHERE community_id=NEW.community_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_channel_insert AFTER INSERT ON live_channels
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT account_id FROM live_memberships WHERE community_id=NEW.community_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_channel_update AFTER UPDATE ON live_channels
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT account_id FROM live_memberships WHERE community_id=NEW.community_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_channel_delete AFTER DELETE ON live_channels
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT account_id FROM live_memberships WHERE community_id=OLD.community_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_native_conversation_preferences_insert AFTER INSERT ON native_conversation_preferences
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT NEW.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_native_conversation_preferences_update AFTER UPDATE ON native_conversation_preferences
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT NEW.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_native_conversation_preferences_delete AFTER DELETE ON native_conversation_preferences
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT OLD.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_native_bookmarks_insert AFTER INSERT ON native_bookmarks
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT NEW.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_native_bookmarks_update AFTER UPDATE ON native_bookmarks
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT NEW.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_native_bookmarks_delete AFTER DELETE ON native_bookmarks
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT OLD.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_organization_targets_insert AFTER INSERT ON organization_targets
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT NEW.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_organization_targets_update AFTER UPDATE ON organization_targets
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT NEW.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_organization_targets_delete AFTER DELETE ON organization_targets
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT OLD.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_account_organization_insert AFTER INSERT ON account_organization
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT NEW.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_account_organization_update AFTER UPDATE ON account_organization
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT NEW.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER realtime_account_organization_delete AFTER DELETE ON account_organization
BEGIN
 INSERT INTO account_revisions(account_id,revision,updated_at) SELECT account_id,1,CAST(strftime('%s','now') AS INTEGER)*1000 FROM (SELECT OLD.account_id AS account_id) WHERE account_id IS NOT NULL GROUP BY account_id ON CONFLICT(account_id) DO UPDATE SET revision=account_revisions.revision+1,updated_at=excluded.updated_at;
END;

--> statement-breakpoint
CREATE TRIGGER media_asset_delete_cleanup BEFORE DELETE ON media_assets
BEGIN
 INSERT OR IGNORE INTO media_cleanup(id,object_key,owner_id,not_before,created_at) SELECT 'asset:'||id,object_key,owner_id,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000 FROM media_assets WHERE id=OLD.id;
END;

--> statement-breakpoint
CREATE TRIGGER media_native_messages_redact AFTER UPDATE OF deleted_at ON native_messages
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
BEGIN
 INSERT OR IGNORE INTO media_cleanup(id,object_key,owner_id,not_before,created_at) SELECT 'asset:'||id,object_key,owner_id,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000 FROM media_assets WHERE native_message_id=NEW.id;
 UPDATE media_assets SET state='deleting',updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE native_message_id=NEW.id;
END;

--> statement-breakpoint
CREATE TRIGGER media_live_messages_redact AFTER UPDATE OF deleted_at ON live_messages
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
BEGIN
 INSERT OR IGNORE INTO media_cleanup(id,object_key,owner_id,not_before,created_at) SELECT 'asset:'||id,object_key,owner_id,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000 FROM media_assets WHERE live_message_id=NEW.id;
 UPDATE media_assets SET state='deleting',updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE live_message_id=NEW.id;
END;

--> statement-breakpoint
CREATE TRIGGER media_profile_replace_avatar_media_id AFTER UPDATE OF avatar_media_id ON profile_preferences
WHEN OLD.avatar_media_id IS NOT NULL AND OLD.avatar_media_id IS NOT NEW.avatar_media_id
BEGIN
 INSERT OR IGNORE INTO media_cleanup(id,object_key,owner_id,not_before,created_at) SELECT 'asset:'||id,object_key,owner_id,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000 FROM media_assets WHERE id=OLD.avatar_media_id AND owner_id=NEW.account_id AND kind IN ('avatar','banner') AND state='ready' AND id IS NOT NEW.avatar_media_id AND id IS NOT NEW.banner_media_id;
 UPDATE media_assets SET state='deleting',updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE id=OLD.avatar_media_id AND owner_id=NEW.account_id AND kind IN ('avatar','banner') AND state='ready' AND id IS NOT NEW.avatar_media_id AND id IS NOT NEW.banner_media_id;
END;

--> statement-breakpoint
CREATE TRIGGER media_profile_replace_banner_media_id AFTER UPDATE OF banner_media_id ON profile_preferences
WHEN OLD.banner_media_id IS NOT NULL AND OLD.banner_media_id IS NOT NEW.banner_media_id
BEGIN
 INSERT OR IGNORE INTO media_cleanup(id,object_key,owner_id,not_before,created_at) SELECT 'asset:'||id,object_key,owner_id,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000 FROM media_assets WHERE id=OLD.banner_media_id AND owner_id=NEW.account_id AND kind IN ('avatar','banner') AND state='ready' AND id IS NOT NEW.avatar_media_id AND id IS NOT NEW.banner_media_id;
 UPDATE media_assets SET state='deleting',updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE id=OLD.banner_media_id AND owner_id=NEW.account_id AND kind IN ('avatar','banner') AND state='ready' AND id IS NOT NEW.avatar_media_id AND id IS NOT NEW.banner_media_id;
END;

--> statement-breakpoint
CREATE TRIGGER media_profile_delete AFTER DELETE ON profile_preferences
BEGIN
 INSERT OR IGNORE INTO media_cleanup(id,object_key,owner_id,not_before,created_at) SELECT 'asset:'||id,object_key,owner_id,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000 FROM media_assets WHERE owner_id=OLD.account_id AND id IN(OLD.avatar_media_id,OLD.banner_media_id) AND kind IN('avatar','banner');
 UPDATE media_assets SET state='deleting',updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE owner_id=OLD.account_id AND id IN(OLD.avatar_media_id,OLD.banner_media_id) AND kind IN('avatar','banner');
END;
