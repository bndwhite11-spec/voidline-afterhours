'use strict';
const {readdirSync}=require('node:fs');
const {join}=require('node:path');
const {spawnSync}=require('node:child_process');
let failures=0;
for(const file of readdirSync(__dirname).filter(name=>name.endsWith('-test.cjs')).sort()){
 console.log('\n'+file);
 const result=spawnSync(process.execPath,[join(__dirname,file)],{stdio:'inherit'});
 if(result.status!==0)failures++;
}
console.log('\n'+(failures?failures+' suite(s) failed.':'All client suites passed.'));
process.exitCode=failures?1:0;
