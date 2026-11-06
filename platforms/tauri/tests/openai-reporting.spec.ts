import {test,expect} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
import {metricSchema} from '../src/desktop';

test('OpenAI reporting and Codex credits render without invented balances',async({page},info)=>{
 await page.addInitScript(platform=>{(window as any).__panelFrame={platform,rounded:platform!=='linux'};},String(info.project.metadata.platform??'macos'));
 const state=largeDesktop();
 const metric=(id:string,label:string,amount:number|null)=>metricSchema.parse({id,label,amount,percent:null,periodSeconds:null,resetsAt:null,placement:'home',pinned:false,pinnable:false,hasData:true,unit:label==='Credits'?'count':'dollars',values:[]});
 const api={...state.accounts[0],id:'openai',family:'openai',name:'OpenAI API',email:'',plan:'',observations:[],historyPartial:false,apiKey:true,apiKeyStatus:'saved' as const,metrics:[metric('openai.month','This Month',1.25)],history:[{date:new Date().toISOString().slice(0,10),tokens:150,cost:1.25,models:[{model:'example-model',tokens:150,cost:null,variants:[]}]}]};
 const codex={...state.accounts[2],history:[],observations:[],historyPartial:false,metrics:[metric('codex.credits','Credits',12.375)]};
 state.accounts=[api,codex];
 await mockDesktop(page,'en',false,state);await page.goto('/');
 await expect(page.locator('.dashboard')).toContainText('12.375');
 await expect(page.locator('.dashboard')).not.toContainText('$0.48');
 await page.getByRole('button',{name:'OpenAI API',exact:true}).click();
 await expect(page.getByText('Organization Admin Key',{exact:true})).toBeVisible();
 await expect(page.getByText('Reads organization-wide API usage and costs.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Back',exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();
 await page.getByRole('menuitem',{name:'Usage Statistics',exact:true}).click();
 await expect(page.getByText('Official API reports use UTC',{exact:false})).toBeVisible();
 await expect(page.locator('.preview-page:not([hidden])').getByText('$1.25',{exact:true}).first()).toBeVisible();
 await page.screenshot({path:`test-results-navigation/openai-${info.project.name}.png`,fullPage:true});
});

test('unlimited credits are text rather than a zero percent meter',async({page},info)=>{
 await page.addInitScript(platform=>{(window as any).__panelFrame={platform,rounded:true};},String(info.project.metadata.platform??'macos'));
 const state=largeDesktop();const codex=state.accounts[2];
 codex.metrics=[metricSchema.parse({id:'codex.credits',label:'Credits',statusText:'Unlimited',amount:null,percent:null,periodSeconds:null,resetsAt:null,placement:'home',pinned:false,pinnable:false,hasData:true,unit:'count',values:[]})];state.accounts=[codex];
 await mockDesktop(page,'en',false,state);await page.goto('/');
 await expect(page.locator('.dashboard')).toContainText('Unlimited');
 await expect(page.locator('.dashboard progress')).toHaveCount(0);
});

for(const scenario of ['both','codex','api','multiple'] as const)test(`OpenAI homepage group: ${scenario}`,async({page},info)=>{
 await page.addInitScript(platform=>{(window as any).__panelFrame={platform,rounded:platform!=='linux'};},String(info.project.metadata.platform??'macos'));
 const state=largeDesktop();
 const codex={...state.accounts[2],id:'codex',family:'codex',name:'Codex',enabled:true};
 const api={...codex,id:'openai',family:'openai',name:'OpenAI API',email:'',plan:''};
 const other={...state.accounts[0],enabled:true};
 state.accounts=scenario==='codex'?[codex]:scenario==='api'?[api]:scenario==='multiple'?[codex,other,{...codex,id:'codex-second',email:'second@example.com'},api]:[codex,other,api];
 await mockDesktop(page,'en',false,state);await page.goto('/');
 const group=page.locator('.openai-group');
 await expect(group).toHaveCount(1);
 await expect(group.locator('.openai-heading')).toHaveText('OpenAI');
 await expect(group.locator('.account-block')).toHaveCount(scenario==='multiple'?3:scenario==='both'?2:1);
 await expect(group.locator('.provider[data-provider="codex"]')).toHaveCount(scenario==='api'?0:1);
 await expect(group.locator('.provider[data-provider="openai"]')).toHaveCount(scenario==='codex'?0:1);
 if(scenario==='both'){
  await expect(group.locator('.identity-line h2')).toHaveText(['Codex','API']);
  await page.screenshot({path:`test-results-navigation/openai-group-${info.project.name}.png`,fullPage:true});
  await page.emulateMedia({colorScheme:'dark'});
  await page.screenshot({path:`test-results-navigation/openai-group-dark-${info.project.name}.png`,fullPage:true});
 }
 const entry=group.locator('.account-detail-entry').last();await entry.click();
 await expect(page.getByRole('button',{name:'Back',exact:true})).toBeVisible();
});
