import {test,expect} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
import {metricSchema} from '../src/desktop';

test('Anthropic API settings and official history remain separate from subscription',async({page},info)=>{
 await page.addInitScript(platform=>{(window as any).__panelFrame={platform,rounded:platform!=='linux'};},String(info.project.metadata.platform??'macos'));
 const state=largeDesktop();const date=new Date().toISOString().slice(0,10);
 state.accounts=[{...state.accounts[0],id:'anthropic',family:'anthropic',name:'Anthropic API',email:'',plan:'',apiKey:true,apiKeyStatus:'saved',observations:[],historyPartial:false,
 metrics:[metricSchema.parse({id:'anthropic.month',label:'This Month',amount:1.25,percent:null,periodSeconds:null,resetsAt:null,placement:'home',pinned:false,pinnable:false,hasData:true,unit:'dollars',values:[]})],
 history:[{date,tokens:900,cost:1.25,models:[{model:'claude-test',tokens:900,cost:null,variants:[]}]}]}];
 await mockDesktop(page,'en',false,state);await page.goto('/');
 await expect(page.locator('.dashboard')).toContainText('$1.25');
 await page.getByRole('button',{name:'Anthropic API',exact:true}).click();
 await expect(page.getByText('Organization Admin Key',{exact:true})).toBeVisible();
 await expect(page.getByText('Reads organization-wide API usage and costs.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Back',exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();
 await page.getByRole('menuitem',{name:'Usage Statistics',exact:true}).click();
 await expect(page.getByText('Official API reports use UTC',{exact:false})).toBeVisible();
 await expect(page.locator('.preview-page:not([hidden])').getByText('$1.25',{exact:true}).first()).toBeVisible();
});
