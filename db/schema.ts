import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, unique, uniqueIndex } from "drizzle-orm/sqlite-core";

// This schema preserves backend/schema.sql. Schema changes are generated with
// npm run db:generate and applied by Sites before the Worker is published.
export const liveAccounts = sqliteTable("live_accounts", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  bio: text("bio").notNull().default(""),
  status: text("status").notNull().default(""),
  theme: text("theme").notNull().default("obsidian"),
  avatar: text("avatar").notNull().default("moon"),
  username: text("username").unique("live_accounts_username_unique"),
  onboardingComplete: integer("onboarding_complete").notNull().default(0),
  accountStatus: text("account_status").notNull().default("active"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const liveCommunities = sqliteTable("live_communities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("WL"),
  ownershipRepairRequired: integer("ownership_repair_required").notNull().default(0),
  ownershipRevision: integer("ownership_revision").notNull().default(0),
  createdBy: text("created_by").notNull().references(() => liveAccounts.id),
  createdAt: integer("created_at").notNull(),
});

export const liveMemberships = sqliteTable("live_memberships", {
  communityId: text("community_id").notNull().references(() => liveCommunities.id),
  accountId: text("account_id").notNull().references(() => liveAccounts.id),
  role: text("role").notNull(),
  joinedAt: integer("joined_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.communityId, table.accountId] }),
  check("live_memberships_role_check", sql`${table.role} IN ('owner', 'moderator', 'member')`),
  index("live_memberships_account").on(table.accountId, table.communityId),
  uniqueIndex("live_memberships_single_owner").on(table.communityId).where(sql`${table.role}='owner'`),
]);

export const liveChannels = sqliteTable("live_channels", {
  id: text("id").primaryKey(),
  communityId: text("community_id").notNull().references(() => liveCommunities.id),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("text"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  unique("live_channels_community_name_unique").on(table.communityId, table.name),
  check("live_channels_kind_check", sql`${table.kind} IN ('text', 'announcement')`),
  index("live_channels_community").on(table.communityId, table.createdAt),
]);

export const liveInvites = sqliteTable("live_invites", {
  tokenHash: text("token_hash").primaryKey(),
  communityId: text("community_id").notNull().references(() => liveCommunities.id),
  createdBy: text("created_by").notNull().references(() => liveAccounts.id),
  expiresAt: integer("expires_at").notNull(),
  maxUses: integer("max_uses").notNull(),
  uses: integer("uses").notNull().default(0),
  revokedAt: integer("revoked_at"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  check("live_invites_max_uses_check", sql`${table.maxUses} BETWEEN 1 AND 100`),
]);

export const liveMessages = sqliteTable("live_messages", {
  seq: integer("seq").primaryKey({ autoIncrement: true }),
  revision: integer("revision").notNull().default(0),
  id: text("id").notNull().unique("live_messages_id_unique"),
  channelId: text("channel_id").notNull().references(() => liveChannels.id),
  authorId: text("author_id").notNull().references(() => liveAccounts.id),
  clientId: text("client_id").notNull(),
  text: text("text").notNull(),
  replyToId: text("reply_to_id"),
  threadRootId: text("thread_root_id"),
  editedAt: integer("edited_at"),
  deletedAt: integer("deleted_at"),
  pinned: integer("pinned").notNull().default(0),
  originalHash: text("original_hash").notNull().default(""),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  unique("live_messages_channel_author_client_unique").on(table.channelId, table.authorId, table.clientId),
  index("live_messages_channel_seq").on(table.channelId, table.seq),
  index("live_messages_thread_seq").on(table.threadRootId,table.seq),
  index("live_messages_reply").on(table.replyToId),
]);

export const liveReactions = sqliteTable("live_reactions", {
  messageId: text("message_id").notNull().references(() => liveMessages.id),
  accountId: text("account_id").notNull().references(() => liveAccounts.id),
  emoji: text("emoji").notNull(),
  createdAt: integer("created_at").notNull(),
}, t => [primaryKey({columns:[t.messageId,t.accountId,t.emoji]})]);

export const liveBookmarks = sqliteTable("live_bookmarks", {
  messageId: text("message_id").notNull().references(() => liveMessages.id),
  accountId: text("account_id").notNull().references(() => liveAccounts.id),
  createdAt: integer("created_at").notNull(),
}, t => [primaryKey({columns:[t.messageId,t.accountId]}),index("live_bookmarks_account").on(t.accountId,t.createdAt)]);

export const liveFavorites = sqliteTable("live_favorites", {
  channelId: text("channel_id").notNull().references(() => liveChannels.id),
  accountId: text("account_id").notNull().references(() => liveAccounts.id),
}, t => [primaryKey({columns:[t.channelId,t.accountId]})]);

export const liveReadStates = sqliteTable("live_read_states", {
  channelId: text("channel_id").notNull().references(() => liveChannels.id),
  accountId: text("account_id").notNull().references(() => liveAccounts.id),
  seq: integer("seq").notNull().default(0),
  activitySeq: integer("activity_seq").notNull().default(0),
}, t => [primaryKey({columns:[t.channelId,t.accountId]})]);

export const liveChanges = sqliteTable("live_changes", {
  seq: integer("seq").primaryKey({autoIncrement:true}),
  channelId: text("channel_id").notNull().references(() => liveChannels.id),
  messageId: text("message_id").notNull().references(() => liveMessages.id),
  actorId: text("actor_id").notNull().references(() => liveAccounts.id),
  kind: text("kind").notNull(),
  createdAt: integer("created_at").notNull(),
}, t => [index("live_changes_channel_seq").on(t.channelId,t.seq),index("live_changes_message_seq").on(t.messageId,t.seq)]);

// Provider identities never link accounts by email. Sessions and OAuth
// transactions contain hashes of bearer/browser secrets, not those secrets.
export const authIdentities = sqliteTable("auth_identities", {
  provider: text("provider").notNull(),
  subject: text("subject").notNull(),
  accountId: text("account_id").notNull().references(() => liveAccounts.id),
  createdAt: integer("created_at").notNull(),
}, t => [primaryKey({columns:[t.provider,t.subject]}),index("auth_identities_account").on(t.accountId)]);

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => liveAccounts.id),
  tokenHash: text("token_hash").notNull().unique("auth_sessions_token_unique"),
  csrfHash: text("csrf_hash").notNull(),
  deviceName: text("device_name").notNull(),
  createdAt: integer("created_at").notNull(),
  lastActiveAt: integer("last_active_at").notNull(),
  reauthenticatedAt: integer("reauthenticated_at").notNull(),
  mfaVerifiedAt: integer("mfa_verified_at").notNull().default(0),
  expiresAt: integer("expires_at").notNull(),
  revokedAt: integer("revoked_at"),
}, t => [index("auth_sessions_account").on(t.accountId,t.expiresAt)]);

export const authTransactions = sqliteTable("auth_transactions", {
  stateHash: text("state_hash").primaryKey(),
  browserHash: text("browser_hash").notNull(),
  nonce: text("nonce").notNull(),
  verifier: text("verifier").notNull(),
  returnTo: text("return_to").notNull(),
  reauthenticate: integer("reauthenticate").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  consumedAt: integer("consumed_at"),
}, t => [index("auth_transactions_expiry").on(t.expiresAt)]);

export const authRateLimits = sqliteTable("auth_rate_limits", {
  bucket: text("bucket").primaryKey(),
  count: integer("count").notNull().default(1),
  expiresAt: integer("expires_at").notNull(),
}, t => [index("auth_rate_limits_expiry").on(t.expiresAt)]);

// Native credentials are independent from historical provider identities.
export const authCredentials = sqliteTable("auth_credentials", {
  accountId: text("account_id").primaryKey().references(() => liveAccounts.id),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  algorithm: text("algorithm").notNull(),
  iterations: integer("iterations").notNull(),
  recoveryHash: text("recovery_hash").notNull(),
  changeMarker: text("change_marker").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const socialRequests = sqliteTable("social_requests", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").notNull().references(() => liveAccounts.id),
  recipientId: text("recipient_id").notNull().references(() => liveAccounts.id),
  state: text("state").notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, t => [unique("social_requests_pair_unique").on(t.senderId,t.recipientId),index("social_requests_recipient").on(t.recipientId,t.state,t.createdAt),index("social_requests_sender").on(t.senderId,t.state,t.createdAt),check("social_requests_state",sql`${t.state} IN ('pending','accepted','declined','cancelled')`)]);
export const socialBlocks = sqliteTable("social_blocks", {
  blockerId: text("blocker_id").notNull().references(() => liveAccounts.id),
  blockedId: text("blocked_id").notNull().references(() => liveAccounts.id),
  createdAt: integer("created_at").notNull(),
}, t => [primaryKey({columns:[t.blockerId,t.blockedId]})]);
export const socialSettings = sqliteTable("social_settings", {
  accountId: text("account_id").primaryKey().references(() => liveAccounts.id),
  allowRequests: integer("allow_requests").notNull().default(1),
});

export const cosmeticOwnership = sqliteTable("cosmetic_ownership", {
  accountId: text("account_id").notNull().references(() => liveAccounts.id),
  cosmeticId: text("cosmetic_id").notNull(),
  claimedAt: integer("claimed_at").notNull(),
}, t => [primaryKey({columns:[t.accountId,t.cosmeticId]})]);
export const cosmeticProfiles = sqliteTable("cosmetic_profiles", {
  accountId: text("account_id").primaryKey().references(() => liveAccounts.id),
  equippedId: text("equipped_id"),
  giftsEnabled: integer("gifts_enabled").notNull().default(1),
});
export const cosmeticGifts = sqliteTable("cosmetic_gifts", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").notNull().references(() => liveAccounts.id),
  recipientId: text("recipient_id").notNull().references(() => liveAccounts.id),
  catalogId: text("catalog_id").notNull(),
  clientId: text("client_id").notNull(),
  state: text("state").notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
  openedAt: integer("opened_at"),
}, t => [unique("cosmetic_gifts_client_unique").on(t.senderId,t.clientId),index("cosmetic_gifts_recipient").on(t.recipientId,t.state,t.createdAt),index("cosmetic_gifts_sender").on(t.senderId,t.createdAt)]);


// Authentication metadata never includes a server-held message decryption key.
export const accountEmails = sqliteTable("account_emails", {
 accountId:text("account_id").primaryKey().references(()=>liveAccounts.id),
 email:text("email").notNull().unique("account_emails_email_unique"),
 verifiedAt:integer("verified_at"),createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),
});
export const authEmailTokens = sqliteTable("auth_email_tokens", {
 tokenHash:text("token_hash").primaryKey(),accountId:text("account_id").notNull().references(()=>liveAccounts.id),
 kind:text("kind").notNull(),email:text("email").notNull(),expiresAt:integer("expires_at").notNull(),consumedAt:integer("consumed_at"),createdAt:integer("created_at").notNull(),
},t=>[index("auth_email_tokens_expiry").on(t.accountId,t.kind,t.expiresAt)]);
export const accountPasskeys = sqliteTable("account_passkeys", {
 id:text("id").primaryKey(),accountId:text("account_id").notNull().references(()=>liveAccounts.id),publicKey:text("public_key").notNull(),
 counter:integer("counter").notNull().default(0),transports:text("transports").notNull().default("[]"),name:text("name").notNull(),createdAt:integer("created_at").notNull(),lastUsedAt:integer("last_used_at"),
},t=>[index("account_passkeys_account").on(t.accountId)]);
export const passkeyChallenges = sqliteTable("passkey_challenges", {
 id:text("id").primaryKey(),accountId:text("account_id").notNull().references(()=>liveAccounts.id),sessionId:text("session_id").notNull().references(()=>authSessions.id),
 kind:text("kind").notNull(),challenge:text("challenge").notNull(),origin:text("origin").notNull(),rpId:text("rp_id").notNull(),createdAt:integer("created_at").notNull(),expiresAt:integer("expires_at").notNull(),consumedAt:integer("consumed_at"),
},t=>[index("passkey_challenges_expiry").on(t.accountId,t.expiresAt)]);
export const platformOwner = sqliteTable("platform_owner", {
 id:integer("id").primaryKey(),accountId:text("account_id").notNull().unique("platform_owner_account_unique").references(()=>liveAccounts.id),boundAt:integer("bound_at").notNull(),bindingSessionId:text("binding_session_id").notNull().references(()=>authSessions.id),
},t=>[check("platform_owner_singleton",sql`${t.id}=1`)]);
export const ownerClaims = sqliteTable("owner_claims", {
 id:text("id").primaryKey(),accountId:text("account_id").notNull().references(()=>liveAccounts.id),sessionId:text("session_id").notNull().references(()=>authSessions.id),codeHash:text("code_hash").notNull().unique("owner_claims_code_unique"),expiresAt:integer("expires_at").notNull(),consumedAt:integer("consumed_at"),createdAt:integer("created_at").notNull(),
});
export const adminAudit = sqliteTable("admin_audit", {
 id:text("id").primaryKey(),actorId:text("actor_id").notNull().references(()=>liveAccounts.id),action:text("action").notNull(),targetType:text("target_type").notNull(),targetId:text("target_id").notNull(),detailJson:text("detail_json").notNull().default("{}"),createdAt:integer("created_at").notNull(),
},t=>[index("admin_audit_created").on(t.createdAt,t.id)]);
export const abuseReports = sqliteTable("abuse_reports", {
 id:text("id").primaryKey(),reporterId:text("reporter_id").notNull().references(()=>liveAccounts.id),targetType:text("target_type").notNull(),targetId:text("target_id").notNull(),reason:text("reason").notNull(),detailText:text("detail_text").notNull().default(""),status:text("status").notNull().default("open"),createdAt:integer("created_at").notNull(),resolvedAt:integer("resolved_at"),resolvedBy:text("resolved_by").references(()=>liveAccounts.id),
},t=>[index("abuse_reports_status_created").on(t.status,t.createdAt)]);
export const accountOrganization = sqliteTable("account_organization", {
 accountId:text("account_id").primaryKey().references(()=>liveAccounts.id),preferences:text("preferences").notNull().default("{}"),updatedAt:integer("updated_at").notNull(),
});
export const organizationFolders = sqliteTable("organization_folders", {
 id:text("id").primaryKey(),accountId:text("account_id").notNull().references(()=>liveAccounts.id),name:text("name").notNull(),position:integer("position").notNull().default(0),createdAt:integer("created_at").notNull(),
},t=>[index("organization_folders_account").on(t.accountId,t.position)]);
export const organizationTargets = sqliteTable("organization_targets", {
 accountId:text("account_id").notNull().references(()=>liveAccounts.id),targetKey:text("target_key").notNull(),kind:text("kind").notNull(),communityId:text("community_id").references(()=>liveCommunities.id),channelId:text("channel_id").references(()=>liveChannels.id),favorite:integer("favorite").notNull().default(0),pinned:integer("pinned").notNull().default(0),archived:integer("archived").notNull().default(0),muted:integer("muted").notNull().default(0),folderId:text("folder_id").references(()=>organizationFolders.id),readSeq:integer("read_seq").notNull().default(0),updatedAt:integer("updated_at").notNull(),
},t=>[primaryKey({columns:[t.accountId,t.targetKey]}),check("organization_targets_kind",sql`${t.kind} IN ('channel','matrix')`)]);
export const communityTimeouts = sqliteTable("community_timeouts", {
 communityId:text("community_id").notNull().references(()=>liveCommunities.id),accountId:text("account_id").notNull().references(()=>liveAccounts.id),expiresAt:integer("expires_at").notNull(),reason:text("reason").notNull().default(""),issuedBy:text("issued_by").notNull().references(()=>liveAccounts.id),createdAt:integer("created_at").notNull(),
},t=>[primaryKey({columns:[t.communityId,t.accountId]}),index("community_timeouts_expiry").on(t.expiresAt)]);
// Each immutable edition records the complete selectable family tables and original model presentation.
export const capsuleEditions = sqliteTable("capsule_editions", {
  id: text("id").primaryKey(), familiesJson: text("families_json").notNull(),
});
export const collectibleCapsules = sqliteTable("collectible_capsules", {
  id: text("id").primaryKey(), accountId: text("account_id").notNull().references(() => liveAccounts.id),
  source: text("source").notNull(), period: text("period").notNull(),
  editionId: text("edition_id").notNull().references(() => capsuleEditions.id), earnedAt: integer("earned_at").notNull(),
}, t => [unique("capsule_entitlement_unique").on(t.accountId,t.source,t.period),index("capsule_account_earned").on(t.accountId,t.earnedAt,t.id),
  check("capsule_source", sql`${t.source} IN ('weekly','welcome')`)]);
export const capsuleStamps = sqliteTable("capsule_stamps", {
  accountId: text("account_id").notNull().references(() => liveAccounts.id), utcDay:text("utc_day").notNull(),
  utcWeek:text("utc_week").notNull(), committedAt:integer("committed_at").notNull(),
  editionId: text("edition_id").notNull().references(() => capsuleEditions.id),
}, t=>[primaryKey({columns:[t.accountId,t.utcDay]}),index("capsule_week_progress").on(t.accountId,t.utcWeek)]);
export const capsuleOpenRequests = sqliteTable("capsule_open_requests", {
  accountId:text("account_id").notNull().references(()=>liveAccounts.id),clientId:text("client_id").notNull(),
  capsuleId:text("capsule_id").notNull().references(()=>collectibleCapsules.id),familyId:text("family_id").notNull(),
},t=>[primaryKey({columns:[t.accountId,t.clientId]})]);
export const capsuleOpenings = sqliteTable("capsule_openings", {
  id:text("id").primaryKey(),capsuleId:text("capsule_id").notNull().unique("capsule_once").references(()=>collectibleCapsules.id),
  instanceId:text("instance_id").notNull().unique("capsule_open_instance"),familyId:text("family_id").notNull(),modelId:text("model_id").notNull(),
  tableVersion:text("table_version").notNull(),snapshot:text("snapshot").notNull(),weight:integer("weight").notNull(),
  totalWeight:integer("total_weight").notNull(),discovery:text("discovery").notNull(),openedAt:integer("opened_at").notNull(),acknowledgedAt:integer("acknowledged_at"),
}, t=>[check("capsule_positive_weight", sql`${t.weight} > 0 AND ${t.weight} <= ${t.totalWeight}`),
  check("capsule_discovery_kind",sql`${t.discovery} IN ('first','additional','returning')`)]);
export const collectibleDiscoveries = sqliteTable("collectible_discoveries", {
  accountId:text("account_id").notNull().references(()=>liveAccounts.id),modelId:text("model_id").notNull(),discoveredAt:integer("discovered_at").notNull(),
},t=>[primaryKey({columns:[t.accountId,t.modelId]})]);

export const giftInstances = sqliteTable("gift_instances", {
 id:text("id").primaryKey(),catalogId:text("catalog_id").notNull(),ownerId:text("owner_id").notNull().references(()=>liveAccounts.id),originGiftId:text("origin_gift_id").unique("gift_instances_origin_unique").references(()=>cosmeticGifts.id),originKind:text("origin_kind").notNull(),createdAt:integer("created_at").notNull(),pendingTransferId:text("pending_transfer_id"),
  ownershipRevision:integer("ownership_revision").notNull().default(0), acquiredAt:integer("acquired_at"),arrivalAcknowledgedAt:integer("arrival_acknowledged_at").default(-1),
  capsuleId:text("capsule_id").unique("gift_instance_capsule_unique").references(()=>collectibleCapsules.id),
},t=>[index("gift_instances_owner").on(t.ownerId,t.createdAt),index("gift_instances_models").on(t.ownerId,t.catalogId,t.acquiredAt,t.id)]);
export const giftTransfers = sqliteTable("gift_transfers", {
 id:text("id").primaryKey(),instanceId:text("instance_id").notNull().references(()=>giftInstances.id),senderId:text("sender_id").notNull().references(()=>liveAccounts.id),recipientId:text("recipient_id").notNull().references(()=>liveAccounts.id),clientId:text("client_id").notNull(),state:text("state").notNull().default("pending"),createdAt:integer("created_at").notNull(),handledAt:integer("handled_at"),
  ownershipRevision:integer("ownership_revision").notNull().default(0), modelSnapshot:text("model_snapshot"),
},t=>[unique("gift_transfers_client_unique").on(t.senderId,t.clientId),index("gift_transfers_recipient").on(t.recipientId,t.state),index("gift_transfers_sender").on(t.senderId,t.createdAt),index("gift_transfer_acquisition").on(t.instanceId,t.recipientId,t.state,t.handledAt)]);
export const giftShowcase = sqliteTable("gift_showcase", {
 accountId:text("account_id").notNull().references(()=>liveAccounts.id),slot:integer("slot").notNull(),instanceId:text("instance_id").notNull().references(()=>giftInstances.id),showSender:integer("show_sender").notNull().default(0),
  featured:integer("featured").notNull().default(0),
},t=>[primaryKey({columns:[t.accountId,t.slot]}),unique("gift_showcase_instance_unique").on(t.accountId,t.instanceId)]);
export const profilePreferences = sqliteTable("profile_preferences", {
 accountId:text("account_id").primaryKey().references(()=>liveAccounts.id),avatarMediaId:text("avatar_media_id").references(()=>mediaAssets.id,{onDelete:"set null"}),bannerMediaId:text("banner_media_id").references(()=>mediaAssets.id,{onDelete:"set null"}),banner:text("banner").notNull().default("midnight"),accent:text("accent").notNull().default("ice"),nameStyle:text("name_style").notNull().default("plain"),profileFrame:text("profile_frame").notNull().default("none"),detailsVisibility:text("details_visibility").notNull().default("shared"),collectionVisibility:text("collection_visibility").notNull().default("shared"),animationEnabled:integer("animation_enabled").notNull().default(0),badgeOrder:text("badge_order").notNull().default("[]"),updatedAt:integer("updated_at").notNull().default(0),
  fullInventoryVisibility:text("full_inventory_visibility").notNull().default("private"),
});
export const badgeDefinitions = sqliteTable("badge_definitions", {
 id:text("id").primaryKey(),name:text("name").notNull(),description:text("description").notNull(),requirement:text("requirement").notNull(),rule:text("rule").notNull(),active:integer("active").notNull().default(1),createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),
});
export const badgeAwards = sqliteTable("badge_awards", {
 id:text("id").primaryKey(),accountId:text("account_id").notNull().references(()=>liveAccounts.id),badgeId:text("badge_id").notNull().references(()=>badgeDefinitions.id),issuerId:text("issuer_id").references(()=>liveAccounts.id),issuedAt:integer("issued_at").notNull(),revokedAt:integer("revoked_at"),reason:text("reason").notNull().default(""),
},t=>[unique("badge_awards_account_badge_unique").on(t.accountId,t.badgeId),index("badge_awards_account_valid").on(t.accountId,t.revokedAt)]);
export const giftCatalog = sqliteTable("gift_catalog", {
 id:text("id").primaryKey(),name:text("name").notNull(),description:text("description").notNull(),active:integer("active").notNull().default(1),updatedBy:text("updated_by").references(()=>liveAccounts.id),updatedAt:integer("updated_at").notNull(),
});

// Explicitly selected standard messaging. These are access-controlled server
// records; they are never advertised as end-to-end encrypted Matrix rooms.
export const nativeConversations = sqliteTable("native_conversations", {
 id:text("id").primaryKey(),kind:text("kind").notNull(),name:text("name").notNull().default(""),securityMode:text("security_mode").notNull().default("standard"),
 ownerId:text("owner_id").references(()=>liveAccounts.id),createdBy:text("created_by").notNull().references(()=>liveAccounts.id),clientId:text("client_id").notNull(),requestHash:text("request_hash").notNull(),pairKey:text("pair_key").unique("native_conversations_pair_unique"),createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),
},t=>[unique("native_conversations_creator_client_unique").on(t.createdBy,t.clientId),check("native_conversations_kind",sql`${t.kind} IN ('dm','group')`),check("native_conversations_security",sql`${t.securityMode}='standard'`)]);
export const nativeMembers = sqliteTable("native_members", {
 conversationId:text("conversation_id").notNull().references(()=>nativeConversations.id),accountId:text("account_id").notNull().references(()=>liveAccounts.id),joinedAt:integer("joined_at").notNull(),readSeq:integer("read_seq").notNull().default(0),readChangeSeq:integer("read_change_seq").notNull().default(0),
},t=>[primaryKey({columns:[t.conversationId,t.accountId]}),index("native_members_account").on(t.accountId,t.conversationId)]);
export const nativeMessages = sqliteTable("native_messages", {
 revision:integer("revision").notNull().default(0),
 seq:integer("seq").primaryKey({autoIncrement:true}),id:text("id").notNull().unique("native_messages_id_unique"),conversationId:text("conversation_id").notNull().references(()=>nativeConversations.id),authorId:text("author_id").notNull().references(()=>liveAccounts.id),clientId:text("client_id").notNull(),text:text("text").notNull(),replyToId:text("reply_to_id"),originalHash:text("original_hash").notNull(),editedAt:integer("edited_at"),deletedAt:integer("deleted_at"),createdAt:integer("created_at").notNull(),
},t=>[unique("native_messages_retry_unique").on(t.conversationId,t.authorId,t.clientId),index("native_messages_conversation_seq").on(t.conversationId,t.seq),index("native_messages_author_conversation_seq").on(t.authorId,t.conversationId,t.seq),index("native_messages_reply").on(t.replyToId)]);
export const nativeReactions = sqliteTable("native_reactions", {
 messageId:text("message_id").notNull().references(()=>nativeMessages.id),accountId:text("account_id").notNull().references(()=>liveAccounts.id),emoji:text("emoji").notNull(),createdAt:integer("created_at").notNull(),
},t=>[primaryKey({columns:[t.messageId,t.accountId,t.emoji]})]);
export const nativeChanges = sqliteTable("native_changes", {
 seq:integer("seq").primaryKey({autoIncrement:true}),conversationId:text("conversation_id").notNull().references(()=>nativeConversations.id),messageId:text("message_id").notNull().references(()=>nativeMessages.id),actorId:text("actor_id").notNull().references(()=>liveAccounts.id),kind:text("kind").notNull(),createdAt:integer("created_at").notNull(),
},t=>[index("native_changes_conversation_seq").on(t.conversationId,t.seq)]);
export const nativeConversationPreferences = sqliteTable("native_conversation_preferences", {
 accountId:text("account_id").notNull().references(()=>liveAccounts.id),conversationId:text("conversation_id").notNull().references(()=>nativeConversations.id),favorite:integer("favorite").notNull().default(0),pinned:integer("pinned").notNull().default(0),archived:integer("archived").notNull().default(0),muted:integer("muted").notNull().default(0),folderId:text("folder_id").references(()=>organizationFolders.id,{onDelete:"set null"}),readSeq:integer("read_seq").notNull().default(0),updatedAt:integer("updated_at").notNull(),
},t=>[primaryKey({columns:[t.accountId,t.conversationId]})]);


// Stable account-bound list snapshots contain routing IDs only, never message text.
export const nativeListSnapshots = sqliteTable("native_list_snapshots", {
 id:text("id").primaryKey(),accountId:text("account_id").notNull().references(()=>liveAccounts.id,{onDelete:"cascade"}),filter:text("filter").notNull(),createdAt:integer("created_at").notNull(),expiresAt:integer("expires_at").notNull(),
},t=>[index("native_list_snapshots_expiry").on(t.expiresAt),index("native_list_snapshots_account").on(t.accountId,t.createdAt)]);
export const nativeListItems = sqliteTable("native_list_items", {
 snapshotId:text("snapshot_id").notNull().references(()=>nativeListSnapshots.id,{onDelete:"cascade"}),conversationId:text("conversation_id").notNull().references(()=>nativeConversations.id,{onDelete:"cascade"}),position:integer("position").notNull(),
},t=>[primaryKey({columns:[t.snapshotId,t.position]}),unique("native_list_items_snapshot_conversation").on(t.snapshotId,t.conversationId)]);
export const nativeBookmarks = sqliteTable("native_bookmarks", {
 accountId:text("account_id").notNull().references(()=>liveAccounts.id,{onDelete:"cascade"}),messageId:text("message_id").notNull().references(()=>nativeMessages.id,{onDelete:"cascade"}),saved:integer("saved").notNull().default(1),revision:integer("revision").notNull().default(1),createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),
},t=>[primaryKey({columns:[t.accountId,t.messageId]}),index("native_bookmarks_account_time").on(t.accountId,t.createdAt)]);
export const liveMessageMentions = sqliteTable("live_message_mentions", {
 messageId:text("message_id").notNull().references(()=>liveMessages.id,{onDelete:"cascade"}),accountId:text("account_id").notNull().references(()=>liveAccounts.id),createdAt:integer("created_at").notNull(),
},t=>[primaryKey({columns:[t.messageId,t.accountId]}),index("live_message_mentions_account").on(t.accountId,t.messageId)]);
export const matrixAccountLinks = sqliteTable("matrix_account_links", {
 accountId:text("account_id").primaryKey().references(()=>liveAccounts.id),matrixUserId:text("matrix_user_id").notNull().unique("matrix_account_links_user_unique"),matrixSubject:text("matrix_subject").notNull().unique("matrix_account_links_subject_unique"),homeserverOrigin:text("homeserver_origin").notNull(),verifiedAt:integer("verified_at"),createdAt:integer("created_at").notNull(),
});
export const matrixEnrollmentIssues = sqliteTable("matrix_enrollment_issues", {
 jti:text("jti").primaryKey(),accountId:text("account_id").notNull().references(()=>liveAccounts.id),sessionId:text("session_id").notNull().references(()=>authSessions.id,{onDelete:"cascade"}),state:text("state").notNull().default("pending"),matrixDeviceId:text("matrix_device_id"),completedAt:integer("completed_at"),expiresAt:integer("expires_at").notNull(),createdAt:integer("created_at").notNull(),
},t=>[index("matrix_enrollment_issues_account").on(t.accountId,t.createdAt),index("matrix_enrollment_issues_expiry").on(t.expiresAt)]);

export const pushSubscriptions = sqliteTable("push_subscriptions", {
 id:text("id").primaryKey(),accountId:text("account_id").notNull().references(()=>liveAccounts.id),sessionId:text("session_id").notNull().references(()=>authSessions.id),endpoint:text("endpoint").notNull().unique("push_subscriptions_endpoint_unique"),keysJson:text("keys_json").notNull(),createdAt:integer("created_at").notNull(),lastUsedAt:integer("last_used_at").notNull(),
},t=>[index("push_subscriptions_account").on(t.accountId,t.sessionId)]);
export const notificationEvents = sqliteTable("notification_events", {
 seq:integer("seq").primaryKey({autoIncrement:true}),kind:text("kind").notNull(),sourceId:text("source_id").notNull(),actorId:text("actor_id").notNull().references(()=>liveAccounts.id),communityId:text("community_id").references(()=>liveCommunities.id),conversationId:text("conversation_id").references(()=>nativeConversations.id),createdAt:integer("created_at").notNull(),processedAt:integer("processed_at").notNull().default(0),
},t=>[unique("notification_events_source_unique").on(t.kind,t.sourceId),index("notification_events_created").on(t.createdAt,t.seq)]);
export const pushDeliveries = sqliteTable("push_deliveries", {
 eventSeq:integer("event_seq").notNull().references(()=>notificationEvents.seq,{onDelete:"cascade"}),subscriptionId:text("subscription_id").notNull().references(()=>pushSubscriptions.id,{onDelete:"cascade"}),state:text("state").notNull(),attempts:integer("attempts").notNull().default(0),nextAttemptAt:integer("next_attempt_at").notNull().default(0),claimedAt:integer("claimed_at").notNull().default(0),updatedAt:integer("updated_at").notNull(),
},t=>[primaryKey({columns:[t.eventSeq,t.subscriptionId]}),check("push_deliveries_state",sql`${t.state} IN ('pending','sending','sent','retry','failed')`),index("push_deliveries_due").on(t.state,t.nextAttemptAt)]);

// Content-free revision hints. Rows are created by new mutations, never by a data migration.
export const accountRevisions = sqliteTable("account_revisions", {
 accountId:text("account_id").primaryKey().references(()=>liveAccounts.id,{onDelete:"cascade"}),revision:integer("revision").notNull().default(0),updatedAt:integer("updated_at").notNull().default(0),
});
export const realtimeStreams = sqliteTable("realtime_streams", {
 id:text("id").primaryKey(),accountId:text("account_id").notNull().references(()=>liveAccounts.id,{onDelete:"cascade"}),sessionId:text("session_id").notNull().references(()=>authSessions.id,{onDelete:"cascade"}),expiresAt:integer("expires_at").notNull(),createdAt:integer("created_at").notNull(),
},t=>[index("realtime_streams_account_expiry").on(t.accountId,t.expiresAt),index("realtime_streams_expiry").on(t.expiresAt)]);
export const mediaAssets = sqliteTable("media_assets", {
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull().references(()=>liveAccounts.id,{onDelete:"cascade"}),clientId:text("client_id").notNull(),objectKey:text("object_key").notNull().unique("media_assets_object_unique"),sha256:text("sha256").notNull(),kind:text("kind").notNull(),contentType:text("content_type").notNull(),bytes:integer("bytes").notNull(),width:integer("width"),height:integer("height"),filename:text("filename").notNull().default(""),conversationId:text("conversation_id").references(()=>nativeConversations.id,{onDelete:"cascade"}),channelId:text("channel_id").references(()=>liveChannels.id,{onDelete:"cascade"}),nativeMessageId:text("native_message_id").references(()=>nativeMessages.id,{onDelete:"cascade"}),liveMessageId:text("live_message_id").references(()=>liveMessages.id,{onDelete:"cascade"}),messagePosition:integer("message_position").notNull().default(0),state:text("state").notNull().default("staged"),expiresAt:integer("expires_at"),createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),
},t=>[unique("media_assets_owner_client_unique").on(t.ownerId,t.clientId),index("media_assets_owner_time").on(t.ownerId,t.createdAt),index("media_assets_native_message").on(t.nativeMessageId),index("media_assets_live_message").on(t.liveMessageId),index("media_assets_expiry").on(t.state,t.expiresAt),check("media_assets_kind",sql`${t.kind} IN ('avatar','banner','attachment','voice')`),check("media_assets_state",sql`${t.state} IN ('uploading','staged','ready','attached','deleting')`),check("media_assets_scope",sql`${t.conversationId} IS NULL OR ${t.channelId} IS NULL`),check("media_assets_message_scope",sql`${t.nativeMessageId} IS NULL OR ${t.liveMessageId} IS NULL`),check("media_assets_bytes",sql`${t.bytes}>0 AND ${t.bytes}<=8388608`)]);
// No foreign key on cleanup ownership: deletion work must survive account removal.
export const mediaCleanup = sqliteTable("media_cleanup", {
 id:text("id").primaryKey(),objectKey:text("object_key").notNull().unique("media_cleanup_object_unique"),ownerId:text("owner_id"),notBefore:integer("not_before").notNull(),attempts:integer("attempts").notNull().default(0),createdAt:integer("created_at").notNull(),
},t=>[index("media_cleanup_due").on(t.notBefore)]);
export const matrixPolicyOperations = sqliteTable("matrix_policy_operations", {
 id:text("id").primaryKey(),accountId:text("account_id").notNull().references(()=>liveAccounts.id),kind:text("kind").notNull(),subjectId:text("subject_id"),idempotencyKey:text("idempotency_key").notNull().unique("matrix_policy_operations_idempotency_unique"),status:text("status").notNull().default("pending"),attemptCount:integer("attempt_count").notNull().default(0),nextAttemptAt:integer("next_attempt_at").notNull().default(0),leaseUntil:integer("lease_until"),lastError:text("last_error"),requestedBy:text("requested_by").references(()=>liveAccounts.id),createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),completedAt:integer("completed_at"),
},t=>[index("matrix_policy_operations_due").on(t.status,t.nextAttemptAt),index("matrix_policy_operations_account").on(t.accountId,t.createdAt),check("matrix_policy_operations_kind",sql`${t.kind} IN ('suspend','reinstate','delete','logout_all','logout_session','device_revoke')`),check("matrix_policy_operations_status",sql`${t.status} IN ('pending','running','retry','done','blocked')`)]);

// Private organization references existing instances; membership never confers ownership.
export const giftCollections = sqliteTable("gift_collections", {
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull().references(()=>liveAccounts.id,{onDelete:"cascade"}),name:text("name").notNull(),normalizedName:text("normalized_name").notNull(),clientId:text("client_id").notNull(),revision:integer("revision").notNull().default(0),changeMarker:text("change_marker").notNull().default(""),createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),
},t=>[unique("gift_collections_owner_name_unique").on(t.ownerId,t.normalizedName),unique("gift_collections_owner_client_unique").on(t.ownerId,t.clientId),index("gift_collections_owner_updated").on(t.ownerId,t.updatedAt),check("gift_collections_name_length",sql`length(trim(${t.name})) BETWEEN 1 AND 40`),check("gift_collections_revision",sql`${t.revision}>=0`)]);
export const giftCollectionItems = sqliteTable("gift_collection_items", {
 collectionId:text("collection_id").notNull().references(()=>giftCollections.id,{onDelete:"cascade"}),instanceId:text("instance_id").notNull().references(()=>giftInstances.id,{onDelete:"cascade"}),position:integer("position").notNull().default(0),addedAt:integer("added_at").notNull(),
},t=>[primaryKey({columns:[t.collectionId,t.instanceId]}),index("gift_collection_items_instance").on(t.instanceId),check("gift_collection_items_position",sql`${t.position}>=0`)]);
export const profileSavedLooks = sqliteTable("profile_saved_looks", {
 accountId:text("account_id").notNull().references(()=>liveAccounts.id,{onDelete:"cascade"}),name:text("name").notNull(),avatar:text("avatar").notNull(),banner:text("banner").notNull(),accent:text("accent").notNull(),nameStyle:text("name_style").notNull().default("plain"),profileFrame:text("profile_frame").notNull().default("none"),
},t=>[primaryKey({columns:[t.accountId,t.name]})]);
export const profileSaveState = sqliteTable("profile_save_state", {
 accountId:text("account_id").primaryKey().references(()=>liveAccounts.id,{onDelete:"cascade"}),revision:integer("revision").notNull().default(0),writeToken:text("write_token").notNull().default(""),
},t=>[check("profile_save_state_revision",sql`${t.revision}>=0`)]);
