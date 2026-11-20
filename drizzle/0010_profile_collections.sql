CREATE TABLE `gift_collection_items` (
	`collection_id` text NOT NULL,
	`instance_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`collection_id`, `instance_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `gift_collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`instance_id`) REFERENCES `gift_instances`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "gift_collection_items_position" CHECK("gift_collection_items"."position">=0)
);
--> statement-breakpoint
CREATE INDEX `gift_collection_items_instance` ON `gift_collection_items` (`instance_id`);--> statement-breakpoint
CREATE TABLE `gift_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`client_id` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`change_marker` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "gift_collections_name_length" CHECK(length(trim("gift_collections"."name")) BETWEEN 1 AND 40),
	CONSTRAINT "gift_collections_revision" CHECK("gift_collections"."revision">=0)
);
--> statement-breakpoint
CREATE INDEX `gift_collections_owner_updated` ON `gift_collections` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `gift_collections_owner_name_unique` ON `gift_collections` (`owner_id`,`normalized_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `gift_collections_owner_client_unique` ON `gift_collections` (`owner_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `profile_save_state` (
	`account_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`write_token` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "profile_save_state_revision" CHECK("profile_save_state"."revision">=0)
);
--> statement-breakpoint
CREATE TABLE `profile_saved_looks` (
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`avatar` text NOT NULL,
	`banner` text NOT NULL,
	`accent` text NOT NULL,
	`name_style` text DEFAULT 'plain' NOT NULL,
	`profile_frame` text DEFAULT 'none' NOT NULL,
	PRIMARY KEY(`account_id`, `name`),
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `profile_preferences` ADD `name_style` text DEFAULT 'plain' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_preferences` ADD `profile_frame` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
CREATE INDEX `native_messages_author_conversation_seq` ON `native_messages` (`author_id`,`conversation_id`,`seq`);

--> statement-breakpoint
CREATE TRIGGER profile_revision_account AFTER UPDATE OF display_name,bio,status,avatar,theme ON live_accounts
WHEN NEW.account_status<>'deleted' AND (NEW.display_name IS NOT OLD.display_name OR NEW.bio IS NOT OLD.bio OR NEW.status IS NOT OLD.status OR NEW.avatar IS NOT OLD.avatar OR NEW.theme IS NOT OLD.theme)
BEGIN
 INSERT INTO profile_save_state(account_id,revision,write_token) VALUES(NEW.id,1,'') ON CONFLICT(account_id) DO UPDATE SET revision=profile_save_state.revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER profile_revision_preferences_insert AFTER INSERT ON profile_preferences
WHEN EXISTS(SELECT 1 FROM live_accounts WHERE id=NEW.account_id AND account_status<>'deleted')
BEGIN
 INSERT INTO profile_save_state(account_id,revision,write_token) VALUES(NEW.account_id,1,'') ON CONFLICT(account_id) DO UPDATE SET revision=profile_save_state.revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER profile_revision_preferences_update AFTER UPDATE OF banner,accent,details_visibility,collection_visibility,animation_enabled,badge_order,avatar_media_id,banner_media_id,name_style,profile_frame ON profile_preferences
WHEN EXISTS(SELECT 1 FROM live_accounts WHERE id=NEW.account_id AND account_status<>'deleted') AND (NEW.banner IS NOT OLD.banner OR NEW.accent IS NOT OLD.accent OR NEW.details_visibility IS NOT OLD.details_visibility OR NEW.collection_visibility IS NOT OLD.collection_visibility OR NEW.animation_enabled IS NOT OLD.animation_enabled OR NEW.badge_order IS NOT OLD.badge_order OR NEW.avatar_media_id IS NOT OLD.avatar_media_id OR NEW.banner_media_id IS NOT OLD.banner_media_id OR NEW.name_style IS NOT OLD.name_style OR NEW.profile_frame IS NOT OLD.profile_frame)
BEGIN
 INSERT INTO profile_save_state(account_id,revision,write_token) VALUES(NEW.account_id,1,'') ON CONFLICT(account_id) DO UPDATE SET revision=profile_save_state.revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER profile_revision_preferences_delete AFTER DELETE ON profile_preferences
WHEN EXISTS(SELECT 1 FROM live_accounts WHERE id=OLD.account_id AND account_status<>'deleted')
BEGIN
 INSERT INTO profile_save_state(account_id,revision,write_token) VALUES(OLD.account_id,1,'') ON CONFLICT(account_id) DO UPDATE SET revision=profile_save_state.revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER profile_revision_decoration_insert AFTER INSERT ON cosmetic_profiles
WHEN NEW.equipped_id IS NOT NULL
BEGIN
 INSERT INTO profile_save_state(account_id,revision,write_token) VALUES(NEW.account_id,1,'') ON CONFLICT(account_id) DO UPDATE SET revision=profile_save_state.revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER profile_revision_decoration_update AFTER UPDATE OF equipped_id ON cosmetic_profiles
WHEN NEW.equipped_id IS NOT OLD.equipped_id
BEGIN
 INSERT INTO profile_save_state(account_id,revision,write_token) VALUES(NEW.account_id,1,'') ON CONFLICT(account_id) DO UPDATE SET revision=profile_save_state.revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER profile_revision_decoration_delete AFTER DELETE ON cosmetic_profiles
WHEN OLD.equipped_id IS NOT NULL AND EXISTS(SELECT 1 FROM live_accounts WHERE id=OLD.account_id AND account_status<>'deleted')
BEGIN
 INSERT INTO profile_save_state(account_id,revision,write_token) VALUES(OLD.account_id,1,'') ON CONFLICT(account_id) DO UPDATE SET revision=profile_save_state.revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER profile_revision_showcase_insert AFTER INSERT ON gift_showcase
BEGIN
 INSERT INTO profile_save_state(account_id,revision,write_token) VALUES(NEW.account_id,1,'') ON CONFLICT(account_id) DO UPDATE SET revision=profile_save_state.revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER profile_revision_showcase_update AFTER UPDATE ON gift_showcase
WHEN NEW.account_id IS NOT OLD.account_id OR NEW.slot IS NOT OLD.slot OR NEW.instance_id IS NOT OLD.instance_id OR NEW.show_sender IS NOT OLD.show_sender
BEGIN
 INSERT INTO profile_save_state(account_id,revision,write_token) VALUES(NEW.account_id,1,'') ON CONFLICT(account_id) DO UPDATE SET revision=profile_save_state.revision+1;
 INSERT INTO profile_save_state(account_id,revision,write_token) SELECT OLD.account_id,1,'' WHERE OLD.account_id IS NOT NEW.account_id ON CONFLICT(account_id) DO UPDATE SET revision=profile_save_state.revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER profile_revision_showcase_delete AFTER DELETE ON gift_showcase
WHEN EXISTS(SELECT 1 FROM live_accounts WHERE id=OLD.account_id AND account_status<>'deleted')
BEGIN
 INSERT INTO profile_save_state(account_id,revision,write_token) VALUES(OLD.account_id,1,'') ON CONFLICT(account_id) DO UPDATE SET revision=profile_save_state.revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER gift_collections_transfer_cleanup AFTER UPDATE OF owner_id ON gift_instances
WHEN NEW.owner_id IS NOT OLD.owner_id
BEGIN
 UPDATE gift_collections SET revision=revision+1,change_marker='',updated_at=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER) WHERE id IN(SELECT collection_id FROM gift_collection_items WHERE instance_id=NEW.id) AND owner_id<>NEW.owner_id;
 DELETE FROM gift_collection_items WHERE instance_id=NEW.id AND collection_id IN(SELECT id FROM gift_collections WHERE owner_id<>NEW.owner_id);
END;

--> statement-breakpoint
CREATE TRIGGER profile_private_deleted_account_cleanup AFTER UPDATE OF account_status ON live_accounts
WHEN NEW.account_status='deleted'
BEGIN
 DELETE FROM gift_collections WHERE owner_id=NEW.id;
 DELETE FROM profile_saved_looks WHERE account_id=NEW.id;
 DELETE FROM profile_save_state WHERE account_id=NEW.id;
END;

--> statement-breakpoint
CREATE TRIGGER gift_collection_insert_ownership BEFORE INSERT ON gift_collection_items
WHEN NOT EXISTS(SELECT 1 FROM gift_collections c JOIN gift_instances i ON i.owner_id=c.owner_id WHERE c.id=NEW.collection_id AND i.id=NEW.instance_id)
BEGIN
 SELECT RAISE(ABORT,'gift_collection_ownership_required');
END;

--> statement-breakpoint
CREATE TRIGGER gift_collection_update_ownership BEFORE UPDATE OF collection_id,instance_id ON gift_collection_items
WHEN NOT EXISTS(SELECT 1 FROM gift_collections c JOIN gift_instances i ON i.owner_id=c.owner_id WHERE c.id=NEW.collection_id AND i.id=NEW.instance_id)
BEGIN
 SELECT RAISE(ABORT,'gift_collection_ownership_required');
END;

--> statement-breakpoint
CREATE TRIGGER gift_collection_owner_immutable BEFORE UPDATE OF owner_id ON gift_collections
WHEN NEW.owner_id IS NOT OLD.owner_id
BEGIN
 SELECT RAISE(ABORT,'gift_collection_owner_immutable');
END;
