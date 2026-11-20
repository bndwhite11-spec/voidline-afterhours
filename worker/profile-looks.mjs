import {authenticate, validateSessionMutation, authRateLimit, AuthError, readBody} from './auth.mjs';
import {PROFILE_OPTIONS, normalizeProfileAccent} from './profiles.mjs';

const presetOptions = {
  avatar: PROFILE_OPTIONS.avatars, banner: PROFILE_OPTIONS.banners, accent: PROFILE_OPTIONS.accents,
  nameStyle: PROFILE_OPTIONS.nameStyles, profileFrame: PROFILE_OPTIONS.profileFrames
};
const presetColumns = 'avatar,banner,accent,name_style AS nameStyle,profile_frame AS profileFrame';
const privateJson = (body, status = 200) => Response.json(body, {
  status, headers: {'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff'}
});
const activeSession = `EXISTS (
  SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id
  WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL
    AND s.expires_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)
    AND a.account_status='active'
)`;

export async function handleProfileLooks(request, env) {
  try {
    const path = new URL(request.url).pathname;
    const user = await authenticate(request, env);
    const session = [user.sessionId, user.id];
    const db = env.DB;
    if (request.method === 'GET' && path === '/api/profile-looks') {
      const {results} = await db.prepare(`SELECT name,${presetColumns} FROM profile_saved_looks
        WHERE account_id=? AND ${activeSession} ORDER BY name COLLATE NOCASE,name LIMIT 12`)
        .bind(user.id, ...session).all();
      return privateJson({looks: results});
    }
    if (request.method !== 'POST' || !['/api/profile-looks/save','/api/profile-looks/remove'].includes(path)) {
      throw new AuthError(405,'method_not_allowed','Unknown saved look action.');
    }
    const data = await readBody(request);
    await validateSessionMutation(request, user, data);
    await authRateLimit(request, db, 'profile-looks', 40, Date.now(), user.id);
    const name = typeof data.name === 'string' ? data.name.normalize('NFC').trim() : '';
    if (!name || name.length > 40 || /[\x00-\x1f\x7f]/.test(name)) {
      throw new AuthError(400,'invalid_name','Enter a look name of 1 to 40 characters.');
    }
    if (path.endsWith('/remove')) {
      const [, authorization] = await db.batch([
        db.prepare(`DELETE FROM profile_saved_looks WHERE account_id=? AND name=? AND ${activeSession}`)
          .bind(user.id, name, ...session),
        db.prepare(`SELECT 1 AS authorized WHERE ${activeSession}`).bind(...session)
      ]);
      if (!authorization.results.length) throw new AuthError(401,'session_expired','Sign in again to manage saved looks.');
      return privateJson({removed: true});
    }
    data.accent = normalizeProfileAccent(data.accent);
    if (!data.accent) throw new AuthError(400,'invalid_style','Choose a profile accent preset or a six-digit hex color.');
    for (const [key, options] of Object.entries(presetOptions)) {
      if (key === 'accent') continue;
      if (!options.includes(data[key])) throw new AuthError(400,'invalid_style','Choose a current preset.');
    }
    // Named looks capture only these preset values. A repeated save must agree
    // with the original selection or ask the user for a different name.
    const presets = Object.fromEntries(Object.keys(presetOptions).map(key => [key, data[key]]));
    const values = [user.id, name, ...Object.values(presets)];
    const row = await db.prepare(`INSERT INTO profile_saved_looks(account_id,name,avatar,banner,accent,name_style,profile_frame)
      SELECT ?,?,?,?,?,?,? WHERE ${activeSession} AND (SELECT count(*) FROM profile_saved_looks WHERE account_id=?)<12
      ON CONFLICT(account_id,name) DO NOTHING RETURNING name`).bind(...values,...session,user.id).first();
    if (!row) {
      const prior = await db.prepare(`SELECT ${presetColumns} FROM profile_saved_looks WHERE account_id=? AND name=? AND ${activeSession}`)
        .bind(user.id,name,...session).first();
      if (!prior || Object.keys(presets).some(key => prior[key] !== presets[key])) {
        throw new AuthError(409,'look_unavailable',prior?'That name already has a different look. Choose another name.':'Could not save this look. Check your session or remove a look if all 12 slots are in use.');
      }
    }
    return privateJson({name, ...presets});
  } catch(error) {
    return privateJson({error:{code:error instanceof AuthError?error.code:'looks_unavailable',message:error instanceof AuthError?error.message:'Saved looks are temporarily unavailable.'}}, error instanceof AuthError?error.status:503);
  }
}
