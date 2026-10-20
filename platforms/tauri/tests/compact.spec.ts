import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';

const noOverflow=async(page:Page)=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
async function configure(page:Page) {
 await page.getByRole('button',{name:'更多',exact:true}).click();
 await page.getByRole('menuitem',{name:'服务配置',exact:true}).click();
 await expect(page.getByRole('menu',{includeHidden:true})).toHaveCount(0);
}
for(const colorScheme of ['light','dark'] as const)for(const width of [390,480]){
 test(`month of history and seven accounts ${colorScheme} ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:680});
  await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
  await mockDesktop(page,'zh-Hans',false,largeDesktop());
  await page.goto('/');
  await expect(page.locator('.account-block')).toHaveCount(7);
  await expect(page.locator('.family-heading')).toHaveCount(1);
  await expect(page.locator('.metric[data-tone="critical"]')).toHaveCount(1);
  await expect(page.locator('.metric[data-tone="warning"]')).toHaveCount(1);
  await expect(page.getByText('Fable',{exact:true})).toHaveCount(0);
  await expect(page.locator('.metric-chart svg circle')).toBeVisible();
  // Previously the charts alone occupied 60px, independent of row height.
  for(const chart of await page.locator('.metric-chart svg').all())expect((await chart.boundingBox())!.height).toBeLessThanOrEqual(28);
  const arrows=await page.locator('.detail-button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().right));
  expect(Math.max(...arrows)-Math.min(...arrows)).toBeLessThan(1);
  await noOverflow(page);
  await page.screenshot({path:info.outputPath('dashboard.png'),fullPage:true,animations:'disabled'});
  await configure(page);
  await expect(page.locator('.history-day')).toHaveCount(0);
  await expect(page.locator('.service-row')).toHaveCount(7);
  await expect(page.getByText('Cursor',{exact:true})).toHaveCount(0);
  await noOverflow(page);
  expect(await page.locator('main').evaluate(n=>n.scrollHeight)).toBeLessThan(1000);
  await page.screenshot({path:info.outputPath('configuration.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'查看历史',exact:true}).click();
  await expect(page.locator('.history-day')).toHaveCount(7);
  await expect(page.locator('.history-entry')).toHaveCount(0);
  await expect(page.locator('.pagination').first()).toContainText('1 / 5');
  await page.getByRole('button',{name:'下一页',exact:true}).click();
  await expect(page.locator('.pagination').first()).toContainText('2 / 5');
  await page.getByRole('button',{name:'上一页',exact:true}).click();
  await page.locator('.history-day-trigger').first().click();
  await expect(page.locator('.history-entry')).toHaveCount(7);
  await expect(page.locator('.history-day-trigger > span > span > span[aria-hidden="true"]')).toHaveCount(0);
  await page.evaluate(()=>window.scrollTo(0,0));
  await noOverflow(page);
  await page.screenshot({path:info.outputPath('history.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'返回',exact:true}).click();
  await page.getByRole('button',{name:'添加服务',exact:true}).click();
  await expect(page.locator('.available-services .service-row')).toHaveCount(8);
  await page.getByRole('textbox',{name:'搜索服务',exact:true}).fill('Cursor');
  await expect(page.locator('.available-services .service-row')).toHaveCount(1);
  await page.locator('.available-services').getByRole('switch').click();
  await expect(page.locator('.service-settings > .service-row')).toHaveCount(8);
 });
}
test('service movement skips saved inactive accounts',async({page})=>{
 const data=largeDesktop();
 const inactive=data.accounts.pop()!;
 data.accounts.splice(1,0,inactive);
 await mockDesktop(page,'zh-Hans',false,data);
 await page.goto('/');await configure(page);
 await page.locator('.service-settings > .service-row').nth(1).getByRole('button',{name:/上移/}).click();
 await expect(page.locator('.service-settings > .service-row').first()).toContainText('second.with.a.long.address@example.com');
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(page.locator('.account-block').first()).toContainText('second.with.a.long.address@example.com');
});
