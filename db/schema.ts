import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// This schema preserves backend/schema.sql. Schema changes are generated with
// npm run db:generate and applied by Sites before the Worker is published.
export const liveAccounts = sqliteTable("live_accounts", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const liveCommunities = sqliteTable("live_communities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
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
  createdAt: integer("created_at").notNull(),
}, (table) => [
  unique("live_messages_channel_author_client_unique").on(table.channelId, table.authorId, table.clientId),
  index("live_messages_channel_seq").on(table.channelId, table.seq),
]);
