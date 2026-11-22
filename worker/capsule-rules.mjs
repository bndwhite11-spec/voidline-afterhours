import firstTables from '../src/collectibles/choice-v1-tables.json' with {type:'json'};
import firstArt from '../src/collectibles/choice-v1-assets.json' with {type:'json'};
import workshopTables from '../src/collectibles/choice-v2-tables.json' with {type:'json'};
import workshopArt from '../src/collectibles/choice-v2-assets.json' with {type:'json'};

// To change a published distribution, introduce a new edition and table version.
// An earned capsule permanently references its immutable database edition.
export const choiceEdition = 'afterhours-choice.v1';
const expandedEdition='afterhours-choice.v2';
export const activeEditionId=env=>env.CAPSULE_EXPANDED_FAMILIES==='1'?expandedEdition:choiceEdition;
export const qualifyingAction = 'Post a Standard message in a community channel on three different UTC days, Monday through Sunday. Replies count. Reading and direct messages do not add a day.';
const attachOriginalArt=(families,art)=>families.map(family=>({...family,models:family.models.map(model=>({
  ...model,originalArt:art[model.id]
}))}));
export const releaseTables = attachOriginalArt(firstTables,firstArt);
export const expandedReleaseTables = [...releaseTables,...attachOriginalArt(workshopTables,workshopArt)];

export function validateTables(families) {
  if (!Array.isArray(families) || !families.length || families.length>16) throw Error('Invalid capsule family tables');
  const familyIds = new Set(), modelIds = new Set(), versions = new Set();
  for (const family of families) {
    if (typeof family.id!=='string'||!family.id||!family.name||!family.tableVersion||familyIds.has(family.id)||versions.has(family.tableVersion)||!Array.isArray(family.models)||!family.models.length||family.models.length>100)
      throw Error('Invalid or duplicate family table');
    familyIds.add(family.id); versions.add(family.tableVersion);
    let total=0;
    for (const model of family.models) {
      if (!model.id || modelIds.has(model.id) || model.familyId!==family.id || !model.name || !model.tier ||
          !['mini','card','detail','silhouette'].every(k=>/^\/art\/v4\/[a-z0-9-]+\.[a-f0-9]+\.svg$/.test(model.originalArt?.[k]?.url)&&/^[0-9a-f]{64}$/.test(model.originalArt?.[k]?.sha256)) ||
          !model.backdrop?.name || !model.motif || !model.artRevision || model.acquisitionPolicy!=='capsule-only' ||
          !Number.isSafeInteger(model.weight) || model.weight<=0) throw Error('Invalid capsule model or weight');
      modelIds.add(model.id); total+=model.weight;
    }
    if (total!==10000) throw Error('Capsule outcome weights must total 10,000');
  }
  return families;
}
const frozenEditions = new Map([
  [choiceEdition,JSON.stringify(validateTables(releaseTables))],
  [expandedEdition,JSON.stringify(validateTables(expandedReleaseTables))]
]);

export function modelAt(draw,models) {
  if (!Number.isInteger(draw)||draw<0||draw>=10000) throw Error('Draw outside the frozen table');
  let cursor=0;
  for (const model of models) {
    cursor+=model.weight;
    if (draw<cursor) return model;
  }
  throw Error('Incomplete capsule table');
}
export function randomDraw() {
  const limit = 0x100000000 - (0x100000000 % 10000);
  const sample = new Uint32Array(1);
  do { crypto.getRandomValues(sample); } while (sample[0]>=limit);
  return sample[0]%10000;
}

export const issuingEnabled = env => env.CAPSULE_ISSUANCE_PAUSED!=='1';
export const openingEnabled = env => env.CAPSULE_OPENING_PAUSED!=='1';
export const expiryClock = "CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)";

export function weekAt(ms) {
  const start=new Date(ms); start.setUTCHours(0,0,0,0);
  start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);
  return {key:start.toISOString().slice(0,10),weekStart:+start,nextWeek:+start+7*86400000};
}

export function ensureEditionStatement(db,editionId,authorizedSQL,...args) {
  return db.prepare(`INSERT INTO capsule_editions(id,families_json)
    SELECT ?,? WHERE ${authorizedSQL} AND NOT EXISTS(SELECT 1 FROM capsule_editions WHERE id=?)
    ON CONFLICT(id) DO NOTHING`).bind(editionId,frozenEditions.get(editionId),...args,editionId);
}

// Included in the community send's D1 transaction. The fresh proposed message ID
// matches only a committed, permission-checked send, including replies/attachments.
// A retry resolves the old ID and cannot create a stamp on another day.
export function participationWrites(env,id,user,editionInstalled=false) {
  if (!issuingEnabled(env)) return [];
  const db=env.DB, editionId=activeEditionId(env), active=`EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id
    WHERE s.id=? AND a.id=? AND s.revoked_at IS NULL AND s.expires_at>${expiryClock}
    AND a.account_status='active' AND a.onboarding_complete=1)`;
  const authored=`EXISTS(SELECT 1 FROM live_messages WHERE id=? AND author_id=?) AND ${active}`;
  return [
    ...(editionInstalled?[]:[ensureEditionStatement(db,editionId,authored,id,user.id,user.sessionId,user.id)]),
    db.prepare(`INSERT INTO capsule_stamps(account_id,utc_day,utc_week,committed_at,edition_id)
      SELECT author_id,date(created_at/1000,'unixepoch'),date(created_at/1000,'unixepoch','-6 days','weekday 1'),created_at,?
      FROM live_messages WHERE id=? AND author_id=? AND ${active}
      ON CONFLICT(account_id,utc_day) DO NOTHING`).bind(editionId,id,user.id,user.sessionId,user.id)
  ];
}
