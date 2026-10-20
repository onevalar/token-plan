import {test,expect} from '@playwright/test';
import {mockDesktop} from './mock';
test('notifications and shortcut persist through shared settings',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'通用设置'}).click();
 await page.getByRole('switch',{name:'即将用完',exact:true}).click();await expect(page.getByRole('switch',{name:'即将用完',exact:true})).toBeChecked();
 const field=page.getByRole('textbox',{name:'显示或隐藏 TokenPlan',exact:true});await field.focus();await page.keyboard.press('Control+Shift+K');await expect(field).toHaveValue('Control+Shift+KeyK');
 await page.getByRole('button',{name:'清除快捷键',exact:true}).click();await expect(field).toHaveValue('');
});
test('daily history expands real model amounts',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'服务配置'}).click();
 await page.locator('.history').getByRole('button',{name:'2026-10-20 +',exact:true}).click();
 await expect(page.locator('.model-history-row')).toContainText('claude-test');await expect(page.locator('.model-history-row')).toContainText('$1.20');
});
