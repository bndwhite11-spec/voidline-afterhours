// Site builds use a checksum-pinned, signed release artifact. Native source
// builds and the private signing key live separately; neither enters this file.
import {readFile,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const release=JSON.parse(await readFile(path.join(root,'dist/downloads/voidline-release.json'),'utf8'));
const item=release.android;
if(!/^v\d+\.\d+\.\d+$/.test(release.tag)||item?.filename!=='VOIDLINE-Android.apk'||!/^[a-f0-9]{64}$/.test(item.sha256)||!Number.isSafeInteger(item.bytes)||item.bytes<65536||item.bytes>8*1024*1024)throw Error('Invalid signed Android release metadata.');
const file=path.join(root,'dist/downloads',item.filename);
const matches=bytes=>bytes.length===item.bytes&&bytes[0]===0x50&&bytes[1]===0x4b&&createHash('sha256').update(bytes).digest('hex')===item.sha256;
let existing;try{existing=await readFile(file);}catch(error){if(error.code!=='ENOENT')throw error;}
if(existing){if(!matches(existing))throw Error('The local Android package does not match its pinned release.');}
else{
 if(process.argv.includes('--check'))throw Error('The signed Android package is missing. Run this script without --check to retrieve the pinned public release.');
 const url='https://voidline-afterhours.pipedcactus1.chatgpt.site'+item.url;
 const response=await fetch(url,{signal:AbortSignal.timeout(120000)});
 if(!response.ok||new URL(response.url).origin!=='https://voidline-afterhours.pipedcactus1.chatgpt.site')throw Error('The public Android release could not be retrieved.');
 const reader=response.body.getReader(),chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>item.bytes){await reader.cancel();throw Error('The Android release exceeds its expected size.');}chunks.push(value);}
 const bytes=Buffer.concat(chunks);
 if(!matches(bytes))throw Error('The downloaded Android release failed its size or checksum check.');
 await mkdir(path.dirname(file),{recursive:true});const temporary=file+'.'+randomUUID()+'.tmp';
 try{await writeFile(temporary,bytes,{flag:'wx'});await rename(temporary,file);}finally{await rm(temporary,{force:true});}
}
console.log('Verified signed Android release artifact: '+item.bytes+' bytes; SHA-256 matches pinned metadata.');
