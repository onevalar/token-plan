import {execFileSync} from 'node:child_process';
import path from 'node:path';
const executable=path.resolve(process.argv[2]);
const suite='com.onevalar.tokenplan.verification';
try {
 const raw=execFileSync(executable,['--desktop-bridge'],{input:'{"method":"state"}\n',encoding:'utf8',timeout:60_000,maxBuffer:8*1024*1024,env:{...process.env,TOKENPLAN_DEFAULTS_SUITE:suite},stdio:['pipe','pipe','pipe']});
 const reply=JSON.parse(raw.trim());const s=reply.state;
 if(!reply.ok||s?.schema!=='tokenplan.desktop.v1'||!Array.isArray(s.accounts)||typeof s.settings?.autoUpdates!=='boolean')throw Error('Desktop bridge contract mismatch');
 for(const account of s.accounts)if(!Array.isArray(account.metrics)||!Array.isArray(account.history)||typeof account.enabled!=='boolean')throw Error('Incomplete account contract');
 if(/"(?:accessToken|refreshToken|CredentialFingerprint)"\s*:/.test(raw))throw Error('Authentication field leaked');
 console.log(`Packaged helper responded with ${s.accounts.length} account descriptors; no credentials exported.`);
} catch(error){console.error('Packaged helper verification failed:',error instanceof SyntaxError?'invalid JSON':error.message?.split('\n')[0]);process.exitCode=1;}
finally {if(process.platform==='darwin')try{execFileSync('/usr/bin/defaults',['delete',suite],{stdio:'ignore'});}catch{}}
