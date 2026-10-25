import {test,expect} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
import {textFor} from '../src/copy';
import translations from '../src/provider-translations.json' with {type:'json'};
const providerText=(key:string,language:string)=>(translations as Record<string,Record<string,string>>)[language]?.[key]??key;

for(const language of ['en','zh-Hans','zh-Hant','ja','ko'])test(`saved key actions fit and confirm safely in ${language}`,async({page},info)=>{
 const data=largeDesktop(),a=data.accounts.find(a=>a.family==='deepseek')!;
 Object.assign(a,{apiKey:true,apiKeyStatus:'saved',enabled:true});data.accounts=[a];
 await page.addInitScript(platform=>(window as any).__panelFrame={platform,rounded:platform!=='linux'},String(info.project.metadata.platform));
 await mockDesktop(page,language,false,data);await page.goto('/');
 await page.getByRole('button',{name:'DeepSeek',exact:true}).click();
 const actions=page.locator('.preview-page:not([hidden]) .account-action-row'),remove=actions.locator('.remove-key-action');
 for(const theme of ['light','dark'] as const)for(const width of [350,390]){
  await page.setViewportSize({width,height:720});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  await expect(remove).toHaveAttribute('data-state','idle');
  const fits=await actions.evaluate(e=>Array.from(e.querySelectorAll('button')).every(b=>{
   const box=b.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(b);const content=range.getBoundingClientRect();
   return content.left>=box.left+3&&content.right<=box.right-3;
  }));expect(fits).toBe(true);
  const first=await actions.locator(':scope > button').first().boundingBox(),last=await remove.boundingBox();
  expect(last!.y).toBeGreaterThanOrEqual(first!.y+first!.height+7);
  await remove.getByRole('button',{name:textFor(language).clearKey,exact:true}).click();await expect(remove).toHaveAttribute('data-state','confirming');
  expect(await remove.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await remove.getByRole('button',{name:textFor(language).cancel,exact:true}).click();
  await expect(remove).toHaveAttribute('data-state','idle');
 }
 await page.waitForTimeout(300); // Let the cancelled confirmation face finish its exit before the visual capture.
 await actions.screenshot({path:info.outputPath(`key-actions-${language}.png`)});
 await remove.getByRole('button',{name:textFor(language).clearKey,exact:true}).click();
 // Respect ConfirmMorph's intentional protection against a double click deleting a key.
 await page.waitForTimeout(300);
 await remove.getByRole('button',{name:providerText('Confirm',language),exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__requests.filter((r:any)=>r.method==='key'&&r.value==='').length)).toBe(1);
});
