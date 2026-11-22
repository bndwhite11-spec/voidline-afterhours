CREATE TABLE `capsule_editions` (
	`id` text PRIMARY KEY NOT NULL,
	`families_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `capsule_open_requests` (
	`account_id` text NOT NULL,
	`client_id` text NOT NULL,
	`capsule_id` text NOT NULL,
	`family_id` text NOT NULL,
	PRIMARY KEY(`account_id`, `client_id`),
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`capsule_id`) REFERENCES `collectible_capsules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `capsule_openings` (
	`id` text PRIMARY KEY NOT NULL,
	`capsule_id` text NOT NULL,
	`instance_id` text NOT NULL,
	`family_id` text NOT NULL,
	`model_id` text NOT NULL,
	`table_version` text NOT NULL,
	`snapshot` text NOT NULL,
	`weight` integer NOT NULL,
	`total_weight` integer NOT NULL,
	`discovery` text NOT NULL,
	`opened_at` integer NOT NULL,
	`acknowledged_at` integer,
	FOREIGN KEY (`capsule_id`) REFERENCES `collectible_capsules`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "capsule_positive_weight" CHECK("capsule_openings"."weight" > 0 AND "capsule_openings"."weight" <= "capsule_openings"."total_weight"),
	CONSTRAINT "capsule_discovery_kind" CHECK("capsule_openings"."discovery" IN ('first','additional','returning'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `capsule_once` ON `capsule_openings` (`capsule_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `capsule_open_instance` ON `capsule_openings` (`instance_id`);--> statement-breakpoint
CREATE TABLE `capsule_stamps` (
	`account_id` text NOT NULL,
	`utc_day` text NOT NULL,
	`utc_week` text NOT NULL,
	`committed_at` integer NOT NULL,
	`edition_id` text NOT NULL,
	PRIMARY KEY(`account_id`, `utc_day`),
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`edition_id`) REFERENCES `capsule_editions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `capsule_week_progress` ON `capsule_stamps` (`account_id`,`utc_week`);--> statement-breakpoint
CREATE TABLE `collectible_capsules` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`source` text NOT NULL,
	`period` text NOT NULL,
	`edition_id` text NOT NULL,
	`earned_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`edition_id`) REFERENCES `capsule_editions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "capsule_source" CHECK("collectible_capsules"."source" IN ('weekly','welcome'))
);
--> statement-breakpoint
CREATE INDEX `capsule_account_earned` ON `collectible_capsules` (`account_id`,`earned_at`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `capsule_entitlement_unique` ON `collectible_capsules` (`account_id`,`source`,`period`);--> statement-breakpoint
CREATE TABLE `collectible_discoveries` (
	`account_id` text NOT NULL,
	`model_id` text NOT NULL,
	`discovered_at` integer NOT NULL,
	PRIMARY KEY(`account_id`, `model_id`),
	FOREIGN KEY (`account_id`) REFERENCES `live_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `gift_instances` ADD `ownership_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `gift_instances` ADD `acquired_at` integer;--> statement-breakpoint
ALTER TABLE `gift_instances` ADD `arrival_acknowledged_at` integer DEFAULT -1;--> statement-breakpoint
ALTER TABLE `gift_instances` ADD `capsule_id` text REFERENCES collectible_capsules(id);--> statement-breakpoint
CREATE UNIQUE INDEX `gift_instance_capsule_unique` ON `gift_instances` (`capsule_id`);--> statement-breakpoint
ALTER TABLE `gift_showcase` ADD `featured` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `gift_transfers` ADD `ownership_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `gift_transfers` ADD `model_snapshot` text;--> statement-breakpoint
ALTER TABLE `profile_preferences` ADD `full_inventory_visibility` text DEFAULT 'private' NOT NULL;
--> statement-breakpoint
CREATE TRIGGER gift_new_discovery AFTER INSERT ON gift_instances BEGIN
  UPDATE gift_instances SET acquired_at=coalesce(NEW.acquired_at,NEW.created_at),arrival_acknowledged_at=CASE WHEN NEW.arrival_acknowledged_at=-1 THEN NULL ELSE NEW.arrival_acknowledged_at END WHERE id=NEW.id;
  INSERT INTO collectible_discoveries(account_id,model_id,discovered_at)
    VALUES(NEW.owner_id,NEW.catalog_id,coalesce(NEW.acquired_at,NEW.created_at))
    ON CONFLICT(account_id,model_id) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER gift_ownership_period AFTER UPDATE OF owner_id ON gift_instances WHEN NEW.owner_id<>OLD.owner_id BEGIN
  UPDATE gift_instances SET ownership_revision=OLD.ownership_revision+1,
    acquired_at=coalesce((SELECT handled_at FROM gift_transfers WHERE id=OLD.pending_transfer_id AND state='accepted' AND recipient_id=NEW.owner_id),
      CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)),arrival_acknowledged_at=NULL WHERE id=NEW.id;
  INSERT INTO collectible_discoveries(account_id,model_id,discovered_at)
    SELECT owner_id,catalog_id,acquired_at FROM gift_instances WHERE id=NEW.id
    ON CONFLICT(account_id,model_id) DO NOTHING;
  DELETE FROM gift_showcase WHERE instance_id=NEW.id AND account_id<>NEW.owner_id;
END;
--> statement-breakpoint
CREATE TRIGGER collectible_block_cancels_requests AFTER INSERT ON social_blocks BEGIN
  UPDATE gift_transfers SET state='cancelled',handled_at=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)
    WHERE state='pending' AND ((sender_id=NEW.blocker_id AND recipient_id=NEW.blocked_id) OR
                               (sender_id=NEW.blocked_id AND recipient_id=NEW.blocker_id));
END;
--> statement-breakpoint
CREATE TRIGGER collectible_unavailable_cancels_requests AFTER UPDATE OF account_status ON live_accounts
WHEN NEW.account_status<>'active' AND OLD.account_status='active' BEGIN
  UPDATE gift_transfers SET state='cancelled',handled_at=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)
    WHERE state='pending' AND (sender_id=NEW.id OR recipient_id=NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER collectible_cancel_releases_copy AFTER UPDATE OF state ON gift_transfers
WHEN OLD.state='pending' AND NEW.state IN ('cancelled','declined') BEGIN
  UPDATE gift_instances SET pending_transfer_id=NULL WHERE id=NEW.instance_id AND pending_transfer_id=NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER capsule_edition_no_update BEFORE UPDATE ON capsule_editions BEGIN
  SELECT RAISE(ABORT,'edition_is_immutable');
END;
--> statement-breakpoint
CREATE TRIGGER capsule_edition_no_delete BEFORE DELETE ON capsule_editions BEGIN
  SELECT RAISE(ABORT,'edition_is_immutable');
END;
--> statement-breakpoint
CREATE TRIGGER capsule_earned_immutable BEFORE UPDATE ON collectible_capsules BEGIN
  SELECT RAISE(ABORT,'earned_capsule_is_immutable');
END;
--> statement-breakpoint
CREATE TRIGGER capsule_opening_immutable BEFORE UPDATE OF id,capsule_id,instance_id,family_id,model_id,table_version,snapshot,weight,total_weight,discovery,opened_at ON capsule_openings BEGIN
  SELECT RAISE(ABORT,'opening_is_immutable');
END;
--> statement-breakpoint
-- A single insert is the commit marker for consumption, award, discovery, and receipt.
-- SQLite aborts that statement (and its D1 batch) if the exact instance cannot be created.
CREATE TRIGGER capsule_opening_awards_copy AFTER INSERT ON capsule_openings BEGIN
  INSERT INTO gift_instances(id,catalog_id,owner_id,origin_kind,created_at,acquired_at,capsule_id)
  SELECT NEW.instance_id,NEW.model_id,c.account_id,'capsule',NEW.opened_at,NEW.opened_at,c.id
  FROM collectible_capsules c WHERE c.id=NEW.capsule_id;
END;
--> statement-breakpoint
CREATE TRIGGER capsule_stamps_award_week AFTER INSERT ON capsule_stamps
WHEN (SELECT count(*) FROM capsule_stamps WHERE account_id=NEW.account_id AND utc_week=NEW.utc_week)=3 BEGIN
  INSERT INTO collectible_capsules(id,account_id,source,period,edition_id,earned_at)
    VALUES(lower(hex(randomblob(16))),NEW.account_id,'weekly',NEW.utc_week,NEW.edition_id,NEW.committed_at)
    ON CONFLICT(account_id,source,period) DO NOTHING;
END;
--> statement-breakpoint
-- Historical UI defaults and groups stay intact. Rows predating this rollout retain
-- their original fields. This view projects evidence only from recorded acquisitions.
CREATE VIEW collectible_discovery_history AS
SELECT account_id,model_id,MIN(discovered_at) AS discovered_at FROM (
  SELECT account_id,model_id,discovered_at FROM collectible_discoveries
  UNION ALL SELECT i.owner_id,i.catalog_id,coalesce(
    (SELECT MIN(t.handled_at) FROM gift_transfers t WHERE t.instance_id=i.id AND t.recipient_id=i.owner_id AND t.state='accepted'),
    i.acquired_at,i.created_at) FROM gift_instances i
  UNION ALL SELECT t.recipient_id,i.catalog_id,t.handled_at FROM gift_transfers t JOIN gift_instances i ON i.id=t.instance_id WHERE t.state='accepted' AND t.handled_at IS NOT NULL
  UNION ALL SELECT t.sender_id,i.catalog_id,i.created_at FROM gift_transfers t JOIN gift_instances i ON i.id=t.instance_id WHERE t.state='accepted'
    AND NOT EXISTS(SELECT 1 FROM gift_transfers p WHERE p.instance_id=t.instance_id AND p.state='accepted' AND (p.handled_at,p.id)<(t.handled_at,t.id))
) GROUP BY account_id,model_id;
--> statement-breakpoint
-- Persist the policy independently of worker rollbacks, including before first issuance.
CREATE VIEW collectible_model_policies AS
SELECT column1 AS model_id,'capsule-only' AS acquisition_policy FROM (VALUES
  ('gift-chudjak-original'),
  ('gift-chudjak-midnight-hoodie'),
  ('gift-chudjak-helmet'),
  ('gift-chudjak-patchwork'),
  ('gift-chudjak-silver-thread'),
  ('gift-chudjak-velvet-eclipse'),
  ('gift-pepe-desk-green'),
  ('gift-pepe-terminal-clear'),
  ('gift-pepe-night-shift'),
  ('gift-pepe-porcelain-pond'),
  ('gift-pepe-meteor-core'),
  ('gift-pepe-black-opal-eclipse'),
  ('gift-tape-graphite-session'),
  ('gift-tape-clear-leader'),
  ('gift-tape-splice-repair'),
  ('gift-tape-brushed-deck'),
  ('gift-tape-night-press'),
  ('gift-tank-field-enamel'),
  ('gift-tank-sight-glass'),
  ('gift-tank-field-repair'),
  ('gift-tank-kiln-white'));
--> statement-breakpoint
CREATE TRIGGER collectible_no_free_claim BEFORE INSERT ON cosmetic_ownership
WHEN EXISTS(SELECT 1 FROM collectible_model_policies WHERE model_id=NEW.cosmetic_id)
BEGIN SELECT RAISE(ABORT,'capsule_required'); END;
--> statement-breakpoint
CREATE TRIGGER collectible_no_free_gift BEFORE INSERT ON cosmetic_gifts
WHEN EXISTS(SELECT 1 FROM collectible_model_policies WHERE model_id=NEW.catalog_id)
BEGIN SELECT RAISE(ABORT,'capsule_required'); END;
--> statement-breakpoint
CREATE TRIGGER collectible_enforce_issuance BEFORE INSERT ON gift_instances
WHEN NEW.capsule_id IS NOT NULL OR NEW.origin_kind='capsule' OR EXISTS(SELECT 1 FROM collectible_model_policies WHERE model_id=NEW.catalog_id)
BEGIN
  SELECT CASE WHEN NEW.origin_kind<>'capsule' OR NEW.origin_gift_id IS NOT NULL OR NOT EXISTS(
    SELECT 1 FROM capsule_openings o JOIN collectible_capsules c ON c.id=o.capsule_id
    WHERE o.capsule_id=NEW.capsule_id AND o.instance_id=NEW.id AND o.model_id=NEW.catalog_id AND c.account_id=NEW.owner_id)
    THEN RAISE(ABORT,'authorized_capsule_opening_required') END;
END;
--> statement-breakpoint
CREATE TRIGGER collectible_model_immutable BEFORE UPDATE OF catalog_id,capsule_id,created_at,origin_kind,origin_gift_id ON gift_instances
WHEN OLD.catalog_id IS NOT NEW.catalog_id OR OLD.capsule_id IS NOT NEW.capsule_id OR OLD.created_at IS NOT NEW.created_at
  OR OLD.origin_kind IS NOT NEW.origin_kind OR OLD.origin_gift_id IS NOT NEW.origin_gift_id
BEGIN SELECT RAISE(ABORT,'collectible_identity_is_immutable'); END;
--> statement-breakpoint
CREATE INDEX gift_instances_models ON gift_instances(owner_id,catalog_id,acquired_at,id);
--> statement-breakpoint
CREATE INDEX gift_transfer_acquisition ON gift_transfers(instance_id,recipient_id,state,handled_at);
