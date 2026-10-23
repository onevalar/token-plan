import {test,expect} from '@playwright/test';
import {mockDesktop} from './mock';
test('notifications and shortcut persist through shared settings',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'通用设置'}).click();
 await page.getByRole('switch',{name:'开启通知',exact:true}).click();await expect(page.getByRole('switch',{name:'即将用完',exact:true})).toBeChecked();
 const field=page.getByRole('button',{name:'录制快捷键',exact:true});await field.click();await page.keyboard.press('Control+Shift+K');await expect(field).toContainText('Control+Shift+KeyK');
 await expect.poll(()=>page.evaluate(()=>(window as any).__shortcutPaused)).toBe(false);
 await page.getByRole('button',{name:'清除快捷键',exact:true}).click();await expect(field).toContainText('录制快捷键');
});
test('daily history expands real model amounts',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-10-20T12:00:00Z'));
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'用量统计'}).click();
 await page.locator('.day-trigger').first().click();
 await page.locator('.entry-trigger').first().click();
 const model=page.getByRole('listitem').filter({hasText:'claude-test'});await expect(model).toContainText('1,200 token');await expect(model).toContainText('$1.20');
});

test('retired cloud state cannot expose synchronization controls',async({page})=>{
 await mockDesktop(page,'zh-Hans',true);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'通用设置'}).click();
 await expect(page.getByText('iCloud',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('switch',{name:'跨 Mac 同步',exact:true})).toHaveCount(0);
});
