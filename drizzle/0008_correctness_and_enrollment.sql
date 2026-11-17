CREATE TABLE `live_message_mentions` (
	`message_id` text NOT NULL,
	`account_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`message_id`, `account_id`),
	FOREIGN KEY (`message_id`) REFERENCES `live_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `live_message_mentions_account` ON `live_message_mentions` (`account_id`,`message_id`);--> statement-breakpoint
CREATE TABLE `matrix_account_links` (
	`account_id` text PRIMARY KEY NOT NULL,
	`matrix_user_id` text NOT NULL,
	`matrix_subject` text NOT NULL,
	`homeserver_origin` text NOT NULL,
	`verified_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matrix_account_links_user_unique` ON `matrix_account_links` (`matrix_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `matrix_account_links_subject_unique` ON `matrix_account_links` (`matrix_subject`);--> statement-breakpoint
CREATE TABLE `matrix_enrollment_issues` (
	`jti` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`session_id` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`matrix_device_id` text,
	`completed_at` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `auth_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `matrix_enrollment_issues_account` ON `matrix_enrollment_issues` (`account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `matrix_enrollment_issues_expiry` ON `matrix_enrollment_issues` (`expires_at`);--> statement-breakpoint
CREATE TABLE `native_bookmarks` (
	`account_id` text NOT NULL,
	`message_id` text NOT NULL,
	`saved` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`account_id`, `message_id`),
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `native_messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `native_bookmarks_account_time` ON `native_bookmarks` (`account_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `native_list_items` (
	`snapshot_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`snapshot_id`, `position`),
	FOREIGN KEY (`snapshot_id`) REFERENCES `native_list_snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `native_conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `native_list_items_snapshot_conversation` ON `native_list_items` (`snapshot_id`,`conversation_id`);--> statement-breakpoint
CREATE TABLE `native_list_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`filter` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `native_list_snapshots_expiry` ON `native_list_snapshots` (`expires_at`);--> statement-breakpoint
CREATE INDEX `native_list_snapshots_account` ON `native_list_snapshots` (`account_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notification_events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`source_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`community_id` text,
	`conversation_id` text,
	`created_at` integer NOT NULL,
	`processed_at` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`community_id`) REFERENCES `live_communities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conversation_id`) REFERENCES `native_conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notification_events_created` ON `notification_events` (`created_at`,`seq`);--> statement-breakpoint
CREATE UNIQUE INDEX `notification_events_source_unique` ON `notification_events` (`kind`,`source_id`);--> statement-breakpoint
CREATE TABLE `push_deliveries` (
	`event_seq` integer NOT NULL,
	`subscription_id` text NOT NULL,
	`state` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`claimed_at` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`event_seq`, `subscription_id`),
	FOREIGN KEY (`event_seq`) REFERENCES `notification_events`(`seq`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscription_id`) REFERENCES `push_subscriptions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "push_deliveries_state" CHECK("push_deliveries"."state" IN ('pending','sending','sent','retry','failed'))
);
--> statement-breakpoint
CREATE INDEX `push_deliveries_due` ON `push_deliveries` (`state`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`session_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`keys_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `auth_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_account` ON `push_subscriptions` (`account_id`,`session_id`);--> statement-breakpoint
ALTER TABLE `live_communities` ADD `ownership_repair_required` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `live_communities` ADD `ownership_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `live_messages` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `native_conversations` ADD `owner_id` text REFERENCES live_accounts(id);--> statement-breakpoint
ALTER TABLE `native_messages` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint

--> statement-breakpoint
-- Existing authoritative ownership is preserved, never inferred from a handle.
-- Broken owner links are quarantined for independent infrastructure review.
UPDATE live_communities SET ownership_repair_required=1
WHERE NOT EXISTS(SELECT 1 FROM live_memberships m JOIN live_accounts a ON a.id=m.account_id
 WHERE m.community_id=live_communities.id AND m.account_id=live_communities.created_by
 AND a.account_status='active' AND a.username IS NOT NULL);
--> statement-breakpoint
INSERT INTO admin_audit(id,actor_id,action,target_type,target_id,detail_json,created_at)
SELECT 'migration-owner-'||lower(hex(randomblob(16))),c.created_by,
 CASE WHEN c.ownership_repair_required=1 THEN 'migration.community_owner.quarantined' ELSE 'migration.community_owner.normalized' END,
 'community',c.id,json_object('systemMigration','0008','authoritativeAccountId',c.created_by,'ownershipRepairRequired',c.ownership_repair_required,
 'previousOwnerIds',json((SELECT json_group_array(account_id) FROM live_memberships WHERE community_id=c.id AND role='owner'))),
 CAST(strftime('%s','now') AS INTEGER)*1000 FROM live_communities c
WHERE c.ownership_repair_required=1 OR (SELECT COUNT(*) FROM live_memberships WHERE community_id=c.id AND role='owner')<>1
 OR NOT EXISTS(SELECT 1 FROM live_memberships WHERE community_id=c.id AND account_id=c.created_by AND role='owner');
--> statement-breakpoint
UPDATE live_memberships SET role='member' WHERE role='owner' AND EXISTS(
 SELECT 1 FROM live_communities c WHERE c.id=live_memberships.community_id
 AND(c.ownership_repair_required=1 OR c.created_by<>live_memberships.account_id));
--> statement-breakpoint
UPDATE live_memberships SET role='owner' WHERE EXISTS(
 SELECT 1 FROM live_communities c WHERE c.id=live_memberships.community_id
 AND c.created_by=live_memberships.account_id AND c.ownership_repair_required=0);
--> statement-breakpoint
CREATE UNIQUE INDEX live_memberships_single_owner ON live_memberships(community_id) WHERE role='owner';
--> statement-breakpoint
CREATE TRIGGER live_owner_claim_insert BEFORE INSERT ON live_memberships
WHEN NEW.role='owner' AND NOT EXISTS(SELECT 1 FROM live_communities c WHERE c.id=NEW.community_id AND c.created_by=NEW.account_id AND c.ownership_repair_required=0)
BEGIN SELECT RAISE(ABORT,'authoritative_owner_required'); END;
--> statement-breakpoint
CREATE TRIGGER live_owner_claim_update BEFORE UPDATE OF role,account_id,community_id ON live_memberships
WHEN NEW.role='owner' AND NOT EXISTS(SELECT 1 FROM live_communities c WHERE c.id=NEW.community_id AND c.created_by=NEW.account_id AND c.ownership_repair_required=0)
BEGIN SELECT RAISE(ABORT,'authoritative_owner_required'); END;
--> statement-breakpoint
CREATE TRIGGER live_owner_protect_delete BEFORE DELETE ON live_memberships
WHEN OLD.role='owner' AND EXISTS(SELECT 1 FROM live_communities c WHERE c.id=OLD.community_id AND c.created_by=OLD.account_id AND c.ownership_repair_required=0)
BEGIN SELECT RAISE(ABORT,'ownership_transfer_required'); END;
--> statement-breakpoint
CREATE TRIGGER live_owner_protect_demotion BEFORE UPDATE OF role,account_id,community_id ON live_memberships
WHEN OLD.role='owner' AND(NEW.role<>'owner' OR NEW.account_id<>OLD.account_id OR NEW.community_id<>OLD.community_id)
 AND EXISTS(SELECT 1 FROM live_communities c WHERE c.id=OLD.community_id AND c.created_by=OLD.account_id AND c.ownership_repair_required=0)
BEGIN SELECT RAISE(ABORT,'ownership_transfer_required'); END;
--> statement-breakpoint
CREATE TRIGGER live_owner_target_guard BEFORE UPDATE OF created_by,ownership_repair_required ON live_communities
WHEN NEW.ownership_repair_required=0 AND(NEW.created_by<>OLD.created_by OR OLD.ownership_repair_required=1)
 AND NOT EXISTS(SELECT 1 FROM live_memberships m JOIN live_accounts a ON a.id=m.account_id WHERE m.community_id=NEW.id AND m.account_id=NEW.created_by AND a.account_status='active' AND a.username IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'eligible_owner_membership_required'); END;
--> statement-breakpoint
CREATE TRIGGER live_owner_transfer_sync AFTER UPDATE OF created_by,ownership_repair_required ON live_communities
WHEN NEW.ownership_repair_required=0 AND(NEW.created_by<>OLD.created_by OR OLD.ownership_repair_required=1)
BEGIN
 UPDATE live_memberships SET role='member' WHERE community_id=NEW.id AND role='owner' AND account_id<>NEW.created_by;
 UPDATE live_memberships SET role='owner' WHERE community_id=NEW.id AND account_id=NEW.created_by;
 UPDATE live_communities SET ownership_revision=OLD.ownership_revision+1 WHERE id=NEW.id;
END;
--> statement-breakpoint
UPDATE native_messages SET revision=COALESCE((SELECT MAX(seq) FROM native_changes WHERE message_id=native_messages.id),0);
--> statement-breakpoint
UPDATE live_messages SET revision=COALESCE((SELECT MAX(seq) FROM live_changes WHERE message_id=live_messages.id),0);
--> statement-breakpoint
CREATE TRIGGER native_message_revision AFTER INSERT ON native_changes
BEGIN UPDATE native_messages SET revision=MAX(revision,NEW.seq) WHERE id=NEW.message_id; END;
--> statement-breakpoint
CREATE TRIGGER community_message_revision AFTER INSERT ON live_changes
BEGIN UPDATE live_messages SET revision=MAX(revision,NEW.seq) WHERE id=NEW.message_id; END;
--> statement-breakpoint
UPDATE native_conversations SET owner_id=created_by WHERE kind='group' AND EXISTS(
 SELECT 1 FROM native_members m JOIN live_accounts a ON a.id=m.account_id
 WHERE m.conversation_id=native_conversations.id AND m.account_id=native_conversations.created_by AND a.account_status<>'deleted' AND a.username IS NOT NULL);
--> statement-breakpoint
-- v13 allowed group creators to leave. Restore only native group management
-- to an existing participant, never community or platform administration.
INSERT INTO admin_audit(id,actor_id,action,target_type,target_id,detail_json,created_at)
SELECT 'migration-native-owner-'||lower(hex(randomblob(16))),c.created_by,
 'migration.native_group_owner.restored','native-group',c.id,
 json_object('systemMigration','0008','createdBy',c.created_by,'ownerAccountId',
  (SELECT m.account_id FROM native_members m JOIN live_accounts a ON a.id=m.account_id WHERE m.conversation_id=c.id AND a.account_status<>'deleted' AND a.username IS NOT NULL ORDER BY CASE WHEN a.account_status='active' THEN 0 ELSE 1 END,m.joined_at,m.account_id LIMIT 1)),
 CAST(strftime('%s','now') AS INTEGER)*1000
FROM native_conversations c WHERE c.kind='group' AND c.owner_id IS NULL AND EXISTS(
 SELECT 1 FROM native_members m JOIN live_accounts a ON a.id=m.account_id WHERE m.conversation_id=c.id AND a.account_status<>'deleted' AND a.username IS NOT NULL);
--> statement-breakpoint
UPDATE native_conversations SET owner_id=(
 SELECT m.account_id FROM native_members m JOIN live_accounts a ON a.id=m.account_id
 WHERE m.conversation_id=native_conversations.id AND a.account_status<>'deleted' AND a.username IS NOT NULL
 ORDER BY CASE WHEN a.account_status='active' THEN 0 ELSE 1 END,m.joined_at,m.account_id LIMIT 1)
WHERE kind='group' AND owner_id IS NULL;
--> statement-breakpoint
CREATE TRIGGER native_group_owner_departure AFTER DELETE ON native_members
WHEN EXISTS(SELECT 1 FROM native_conversations WHERE id=OLD.conversation_id AND kind='group' AND owner_id=OLD.account_id)
BEGIN
 UPDATE native_conversations SET owner_id=(SELECT m.account_id FROM native_members m JOIN live_accounts a ON a.id=m.account_id WHERE m.conversation_id=OLD.conversation_id AND a.account_status<>'deleted' AND a.username IS NOT NULL ORDER BY CASE WHEN a.account_status='active' THEN 0 ELSE 1 END,m.joined_at,m.account_id LIMIT 1) WHERE id=OLD.conversation_id;
END;
--> statement-breakpoint
CREATE TRIGGER notify_native_message AFTER INSERT ON native_messages
BEGIN INSERT OR IGNORE INTO notification_events(kind,source_id,actor_id,conversation_id,created_at) VALUES('native',NEW.id,NEW.author_id,NEW.conversation_id,NEW.created_at); END;
--> statement-breakpoint
CREATE TRIGGER notify_community_message AFTER INSERT ON live_messages
BEGIN INSERT OR IGNORE INTO notification_events(kind,source_id,actor_id,community_id,created_at) SELECT 'community',NEW.id,NEW.author_id,c.community_id,NEW.created_at FROM live_channels c WHERE c.id=NEW.channel_id; END;
--> statement-breakpoint
CREATE TRIGGER notify_friend_request AFTER INSERT ON social_requests WHEN NEW.state='pending'
BEGIN INSERT OR IGNORE INTO notification_events(kind,source_id,actor_id,created_at) VALUES('friend',NEW.id,NEW.sender_id,NEW.created_at); END;
--> statement-breakpoint
CREATE TRIGGER notify_gift_grant AFTER INSERT ON cosmetic_gifts WHEN NEW.state='pending'
BEGIN INSERT OR IGNORE INTO notification_events(kind,source_id,actor_id,created_at) VALUES('gift',NEW.id,NEW.sender_id,NEW.created_at); END;
