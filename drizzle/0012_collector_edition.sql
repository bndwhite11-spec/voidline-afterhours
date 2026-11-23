-- Future grants use the expanded policy. Existing editions and inventories keep their records.
DROP VIEW collectible_model_policies;
--> statement-breakpoint
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
  ('gift-tank-kiln-white'),
  ('gift-edition-cartridge-text-back'),
  ('gift-edition-cartridge-one-more-game'),
  ('gift-edition-cartridge-next-in-queue'),
  ('gift-edition-cartridge-it-was-lag'),
  ('gift-edition-cartridge-still-early'),
  ('gift-edition-cartridge-last-excuse'),
  ('gift-terminal-greenline'),
  ('gift-terminal-amber-relay'),
  ('gift-terminal-field-service'),
  ('gift-terminal-glass-console'),
  ('gift-volume-marginalia'),
  ('gift-volume-clasped-copy'),
  ('gift-volume-night-binding'),
  ('gift-volume-opal-frontispiece'));
--> statement-breakpoint
-- Once per lifetime, the first completed v3 week also issues one classic green cartridge.
-- The enduring earned capsule, even after a transfer, is the entitlement record.
CREATE TRIGGER collector_first_week_keepsake AFTER INSERT ON collectible_capsules
WHEN NEW.edition_id='afterhours-choice.v3' AND NEW.source='weekly' AND NOT EXISTS(
  SELECT 1 FROM collectible_capsules WHERE account_id=NEW.account_id AND source='weekly'
  AND edition_id=NEW.edition_id AND id<>NEW.id)
BEGIN
  INSERT INTO gift_instances(id,catalog_id,owner_id,origin_kind,created_at,acquired_at)
    VALUES('milestone:'||NEW.id,'gift-copium-cartridge',NEW.account_id,'milestone',NEW.earned_at,NEW.earned_at);
END;
