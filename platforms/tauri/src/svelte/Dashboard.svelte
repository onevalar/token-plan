<script module lang="ts">
 import type {Account} from '../desktop';
 import {connectionAction} from '../connection';
 import type {SourceShare} from './usage/types';
 export function accountGroups(accounts:Account[]) {
  const groups:{family:string;accounts:Account[]}[]=[];
  for(const account of accounts.filter(a=>a.enabled)){
   const last=groups.at(-1);
   if(last?.family===account.family)last.accounts.push(account);
   else groups.push({family:account.family,accounts:[account]});
  }
  return groups;
 }
 export function dashboardGroups(accounts:Account[]) {
  const visible=accounts.filter(a=>a.enabled),isOpenAI=(a:Account)=>a.family==='codex'||a.family==='openai';
  const first=visible.findIndex(isOpenAI),groups:{openAI:boolean;accounts:Account[]}[]=[];
  let pending:Account[]=[];
  const flush=()=>{if(pending.length){groups.push({openAI:false,accounts:pending});pending=[];}};
  visible.forEach((account,index)=>{
   if(index===first){flush();groups.push({openAI:true,accounts:visible.filter(isOpenAI)});}
   if(!isOpenAI(account))pending.push(account);
  });
  flush();return groups;
 }
 export function problemAction(a:Account,run:{open:(id:string)=>void;settings:(id:string)=>void;retry:(id:string)=>void}):{label:string;run:()=>void}|null {
  if(!a.error)return null;
  const kind=connectionAction(a);
  if(a.apiKey&&/\bkey\b/i.test(a.error))return {label:'Set API Key',run:()=>run.settings(a.id)};
  if(kind==='retry')return {label:'Try Again',run:()=>run.retry(a.id)};
  if(kind==='login'&&['claude','codex'].includes(a.family))return {label:'Sign In Again',run:()=>run.open(a.id)};
  if(kind==='inspect')return {label:'Check Connection',run:()=>run.open(a.id)};
  return {label:'View Details',run:()=>run.open(a.id)};
 }
 export function modelShares(history:Account['history']):SourceShare[] {
  const days=[...history].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7),totals=new Map<string,number>();
  for(const d of days)for(const m of d.models)totals.set(m.model,(totals.get(m.model)??0)+m.tokens);
  const sum=[...totals.values()].reduce((n,v)=>n+v,0);
  return sum>0?[...totals].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([name,v])=>({name,share:v/sum})):[];
 }
</script>

<script lang="ts">
 import {ChevronRight} from '@lucide/svelte';
 import {Button} from '@valar/svelte-ui/button';
 import {providerTheme} from '../providerTheme';
 import {accountTitle} from '../usage';
 import {providerText} from '../providerText';
 import type {HomeUsageStyle} from '../homeUsage';
 import ProviderLogo from './ProviderLogo.svelte';
 import HomeMetrics from './usage/HomeMetrics.svelte';
 import {cssText} from './usage/types';
 import '../dashboard.css';
 let {accounts,open,openSettings,retry,busy=false,now,language,missing,remaining,usageStyle='bars',accountStyle}:{accounts:Account[];open:(id:string)=>void;openSettings:(id:string)=>void;retry:(id:string)=>void;busy?:boolean;now:number;language:string;missing:string;remaining:boolean;usageStyle?:HomeUsageStyle;accountStyle?:(id:string)=>HomeUsageStyle}=$props();
</script>

{#snippet renderAccounts(items:Account[],openAI=false)}
 {#each accountGroups(items) as group (group.accounts[0].id)}
  <section class={`provider${openAI?'':' service-group'}`} data-provider={group.family} data-multiple={group.accounts.length>1} style={cssText(providerTheme(group.family) as Record<string,string>)}>
   {#if group.accounts.length>1}<div class="family-heading"><ProviderLogo family={group.family}/><h2>{openAI?(group.family==='codex'?'Codex':'API'):group.accounts[0].name}</h2></div>{/if}
   {#each group.accounts as a (a.id)}
    <div class="account-block" data-usage-style={accountStyle?.(a.id)??usageStyle}>
     <div class="provider-heading">
      <Button variant="ghost" class="account-identity account-detail-entry" aria-label={`${a.name} ${a.email}`.trim()} onclick={()=>open(a.id)}>
       <div class="account-entry-content">
        {#if !openAI&&group.accounts.length===1}<ProviderLogo family={a.family}/>{/if}
        <div class="identity-text"><div class="identity-line"><h2>{group.accounts.length>1?accountTitle(a.email)||a.name:openAI?(a.family==='codex'?'Codex':'API'):a.name}</h2><span class="plan">{a.plan}</span></div>
         {#if group.accounts.length===1&&a.email}<span class="email">{accountTitle(a.email)}</span>{/if}
        </div><ChevronRight class="account-chevron" size={18} aria-hidden="true"/>
       </div>
      </Button>
     </div>
     {#if a.error||a.warning}
      {@const action=problemAction(a,{open,settings:openSettings,retry})}
      <div class="notice-block"><p role="status" class="notice">{providerText(a.error||a.warning||'',language)}</p>{#if action}<Button size="sm" variant="secondary" class="notice-action" disabled={busy} onclick={action.run}>{providerText(action.label,language)}</Button>{/if}</div>
     {/if}
     <HomeMetrics sources={modelShares(a.history)} metrics={a.metrics.filter(m=>m.placement==='home')} style={accountStyle?.(a.id)??usageStyle} {now} {missing} {language} {remaining}/>
    </div>
   {/each}
  </section>
 {/each}
{/snippet}

<div class="dashboard" data-usage-style={usageStyle}>
 {#each dashboardGroups(accounts) as group (group.openAI?'openai-group':group.accounts[0].id)}
  {#if group.openAI}<section class="openai-group service-group" aria-label="OpenAI"><div class="family-heading openai-heading"><ProviderLogo family="openai"/><h2>OpenAI</h2></div>{@render renderAccounts(['codex','openai'].flatMap(family=>group.accounts.filter(a=>a.family===family)),true)}</section>
  {:else}<div class="dashboard-group">{@render renderAccounts(group.accounts)}</div>{/if}
 {/each}
</div>

<style>
 .account-entry-content { display:flex;align-items:center;gap:8px;min-width:0;flex:1; }
</style>
