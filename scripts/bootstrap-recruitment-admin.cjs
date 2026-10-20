// Run only on a trusted administrator workstation with Application Default Credentials.
const {initializeApp,applicationDefault}=require('../functions/node_modules/firebase-admin/app');
const {getAuth}=require('../functions/node_modules/firebase-admin/auth');
const {getDatabase}=require('../functions/node_modules/firebase-admin/database');
const args=process.argv.slice(2);
const value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:undefined;};
(async()=>{
  const uid=value('--uid'),email=value('--email'),name=value('--name'),databaseURL=value('--database-url');
  if((!uid&&!email)||!name||!databaseURL||!/^https:\/\//.test(databaseURL))throw Error('Usage: node scripts/bootstrap-recruitment-admin.cjs --email EMAIL (or --uid UID) --name "Staff Name" --database-url URL [--apply]');
  initializeApp({credential:applicationDefault(),databaseURL});
  const person=uid?await getAuth().getUser(uid):await getAuth().getUserByEmail(email);
  if(person.disabled)throw Error('Account is disabled.');
  if(email&&person.email?.toLowerCase()!==email.toLowerCase())throw Error('UID and email do not match.');
  console.log('Recruitment Admin:',name,person.email,person.uid);
  if(!args.includes('--apply')){console.log('Preview only. Add --apply to assign Admin with default full access.');return;}
  const db=getDatabase();const key=db.ref('privateRecruitment/accessHistory').push().key;
  const before=(await db.ref('privateRecruitment/access/users/'+person.uid).get()).val();
  const grant={name,email:person.email||'',roleId:'admin',view:true,manage:true,disabled:false};
  await db.ref('privateRecruitment').update({['access/users/'+person.uid]:grant,['accessHistory/'+key]:{actorId:'trusted-bootstrap',actorName:'Trusted deployment administrator',at:new Date().toISOString(),kind:'bootstrap-admin',key:person.uid,before:before||null,after:grant}});
  console.log('Protected Admin role assigned. Recruitment access and permission management are enabled.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
