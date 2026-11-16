-- Schema-only input for the future Sites-managed D1 migration pipeline.
-- Do not execute schema creation inside request handlers.
PRAGMA foreign_keys = ON;

CREATE TABLE live_accounts (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE live_communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES live_accounts(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE live_memberships (
  community_id TEXT NOT NULL REFERENCES live_communities(id),
  account_id TEXT NOT NULL REFERENCES live_accounts(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (community_id, account_id)
);

CREATE TABLE live_channels (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL REFERENCES live_communities(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'announcement')),
  created_at INTEGER NOT NULL,
  UNIQUE (community_id, name)
);

CREATE TABLE live_invites (
  token_hash TEXT PRIMARY KEY,
  community_id TEXT NOT NULL REFERENCES live_communities(id),
  created_by TEXT NOT NULL REFERENCES live_accounts(id),
  expires_at INTEGER NOT NULL,
  max_uses INTEGER NOT NULL CHECK (max_uses BETWEEN 1 AND 100),
  uses INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE live_messages (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  channel_id TEXT NOT NULL REFERENCES live_channels(id),
  author_id TEXT NOT NULL REFERENCES live_accounts(id),
  client_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (channel_id, author_id, client_id)
);

CREATE INDEX live_messages_channel_seq ON live_messages(channel_id, seq);
CREATE INDEX live_memberships_account ON live_memberships(account_id, community_id);
CREATE INDEX live_channels_community ON live_channels(community_id, created_at);
