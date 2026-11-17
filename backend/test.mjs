import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.mjs';

// SQLite adapter exercises actual SQL and atomic batches, not SQL-string stubs.
class LocalD1 {
  constructor(database) { this.database = database; this.failWrites = false; }
  prepare(sql) {
    const database = this.database, owner = this;
    return {bind(...values) {
      const statement = database.prepare(sql);
      return {
        async first() { return statement.get(...values) || null; },
        async all() { return {results: statement.all(...values)}; },
        async run() {
          if (owner.failWrites) throw new Error('Forced database failure');
          const result = statement.run(...values);
          return {success: true, meta: {changes: result.changes}};
        },
      };
    }};
  }
  async batch(statements) {
    this.database.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
const db = new LocalD1(sqlite);
const env = {DB: db};
const users = {
  owner: {id: 'account-owner', email: 'owner@example.test', name: 'Owner'},
  member: {id: 'account-member', email: 'member@example.test', name: 'Member'},
  stranger: {id: 'account-stranger', email: 'stranger@example.test', name: 'Stranger'},
};
async function call(user, path, {method = 'GET', body, headers = {}, environment = env} = {}) {
  const who = typeof user === 'string' ? users[user] : user;
  const h = {...headers};
  if (who) {
    h['oai-authenticated-user-id'] = who.id;
    h['oai-authenticated-user-email'] = who.email;
    h['oai-authenticated-user-full-name'] = encodeURIComponent(who.name);
    h['oai-authenticated-user-full-name-encoding'] = 'percent-encoded-utf-8';
  }
  if (body !== undefined && !h['content-type']) h['content-type'] = 'application/json';
  const response = await worker.fetch(new Request('https://voidline.test/api/live' + path, {
    method, headers: h, body: body === undefined ? undefined : JSON.stringify(body),
  }), environment);
  return {status: response.status, data: await response.json(), headers: response.headers};
}
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
let community, channel, invite, announcements;

test('identity and configured durable storage are required', async () => {
  assert.equal((await call(null, '/me')).status, 401);
  assert.equal((await call('owner', '/me', {environment: {}})).status, 503);
  const response = await call('owner', '/me');
  assert.equal(response.status, 200);
  assert.equal(response.data.account.id, users.owner.id);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('health is public but account identity stays private until sign-in', async () => {
  const health = await call(null, '/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.available, true);
  assert.equal(JSON.stringify(health.data).includes('@'), false);
  assert.equal((await call(null, '/profile', {method: 'POST', body: {displayName: 'Pretender'}})).status, 401);
});

test('residents choose a public alias without exposing their sign-in name or email', async () => {
  const initial = await call('owner', '/me');
  assert.equal(initial.data.account.displayName, 'New resident');
  assert.equal(initial.data.account.needsProfile, true);
  const saved = await call('owner', '/profile', {method: 'POST', body: {displayName: 'night.window'}});
  assert.equal(saved.data.account.displayName, 'night.window');
  assert.equal((await call('owner', '/me')).data.account.displayName, 'night.window');
  assert.equal((await call('owner', '/profile', {method: 'POST', body: {displayName: 'x'}})).status, 400);
  assert.equal(JSON.stringify(saved.data).includes(users.owner.email), false);
});

test('owner creates one atomic community, membership, and channel', async () => {
  const response = await call('owner', '/communities', {method: 'POST', body: {name: 'The shared studio'}});
  assert.equal(response.status, 201);
  community = response.data.community;
  channel = response.data.channel;
  assert.equal(community.role, 'owner');
  const list = await call('owner', '/communities');
  assert.equal(list.data.communities.length, 1);
  assert.equal(list.data.communities[0].id, community.id);
  assert.equal((await call('stranger', '/communities')).data.communities.length, 0);
});

test('nonmembers cannot read channels, histories, or send', async () => {
  assert.equal((await call('member', `/communities/${community.id}/channels`)).status, 403);
  assert.equal((await call('member', `/channels/${channel.id}/messages`)).status, 403);
  assert.equal((await call('member', `/channels/${channel.id}/messages`, {method: 'POST', body: {clientId: 'denied-0001', text: 'not allowed'}})).status, 403);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n, 0);
});

test('account changes cannot publish a previous account’s draft or mutate its profile', async () => {
  const text = 'This draft belongs to a different signed-in account.';
  const before = sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n;
  const send = await call('owner', `/channels/${channel.id}/messages`, {method: 'POST', body: {
    expectedAccountId: users.member.id, clientId: 'account-race-001', text,
  }});
  assert.equal(send.status, 409);
  assert.equal(send.data.error.code, 'account_changed');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n, before);
  const profile = await call('owner', '/profile', {method: 'POST', body: {
    expectedAccountId: users.member.id, displayName: 'Wrong account alias',
  }});
  assert.equal(profile.status, 409);
  assert.equal((await call('owner', '/me')).data.account.displayName, 'night.window');
  const created = await call('owner', '/communities', {method: 'POST', body: {
    expectedAccountId: users.member.id, name: 'Wrong account community',
  }});
  assert.equal(created.status, 409);
  assert.equal((await call('owner', '/communities')).data.communities.length, 1);
});

test('member directory requires membership and exposes only public profile fields', async () => {
  assert.equal((await call('member', `/communities/${community.id}/members`)).status, 403);
  const directory = await call('owner', `/communities/${community.id}/members`);
  assert.equal(directory.status, 200);
  assert.equal(directory.data.members[0].display_name, 'night.window');
  assert.equal('email' in directory.data.members[0], false);
});

test('only owners issue hashed, expiring, bounded-use invites', async () => {
  assert.equal((await call('stranger', `/communities/${community.id}/invites`, {method: 'POST', body: {}})).status, 403);
  const response = await call('owner', `/communities/${community.id}/invites`, {method: 'POST', body: {maxUses: 1}});
  assert.equal(response.status, 201);
  invite = response.data.invite;
  assert.match(invite.token, /^[a-f0-9]{64}$/);
  const stored = sqlite.prepare('SELECT token_hash, uses, expires_at FROM live_invites').get();
  assert.notEqual(stored.token_hash, invite.token);
  assert.equal(stored.uses, 0);
  assert.ok(stored.expires_at > Date.now());
});

test('claim establishes membership atomically and repeat claim is idempotent', async () => {
  const claim = () => call('member', '/invites/claim', {method: 'POST', body: {token: invite.token}});
  assert.equal((await claim()).status, 200);
  assert.equal((await claim()).data.membership.role, 'member');
  assert.equal(sqlite.prepare('SELECT uses FROM live_invites').get().uses, 1);
  assert.equal((await call('stranger', '/invites/claim', {method: 'POST', body: {token: invite.token}})).status, 403);
  assert.equal((await call('member', `/communities/${community.id}/channels`)).data.channels[0].id, channel.id);
});

test('two independent identities exchange acknowledged durable messages', async () => {
  const first = await call('owner', `/channels/${channel.id}/messages`, {method: 'POST', body: {clientId: 'client-owner-0001', text: 'A real shared signal.', author_id: 'pretend-other-account'}});
  assert.equal(first.status, 200);
  assert.equal(first.data.acknowledged, true);
  assert.equal(first.data.message.author_id, users.owner.id);
  const memberHistory = await call('member', `/channels/${channel.id}/messages`);
  assert.equal(memberHistory.data.messages[0].id, first.data.message.id);
  const reply = await call('member', `/channels/${channel.id}/messages`, {method: 'POST', body: {clientId: 'client-member-0001', text: 'Received. Sending one back.'}});
  assert.equal(reply.data.message.author_id, users.member.id);
  assert.equal((await call('owner', `/channels/${channel.id}/messages`)).data.messages.length, 2);
});

test('reconnect cursor returns only new records and retry IDs deduplicate', async () => {
  const history = (await call('member', `/channels/${channel.id}/messages`)).data;
  const last = history.page.after;
  const send = () => call('member', `/channels/${channel.id}/messages`, {method: 'POST', body: {clientId: 'retry-stable-0001', text: 'One message, retried.'}});
  const [first, second] = await Promise.all([send(), send()]);
  assert.equal(first.data.message.id, second.data.message.id);
  const delta = await call('owner', `/channels/${channel.id}/messages?after=${last}`);
  assert.equal(delta.data.messages.length, 1);
  assert.equal(delta.data.messages[0].text, 'One message, retried.');
  const conflict = await call('member', `/channels/${channel.id}/messages`, {method: 'POST', body: {clientId: 'retry-stable-0001', text: 'A different message'}});
  assert.equal(conflict.status, 409);
});

test('history pages preserve chronological order and precise cursors', async () => {
  for (let n = 0; n < 8; n++) {
    const result = await call('owner', `/channels/${channel.id}/messages`, {method: 'POST', body: {clientId: `page-message-${n}`, text: `Page message ${n}`}});
    assert.equal(result.status, 200);
  }
  const recent = (await call('member', `/channels/${channel.id}/messages?limit=3`)).data;
  assert.deepEqual(recent.messages.map(m => m.text), ['Page message 5', 'Page message 6', 'Page message 7']);
  assert.equal(recent.page.hasMore, true);
  const previous = (await call('member', `/channels/${channel.id}/messages?before=${recent.page.before}&limit=3`)).data;
  assert.deepEqual(previous.messages.map(m => m.text), ['Page message 2', 'Page message 3', 'Page message 4']);
  const catchup = (await call('member', `/channels/${channel.id}/messages?after=${previous.page.after}&limit=2`)).data;
  assert.deepEqual(catchup.messages.map(m => m.text), ['Page message 5', 'Page message 6']);
  assert.equal(catchup.page.hasMore, true);
});

test('member permissions are enforced for community structure and announcements', async () => {
  assert.equal((await call('member', `/communities/${community.id}/channels`, {method: 'POST', body: {name: 'cannot-create'}})).status, 403);
  const create = await call('owner', `/communities/${community.id}/channels`, {method: 'POST', body: {name: 'announcements', kind: 'announcement'}});
  assert.equal(create.status, 201);
  announcements = create.data.channel;
  assert.equal((await call('member', `/channels/${announcements.id}/messages`, {method: 'POST', body: {clientId: 'announcement-0001', text: 'Not staff'}})).status, 403);
  assert.equal((await call('owner', `/channels/${announcements.id}/messages`, {method: 'POST', body: {clientId: 'announcement-0002', text: 'Official community note'}})).status, 200);
});

test('invalid input, conflicting cursors, and cross-origin writes are rejected', async () => {
  assert.equal((await call('owner', '/communities', {method: 'POST', body: {name: '  '}})).status, 400);
  assert.equal((await call('owner', `/channels/${channel.id}/messages?before=1&after=2`)).status, 400);
  assert.equal((await call('owner', `/channels/${channel.id}/messages?after=not-an-id`)).status, 400);
  assert.equal((await call('owner', `/channels/${channel.id}/messages`, {method: 'POST', body: {clientId: 'bad-text-0001', text: 'x'.repeat(4001)}})).status, 400);
  assert.equal((await call('owner', '/communities', {method: 'POST', body: {name: 'Bad origin'}, headers: {origin: 'https://another.example'}})).status, 403);
});

test('failed durable writes cannot return a successful acknowledgment', async () => {
  const before = sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n;
  db.failWrites = true;
  const response = await call('owner', `/channels/${channel.id}/messages`, {method: 'POST', body: {clientId: 'failing-write-0001', text: 'Must not be acknowledged'}});
  db.failWrites = false;
  assert.equal(response.status, 500);
  assert.equal(response.data.acknowledged, undefined);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n, before);
});

test('community creation batch rolls back if a later statement fails', async () => {
  const originalBatch = db.batch.bind(db);
  const before = sqlite.prepare('SELECT COUNT(*) AS n FROM live_communities').get().n;
  db.batch = async statements => originalBatch([...statements, {run: async () => { throw new Error('Forced final failure'); }}]);
  const response = await call('owner', '/communities', {method: 'POST', body: {name: 'Must roll back'}});
  db.batch = originalBatch;
  assert.equal(response.status, 500);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM live_communities').get().n, before);
});

let failures = 0;
for (const [name, run] of tests) {
  try { await run(); console.log('PASS ' + name); }
  catch (error) { failures++; console.error('FAIL ' + name, error); }
}
sqlite.close();
console.log(`\n${tests.length - failures}/${tests.length} backend contract checks passed against SQLite.`);
console.log('These are handler/database tests using synthetic identity headers, not a deployed two-account or D1 integration test.');
process.exitCode = failures ? 1 : 0;
