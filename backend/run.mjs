// Current server acceptance suites. The explicit v7 fixture suites remain
// separately runnable and are not evidence of current authentication/E2EE.
import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const directory=path.dirname(fileURLToPath(import.meta.url));
let failures=0;
for(const name of readdirSync(directory).filter(name=>name.endsWith('-test.mjs')&&name!=='review-test.mjs').sort()){
  console.log('\n'+name);
  const result=spawnSync(process.execPath,[path.join(directory,name)],{stdio:'inherit'});
  if(result.status!==0)failures++;
}
console.log('\n'+(failures?failures+' current server suite(s) failed.':'All current server suites passed.'));
process.exitCode=failures?1:0;
