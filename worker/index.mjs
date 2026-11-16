/**
 * Authenticated text-chat vertical slice for Sites Workers + D1.
 * This is integration source, not the deployed static client's entrypoint.
 * Identity headers are trusted only behind the Sites dispatch boundary.
 */

const PREFIX = '/api/live';
const MAX_BODY = 16 * 1024;
const uuid = () => crypto.randomUUID();
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  },
});

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requireThat(condition, status, code, message) {
  if (!condition) throw new ApiError(status, code, message);
}

function identity(request) {
  const id = request.headers.get('oai-authenticated-user-id');
  requireThat(id && id.length <= 256, 401, 'sign_in_required', 'Sign in with ChatGPT to continue.');
  const email = request.headers.get('oai-authenticated-user-email') || '';
  let name = request.headers.get('oai-authenticated-user-full-name') || '';
  if (request.headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8') {
    try { name = decodeURIComponent(name); } catch { name = ''; }
  }
  return {id, email: email.slice(0, 320), name: (name || email.split('@')[0] || 'Resident').slice(0, 80)};
}

async function bodyJSON(request) {
  requireThat(request.headers.get('content-type')?.split(';')[0].trim() === 'application/json',
    415, 'json_required', 'Send an application/json request.');
  const declared = Number(request.headers.get('content-length') || 0);
  requireThat(declared <= MAX_BODY, 413, 'body_too_large', 'The request is too large.');
  const reader = request.body?.getReader();
  requireThat(reader, 400, 'body_required', 'A JSON body is required.');
  let size = 0;
  const chunks = [];
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      throw new ApiError(413, 'body_too_large', 'The request is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let data;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch {
    throw new ApiError(400, 'invalid_json', 'The JSON body could not be read.');
  }
  requireThat(data && typeof data === 'object' && !Array.isArray(data), 400, 'invalid_body', 'Use a JSON object.');
  return data;
}

function nameValue(value, maximum = 64) {
  requireThat(typeof value === 'string', 400, 'invalid_name', 'A name is required.');
  const name = value.trim();
  requireThat(name.length > 0 && name.length <= maximum, 400, 'invalid_name', `Use a name between 1 and ${maximum} characters.`);
  return name;
}

function cursorValue(value) {
  if (value == null) return null;
  requireThat(/^\d+$/.test(value) && Number.isSafeInteger(Number(value)), 400, 'invalid_cursor', 'Use a nonnegative integer cursor.');
  return Number(value);
}

async function tokenHash(token) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
}

function query(db, sql, ...values) { return db.prepare(sql).bind(...values); }

async function membership(db, communityId, userId) {
  const member = await query(db,
    'SELECT role FROM live_memberships WHERE community_id = ? AND account_id = ?', communityId, userId).first();
  requireThat(member, 403, 'membership_required', 'You do not have access to this community.');
  return member;
}

async function requireOwner(db, communityId, userId) {
  const member = await membership(db, communityId, userId);
  requireThat(member.role === 'owner', 403, 'owner_required', 'Only the community owner can perform this action.');
}

async function accessibleChannel(db, channelId, userId) {
  const channel = await query(db,
    `SELECT c.id, c.community_id, c.name, c.kind, m.role
       FROM live_channels c JOIN live_memberships m ON m.community_id = c.community_id
      WHERE c.id = ? AND m.account_id = ?`, channelId, userId).first();
  requireThat(channel, 403, 'channel_access_denied', 'You do not have access to this channel.');
  return channel;
}

const messageColumns = `m.seq, m.id, m.channel_id, m.author_id, a.display_name AS author_name,
                        m.client_id, m.text, m.created_at`;

export async function handleLiveRequest(request, env) {
  try {
    const url = new URL(request.url);
    requireThat(url.pathname.startsWith(PREFIX + '/') || url.pathname === PREFIX,
      404, 'not_found', 'No API route matches this request.');
    requireThat(['GET', 'POST'].includes(request.method), 405, 'method_not_allowed', 'This method is not supported.');
    if (request.method === 'POST') {
      const origin = request.headers.get('origin');
      requireThat(!origin || origin === url.origin, 403, 'origin_denied', 'Use this Site to submit changes.');
    }
    const user = identity(request);
    requireThat(env?.DB?.prepare && env.DB.batch, 503, 'backend_not_configured', 'Durable messaging is not configured for this deployment.');
    const db = env.DB;
    const now = Date.now();
    await query(db,
      `INSERT INTO live_accounts (id, display_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name, email = excluded.email, updated_at = excluded.updated_at`,
      user.id, user.name, user.email, now, now).run();
    const path = url.pathname.slice(PREFIX.length).split('/').filter(Boolean).map(decodeURIComponent);

    if (path.length === 1 && path[0] === 'me' && request.method === 'GET') {
      return json({account: {id: user.id, displayName: user.name}, transport: 'cursor-polling'});
    }

    if (path.length === 1 && path[0] === 'communities') {
      if (request.method === 'GET') {
        const result = await query(db,
          `SELECT c.id, c.name, c.created_at, m.role FROM live_communities c
           JOIN live_memberships m ON m.community_id = c.id WHERE m.account_id = ?
           ORDER BY c.created_at, c.id`, user.id).all();
        return json({communities: result.results});
      }
      const body = await bodyJSON(request);
      const name = nameValue(body.name);
      const communityId = uuid(), channelId = uuid();
      await db.batch([
        query(db, 'INSERT INTO live_communities (id, name, created_by, created_at) VALUES (?, ?, ?, ?)', communityId, name, user.id, now),
        query(db, 'INSERT INTO live_memberships (community_id, account_id, role, joined_at) VALUES (?, ?, ?, ?)', communityId, user.id, 'owner', now),
        query(db, 'INSERT INTO live_channels (id, community_id, name, kind, created_at) VALUES (?, ?, ?, ?, ?)', channelId, communityId, 'general', 'text', now),
      ]);
      return json({community: {id: communityId, name, role: 'owner'}, channel: {id: channelId, name: 'general', kind: 'text'}}, 201);
    }

    if (path.length === 3 && path[0] === 'communities' && path[2] === 'channels') {
      const communityId = path[1];
      if (request.method === 'GET') {
        await membership(db, communityId, user.id);
        const channels = await query(db, 'SELECT id, name, kind, created_at FROM live_channels WHERE community_id = ? ORDER BY created_at, id', communityId).all();
        return json({channels: channels.results});
      }
      await requireOwner(db, communityId, user.id);
      const body = await bodyJSON(request);
      const name = nameValue(body.name, 32).toLowerCase();
      requireThat(/^[a-z0-9][a-z0-9-]*$/.test(name), 400, 'invalid_channel', 'Use letters, digits, and hyphens for the channel name.');
      const kind = body.kind || 'text';
      requireThat(['text', 'announcement'].includes(kind), 400, 'invalid_kind', 'Choose text or announcement.');
      const exists = await query(db, 'SELECT id FROM live_channels WHERE community_id = ? AND name = ?', communityId, name).first();
      requireThat(!exists, 409, 'channel_exists', 'A channel already uses this name.');
      const id = uuid();
      await query(db, 'INSERT INTO live_channels (id, community_id, name, kind, created_at) VALUES (?, ?, ?, ?, ?)', id, communityId, name, kind, now).run();
      return json({channel: {id, name, kind}}, 201);
    }

    if (path.length === 3 && path[0] === 'communities' && path[2] === 'invites' && request.method === 'POST') {
      const communityId = path[1];
      await requireOwner(db, communityId, user.id);
      const body = await bodyJSON(request);
      const maxUses = body.maxUses ?? 1;
      requireThat(Number.isInteger(maxUses) && maxUses >= 1 && maxUses <= 100, 400, 'invalid_uses', 'Invite uses must be between 1 and 100.');
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const token = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
      const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
      await query(db, 'INSERT INTO live_invites (token_hash, community_id, created_by, expires_at, max_uses, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        await tokenHash(token), communityId, user.id, expiresAt, maxUses, now).run();
      return json({invite: {token, communityId, expiresAt, maxUses}}, 201);
    }

    if (path.length === 2 && path[0] === 'invites' && path[1] === 'claim' && request.method === 'POST') {
      const body = await bodyJSON(request);
      requireThat(typeof body.token === 'string' && /^[a-f0-9]{64}$/.test(body.token), 400, 'invalid_invite', 'Use a valid invitation token.');
      const hash = await tokenHash(body.token);
      const invite = await query(db, 'SELECT community_id, expires_at, max_uses, uses FROM live_invites WHERE token_hash = ?', hash).first();
      requireThat(invite && invite.expires_at > now, 403, 'invite_unavailable', 'This invitation is unavailable.');
      const existing = await query(db, 'SELECT role FROM live_memberships WHERE community_id = ? AND account_id = ?', invite.community_id, user.id).first();
      if (!existing) {
        await db.batch([
          query(db, `INSERT OR IGNORE INTO live_memberships (community_id, account_id, role, joined_at)
                     SELECT community_id, ?, 'member', ? FROM live_invites
                      WHERE token_hash = ? AND expires_at > ? AND uses < max_uses`, user.id, now, hash, now),
          query(db, 'UPDATE live_invites SET uses = uses + 1 WHERE token_hash = ? AND changes() > 0', hash),
        ]);
      }
      const member = await query(db, 'SELECT role FROM live_memberships WHERE community_id = ? AND account_id = ?', invite.community_id, user.id).first();
      requireThat(member, 403, 'invite_unavailable', 'This invitation is unavailable.');
      return json({membership: {communityId: invite.community_id, role: member.role}});
    }

    if (path.length === 3 && path[0] === 'channels' && path[2] === 'messages') {
      const channelId = path[1];
      const channel = await accessibleChannel(db, channelId, user.id);
      if (request.method === 'GET') {
        const before = cursorValue(url.searchParams.get('before'));
        const after = cursorValue(url.searchParams.get('after'));
        requireThat(before === null || after === null, 400, 'invalid_cursor', 'Use before or after, not both.');
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
        requireThat(Number.isInteger(limit), 400, 'invalid_limit', 'Use an integer page size.');
        const ascending = after !== null;
        const direction = ascending ? 'ASC' : 'DESC';
        const condition = after !== null ? 'AND m.seq > ?' : before !== null ? 'AND m.seq < ?' : '';
        const binds = [channelId, ...(after !== null ? [after] : before !== null ? [before] : []), limit + 1];
        const result = await query(db,
          `SELECT ${messageColumns} FROM live_messages m JOIN live_accounts a ON a.id = m.author_id
            WHERE m.channel_id = ? ${condition} ORDER BY m.seq ${direction} LIMIT ?`, ...binds).all();
        const hasMore = result.results.length > limit;
        const page = result.results.slice(0, limit);
        const messages = ascending ? page : page.reverse();
        return json({messages, page: {hasMore, before: messages[0]?.seq ?? before ?? null, after: messages.at(-1)?.seq ?? after ?? 0}});
      }
      requireThat(channel.kind !== 'announcement' || ['owner', 'moderator'].includes(channel.role),
        403, 'posting_denied', 'Only community staff can post announcements.');
      const body = await bodyJSON(request);
      requireThat(typeof body.clientId === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(body.clientId), 400, 'invalid_client_id', 'Use a stable client-generated ID for retry deduplication.');
      requireThat(typeof body.text === 'string' && body.text.trim().length > 0 && body.text.length <= 4000,
        400, 'invalid_text', 'Write a message between 1 and 4000 characters.');
      const text = body.text.trim();
      await query(db,
        'INSERT OR IGNORE INTO live_messages (id, channel_id, author_id, client_id, text, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        uuid(), channelId, user.id, body.clientId, text, now).run();
      const message = await query(db,
        `SELECT ${messageColumns} FROM live_messages m JOIN live_accounts a ON a.id = m.author_id
          WHERE m.channel_id = ? AND m.author_id = ? AND m.client_id = ?`, channelId, user.id, body.clientId).first();
      requireThat(message && message.text === text, 409, 'idempotency_conflict', 'This retry ID already belongs to a different message.');
      return json({message, acknowledged: true});
    }

    throw new ApiError(404, 'not_found', 'No API route matches this request.');
  } catch (error) {
    if (error instanceof ApiError) return json({error: {code: error.code, message: error.message}}, error.status);
    return json({error: {code: 'server_error', message: 'The request could not be committed. Retry with the same client message ID.'}}, 500);
  }
}

export default {fetch: handleLiveRequest};
