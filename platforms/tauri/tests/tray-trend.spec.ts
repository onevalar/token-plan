import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
import {textFor} from '../src/copy';
import {messages} from '../src/i18n';
import translations from '../src/provider-translations.json' with {type:'json'};

test.use({viewport:{width:390,height:680},deviceScaleFactor:2,reducedMotion:'reduce'});
test.beforeEach(async({page},info)=>{
 await page.addInitScript(platform=>{(window as any).__panelFrame={platform,rounded:platform!=='linux'};},String(info.project.metadata.platform??'macos'));
 await page.clock.setFixedTime(new Date(2026,9,24,12));
});
const tr=(key:string,language:string)=>(translations as Record<string,Record<string,string>>)[language]?.[key]??key;
async function settings(page:Page,language:string){await page.getByRole('button',{name:messages(language).more,exact:true}).click();await page.getByRole('menuitem',{name:textFor(language).settings,exact:true}).click();}
function data(){
 const s=largeDesktop();s.accounts=s.accounts.slice(0,2);
 for(const a of s.accounts){
  a.tray=true;a.historyScope='device';a.historyPartial=true;
  a.metrics=a.metrics.slice(0,2).map((m,i)=>({...m,pinned:true,percent:i?82:37,hasData:true}));
  a.history=[2400,4800,0,8300,2000,6500,0,4400,2200,8900,3900,5100,11200,12500]
   .flatMap((tokens,i)=>[4,5,9].includes(i)?[]:[{date:`2026-10-${11+i}`,tokens,cost:null,models:[]}]);
 }
 return s;
}

for(const language of ['en','zh-Hans','zh-Hant','ja','ko'])test(`native trend setting preserves readings, gaps and platform policy in ${language}`,async({page},info)=>{
 const s=data();await mockDesktop(page,language,false,s);await page.goto('/');await settings(page,language);
 const choice=page.getByRole('combobox',{name:tr('Menu Bar Style',language),exact:true});
 if((info.project.metadata.platform??'macos')!=='macos'){
  await expect(choice).toHaveCount(0);await expect(page.locator('.menu-bar-preview')).toHaveCount(0);return;
 }
 await choice.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('option',{name:textFor(language).ring,exact:true})).toBeFocused();
 await page.keyboard.press('End');
 await expect(page.getByRole('option',{name:tr('Token Trend + Values',language),exact:true})).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(choice).toContainText(tr('Token Trend + Values',language));
 expect(await page.evaluate(()=>(window as any).__requests.filter((r:any)=>r.method==='settings'))).toContainEqual({method:'settings',value:{trayStyle:'sparkline'}});
 await expect(page.locator('.ring-layout-picker')).toHaveCount(0);
 const glyphs=page.locator('.menu-bar-preview .tray-glyph'),graph=glyphs.first().locator('.tray-sparkline');
 await expect(graph).toHaveCount(1);await expect(glyphs.nth(1).locator('.tray-sparkline')).toHaveCount(0);
 await expect(graph.locator('circle')).toHaveCount(11);
 const path=await graph.locator('path').getAttribute('d');expect(path!.match(/M/g)).toHaveLength(3);
 await expect(glyphs.first().locator('.tray-trend-values > span').first()).toHaveText(`12.5k ${tr('tokens',language)}*`);
 await expect(glyphs.first().locator('.tray-trend-values > span').last()).toHaveText('37% · 82%');
 await page.getByRole('switch',{name:textFor(language).showRemaining,exact:true}).click();
 await expect(glyphs.first().locator('.tray-trend-values > span').last()).toHaveText('63% · 18%');
 await expect(graph.locator('path')).toHaveAttribute('d',path!);
 await expect(glyphs.nth(1).locator('.tray-values')).toHaveText('63%18%');
 for(const colorScheme of ['light','dark'] as const){
  await page.emulateMedia({colorScheme});await page.setViewportSize({width:360,height:680});
  await page.locator('.menu-bar-preview').scrollIntoViewIfNeeded();
  expect(await page.locator('.preview-page:not([hidden])').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  expect(await graph.evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);
  await page.screenshot({path:info.outputPath(`trend-${language}-${colorScheme}.png`)});
 }
 // A rejected helper write must not optimistically replace the active native style.
 await page.evaluate(()=>(window as any).__failNextRequest=true);
 await choice.click();await page.getByRole('option',{name:textFor(language).percentage,exact:true}).click();
 await expect(page.getByRole('alert')).toBeVisible();await expect(choice).toContainText(tr('Token Trend + Values',language));
 await choice.click();await page.keyboard.press('Escape');expect(await page.evaluate(()=>(window as any).__panelHides??0)).toBe(0);
});

test('reopened settings restore the helper style; missing history is not a zero trend',async({page},info)=>{
 test.skip((info.project.metadata.platform??'macos')!=='macos','Menu-bar metrics are macOS only.');
 const s=data();s.accounts=s.accounts.slice(0,1);s.settings.trayStyle='sparkline';s.accounts[0].history=[];
 s.accounts[0].metrics[0].hasData=false;
 await mockDesktop(page,'en',false,s);await page.goto('/');await settings(page,'en');
 await expect(page.locator('.menu-bar-preview .tray-sparkline')).toHaveCount(0);
 await expect(page.locator('.menu-bar-preview .tray-values')).toHaveText('—82%');
 await page.reload();await settings(page,'en');
 await expect(page.getByRole('combobox',{name:'Menu Bar Style',exact:true})).toContainText('Token Trend + Values');
 await expect(page.locator('.menu-bar-preview .tray-sparkline')).toHaveCount(0);
});
