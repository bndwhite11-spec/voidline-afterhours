import {authenticate,validateSessionMutation,authRateLimit,readBody,AuthError} from './auth.mjs';
import {activeEditionId,ensureEditionStatement,qualifyingAction,weekAt,expiryClock,validateTables,modelAt,randomDraw,issuingEnabled,openingEnabled} from './capsule-rules.mjs';

const q=(db,sql,...binds)=>db.prepare(sql).bind(...binds);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
  'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
  'x-content-type-options':'nosniff','referrer-policy':'no-referrer'
}});
const need=(ok,status,code,message)=>{if(!ok)throw new AuthError(status,code,message);};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const capsuleID=id=>uuid.test(id)||/^[0-9a-f]{32}$/.test(id);
const actorSQL=`EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id
 WHERE s.id=? AND a.id=? AND s.revoked_at IS NULL AND s.expires_at>${expiryClock}
 AND a.account_status='active' AND a.onboarding_complete=1)`;
async function requireActor(db,user) {
  need(await q(db,'SELECT 1 AS ok WHERE '+actorSQL,user.sessionId,user.id).first(),409,'account_changed','Sign in to your completed account again.');
}

function detailCapsule(row) {
  return {id:row.id,name:'Choice Capsule',source:row.source,earnedAt:row.earned_at,
    period:row.source==='weekly'?row.period:null,editionId:row.edition_id,
    openedAt:row.opened_at??null,openingId:row.opening_id??null,acknowledgedAt:row.acknowledged_at??null};
}
const capsuleSelect=`SELECT c.*,o.id AS opening_id,o.opened_at,o.acknowledged_at FROM collectible_capsules c
  LEFT JOIN capsule_openings o ON o.capsule_id=c.id`;
async function overview(env,user,offset) {
  const db=env.DB, clock=await q(db,'SELECT '+expiryClock+' AS ms').first(),week=weekAt(clock.ms);
  const [rows,count,stampCount,welcome]=await Promise.all([
    q(db,capsuleSelect+' WHERE c.account_id=? ORDER BY c.earned_at DESC,c.id DESC LIMIT 50 OFFSET ?',user.id,offset).all(),
    q(db,'SELECT COUNT(*) n FROM collectible_capsules WHERE account_id=?',user.id).first(),
    q(db,'SELECT COUNT(*) n FROM capsule_stamps WHERE account_id=? AND utc_week=?',user.id,week.key).first(),
    q(db,"SELECT id FROM collectible_capsules WHERE account_id=? AND source='welcome' AND period='onboarding' LIMIT 1",user.id).first()
  ]);
  await requireActor(db,user);
  return {capsules:rows.results.map(detailCapsule),page:{offset,limit:50,total:count.n,hasMore:offset+50<count.n},
    progress:{days:Math.min(3,stampCount.n),required:3,weekStart:week.weekStart,nextWeek:week.nextWeek,qualifyingAction},
    welcomeEligible:!welcome,issuingEnabled:issuingEnabled(env),openingEnabled:openingEnabled(env)};
}
async function capsuleView(db,user,id) {
  const row=await q(db,`SELECT c.*,e.families_json,o.id AS opening_id,o.opened_at,o.acknowledged_at
    FROM collectible_capsules c JOIN capsule_editions e ON e.id=c.edition_id
    LEFT JOIN capsule_openings o ON o.capsule_id=c.id WHERE c.account_id=? AND c.id=?`,user.id,id).first();
  need(row,404,'capsule_unavailable','This capsule is unavailable.');
  const families=validateTables(JSON.parse(row.families_json));
  return {capsule:detailCapsule(row),families};
}
async function openingFor(db,user,capsuleId) {
  const row=await q(db,`SELECT o.*, i.owner_id=? AS owned,
    (i.owner_id=? AND i.pending_transfer_id IS NOT NULL) AS reserved
    FROM capsule_openings o JOIN collectible_capsules c ON c.id=o.capsule_id
    JOIN gift_instances i ON i.id=o.instance_id WHERE c.account_id=? AND c.id=?`,user.id,user.id,user.id,capsuleId).first();
  return row?{id:row.id,capsuleId:row.capsule_id,instanceId:row.instance_id,modelId:row.model_id,
    familyId:row.family_id,tableVersion:row.table_version,model:JSON.parse(row.snapshot),
    weight:row.weight,totalWeight:row.total_weight,discovery:row.discovery,openedAt:row.opened_at,
    acknowledgedAt:row.acknowledged_at,currentlyOwned:!!row.owned,currentlyReserved:!!row.reserved}:null;
}

function verifyBody(body,allowed) {
  need(Object.keys(body).every(k=>k==='expectedAccountId'||allowed.includes(k)),400,'invalid_fields','Only the selected capsule action may be submitted.');
}
async function reconcile(env,user) {
  const db=env.DB, editionId=activeEditionId(env);
  need(issuingEnabled(env),503,'issuance_paused','New capsule awards are paused. Your earned capsules are safe.');
  await db.batch([
    ensureEditionStatement(db,editionId,actorSQL,user.sessionId,user.id),
    q(db,`INSERT INTO collectible_capsules(id,account_id,source,period,edition_id,earned_at)
      SELECT ?,?,'welcome','onboarding',?,${expiryClock} WHERE ${actorSQL}
      ON CONFLICT(account_id,source,period) DO NOTHING`,crypto.randomUUID(),user.id,editionId,user.sessionId,user.id)
  ]);
  return overview(env,user,0);
}
async function open(env,user,view,body) {
  const db=env.DB, caps=view.capsule, clientId=body.clientId, familyId=body.familyId;
  need(typeof clientId==='string'&&uuid.test(clientId),400,'invalid_request_id','Use a new opening request ID.');
  const requestIndex=()=>q(db,'SELECT capsule_id,family_id FROM capsule_open_requests WHERE account_id=? AND client_id=?',user.id,clientId).first();
  function checkKey(key) {
    need(!key || key.capsule_id===caps.id&&key.family_id===familyId,409,'idempotency_conflict','This request identity was used for a different opening.');
  }
  checkKey(await requestIndex());
  const family=view.families.find(f=>f.id===familyId);
  need(family,400,'family_unavailable','Select a family from this capsule’s frozen contents.');
  const candidate=modelAt(randomDraw(),family.models),id=crypto.randomUUID(),instance=crypto.randomUUID();
  const allowed=openingEnabled(env);
  // Different account/key/family contenders cannot pass one another’s request gate.
  // Even if two workers sample candidate outcomes, only the immutable inserted row
  // can trigger a mint. No computed candidate is returned to the caller.
  await db.batch([
    q(db,`INSERT INTO capsule_open_requests(account_id,client_id,capsule_id,family_id)
      SELECT ?,?,?,? WHERE ${actorSQL} AND ( ?=1 OR EXISTS(SELECT 1 FROM capsule_openings WHERE capsule_id=?))
      AND EXISTS(SELECT 1 FROM collectible_capsules WHERE id=? AND account_id=?)
      ON CONFLICT(account_id,client_id) DO NOTHING`,
      user.id,clientId,caps.id,familyId,user.sessionId,user.id,Number(allowed),caps.id,caps.id,user.id),
    q(db,`INSERT INTO capsule_openings(id,capsule_id,instance_id,family_id,model_id,table_version,snapshot,weight,total_weight,discovery,opened_at)
      SELECT ?,c.id,?,?,?,?,?,?,10000,
        CASE WHEN EXISTS(SELECT 1 FROM gift_instances WHERE owner_id=c.account_id AND catalog_id=?) THEN 'additional'
        WHEN EXISTS(SELECT 1 FROM collectible_discoveries WHERE account_id=c.account_id AND model_id=?) THEN 'returning'
        ELSE 'first' END,${expiryClock}
      FROM collectible_capsules c WHERE c.id=? AND c.account_id=? AND c.edition_id=? AND ?=1 AND ${actorSQL}
      AND EXISTS(SELECT 1 FROM capsule_open_requests k WHERE k.account_id=c.account_id AND k.client_id=? AND k.capsule_id=c.id AND k.family_id=?)
      AND NOT EXISTS(SELECT 1 FROM capsule_openings prev WHERE prev.capsule_id=c.id)`,
      id,instance,familyId,candidate.id,family.tableVersion,JSON.stringify(candidate),candidate.weight,
      candidate.id,candidate.id,caps.id,user.id,caps.editionId,Number(allowed),user.sessionId,user.id,clientId,familyId)
  ]);
  await requireActor(db,user);
  const key=await requestIndex(); checkKey(key);
  const saved=await openingFor(db,user,caps.id);
  await requireActor(db,user);
  need(key&&saved,503,allowed?'confirmation_unavailable':'opening_paused',
    allowed?'Check this capsule’s status before retrying your opening.':'Opening capsules is temporarily paused. Your capsule is safe.');
  return {opening:saved,alreadyOpened:saved.id!==id};
}
async function acknowledge(db,user,id) {
  const gate=`EXISTS(SELECT 1 FROM collectible_capsules c WHERE c.id=? AND c.account_id=?) AND ${actorSQL}`;
  await db.batch([
    q(db,`UPDATE capsule_openings SET acknowledged_at=${expiryClock} WHERE capsule_id=? AND acknowledged_at IS NULL AND ${gate}`,id,id,user.id,user.sessionId,user.id),
    q(db,`UPDATE gift_instances SET arrival_acknowledged_at=${expiryClock}
      WHERE capsule_id=? AND owner_id=? AND ownership_revision=0 AND arrival_acknowledged_at IS NULL AND ${gate}`,id,user.id,id,user.id,user.sessionId,user.id)
  ]);
  const opening=await openingFor(db,user,id);
  await requireActor(db,user);
  need(opening,409,'unopened_capsule','Open this capsule before acknowledging a result.');
  return {opening};
}

export async function handleCapsulesRequest(request,env) {
  try {
    const url=new URL(request.url),parts=url.pathname.split('/');
    const user=await authenticate(request,env),db=env.DB;
    await requireActor(db,user);
    need(parts[1]==='api'&&parts[2]==='capsules'&&parts.length<=5,404,'not_found','This capsule page is unavailable.');
    const id=parts[3],action=parts[4];
    if (request.method==='GET'&&!action) {
      if (!id) {
        const offset=Number(url.searchParams.get('offset')||0);
        need(Number.isSafeInteger(offset)&&offset>=0&&offset<=100000,400,'invalid_page','Choose a valid capsule page.');
        return json(await overview(env,user,offset));
      }
      need(capsuleID(id),404,'capsule_unavailable','This capsule is unavailable.');
      const state=await capsuleView(db,user,id);
      const opening=await openingFor(db,user,id);
      await requireActor(db,user);
      return json({...state,opening,openingEnabled:openingEnabled(env)});
    }
    need(request.method==='POST',405,'method_not_allowed','Choose an available capsule action.');
    const body=await readBody(request);
    await validateSessionMutation(request,user,body);
    await authRateLimit(request,db,'capsule_mutation',80,Date.now(),user.id);
    if (id==='reconcile'&&!action) { verifyBody(body,[]);return json(await reconcile(env,user)); }
    need(capsuleID(id)&&['open','ack'].includes(action),404,'capsule_unavailable','This capsule action is unavailable.');
    const view=await capsuleView(db,user,id);
    if (action==='ack') {verifyBody(body,[]);return json(await acknowledge(db,user,id));}
    verifyBody(body,['clientId','familyId']);
    return json(await open(env,user,view,body));
  } catch (error) {
    return json({error:{code:error instanceof AuthError?error.code:'capsule_service_unavailable',
      message:error instanceof AuthError?error.message:'Your capsule could not be confirmed. Reopen it to check its saved state.'}},error instanceof AuthError?error.status:503);
  }
}
