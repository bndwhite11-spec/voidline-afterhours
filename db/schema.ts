import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

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
export const giftInstances = sqliteTable("gift_instances", {
 id:text("id").primaryKey(),catalogId:text("catalog_id").notNull(),ownerId:text("owner_id").notNull().references(()=>liveAccounts.id),originGiftId:text("origin_gift_id").unique("gift_instances_origin_unique").references(()=>cosmeticGifts.id),originKind:text("origin_kind").notNull(),createdAt:integer("created_at").notNull(),pendingTransferId:text("pending_transfer_id"),
},t=>[index("gift_instances_owner").on(t.ownerId,t.createdAt)]);
export const giftTransfers = sqliteTable("gift_transfers", {
 id:text("id").primaryKey(),instanceId:text("instance_id").notNull().references(()=>giftInstances.id),senderId:text("sender_id").notNull().references(()=>liveAccounts.id),recipientId:text("recipient_id").notNull().references(()=>liveAccounts.id),clientId:text("client_id").notNull(),state:text("state").notNull().default("pending"),createdAt:integer("created_at").notNull(),handledAt:integer("handled_at"),
},t=>[unique("gift_transfers_client_unique").on(t.senderId,t.clientId),index("gift_transfers_recipient").on(t.recipientId,t.state),index("gift_transfers_sender").on(t.senderId,t.createdAt)]);
export const giftShowcase = sqliteTable("gift_showcase", {
 accountId:text("account_id").notNull().references(()=>liveAccounts.id),slot:integer("slot").notNull(),instanceId:text("instance_id").notNull().references(()=>giftInstances.id),showSender:integer("show_sender").notNull().default(0),
},t=>[primaryKey({columns:[t.accountId,t.slot]}),unique("gift_showcase_instance_unique").on(t.accountId,t.instanceId)]);
export const profilePreferences = sqliteTable("profile_preferences", {
 accountId:text("account_id").primaryKey().references(()=>liveAccounts.id),banner:text("banner").notNull().default("midnight"),accent:text("accent").notNull().default("ice"),detailsVisibility:text("details_visibility").notNull().default("shared"),collectionVisibility:text("collection_visibility").notNull().default("shared"),animationEnabled:integer("animation_enabled").notNull().default(0),badgeOrder:text("badge_order").notNull().default("[]"),updatedAt:integer("updated_at").notNull().default(0),
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
