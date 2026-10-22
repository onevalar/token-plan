# 账号资料阅读组织比较

**状态：仍在探索，用户尚未选定。** 三个方案全部保留；本地预览不等于正式账号设置，不会登录、刷新、修改账号或保存产品偏好。只读虚构数据，不是线上账号或连接成功的证明。

## 入口与操作

在已有 Vite 服务下打开 `/explorations/account-profile/`。不需要新服务、构建或本地化生成。

- `?v=1`：现有身份行；`?v=2`：分项资料；`?v=3`：展开摘要。
- 底部保留规定的深色 picker，点击、`1–3`、`←`/`→` 均可切换；刷新保留 URL 中的方案。
- 场景、宽度和主题也可以放进 URL，例如 `?v=3&scenario=warning&width=360&theme=dark`。
- 备注按钮：`Enter` / 空格展开与收起；`Esc` 收起并将焦点归还按钮。
- 40 行备注：基线沿用整面板滚动；新方案使用可聚焦的备注滚动区，`Tab` 进入、`Ctrl+End` 到末尾。不是文本编辑器。
- 比较控件使用 Arc Select、Switch；输入控件中的方向键不会切换方案。

## 三种方向与代价

| 方案 | 探索的差异 | 适合 | 代价 |
| --- | --- | --- | --- |
| 现有身份行 | 居中邮箱和套餐，备注与更新时间留在额度、余额下方 | 保持熟悉的紧凑顺序 | 资料分散；保留现有长套餐不换行限制 |
| 分项资料 | 邮箱、套餐、备注、更新时间集中成只读 `dl/dt/dd` | 逐项确认信息 | 标签与备注占更多纵向空间，把额度推下去 |
| 展开摘要 | 身份、套餐、更新时间常显，仅已有备注可展开 | 先看身份与额度，按需读备注 | 多一次操作；短备注也需要展开 |

不预先推荐赢家。账号资料可以独立于额度、余额、历史和模型区域选择，不绑定为整页主题。

## 边界与基线真实性

- `Baseline.tsx` 直接保留正式 `src/preview/AccountDetail.tsx` 的 `detail-identity`、`plan-tag`、备注 section 和 `last-updated` HTML 结构，加载未改动的正式 `style.css` / `preview.css`。中文“最近更新”与正式翻译一致。
- 三种方案共用相同的账号标题和真实 `MetricRow` 只读额度/余额片段。固定 390×704 面板，宽度可选 360 / 390 / 480。
- 这是局部阅读组织比较，不是整个正式详情页的截图：未加入配置、登录引导、历史、模型或刷新按钮，没有渲染整页后隐藏内容，也没有修改正式导出。
- 原样基线的 `plan-tag` 使用 `white-space: nowrap`；360px 长套餐样例会越界。**故意不修饰基线**，在比较工具里说明该限制并展示完整套餐原文；两个新候选完整换行。
- 原样备注 `<p>` 沿用正常空白折叠，不额外修改其换行规则。新候选保留备注里的换行。
- 账号名、邮箱、套餐不放进 disclosure；错误与警告放在折叠区外，沿用正式错误优先于 warning 的规则。
- 没有备注就没有展开按钮；缺失字段不补写值，也不增加未知头像、人名、支付、续期、订阅管理、来源或连接徽章。
- `fetchedAt` 只用于上次更新时间，不推断连接失效或已经连接。

## 文件组织

- `main.tsx`：独立入口、场景 / 主题 / 宽度工具、固定尺寸外壳。
- `Picker.tsx`：规定的独立比较工具，增加从预览内切换时的焦点归还。
- `Baseline.tsx` / `Fields.tsx` / `Summary.tsx`：三个独立候选。
- `data.ts`：使用正式 `Account` / Zod schema 的 typed synthetic fixtures。
- `shared.tsx`：不变的额度片段、状态、时间和备注读取。
- `profile.css`：只作用于新候选，不覆盖基线选择器。
- `lab.css`：独立预览外壳与规定的 picker。
- `arc/expandable-card.{tsx,module.css}`：Arc 免费源码，仅改 motion tokens 的相对导入并补充来源注释。
- `index.html` / `tsconfig.json`：独立 Vite 页面与聚焦类型检查。

没有修改正式 `src`、依赖清单、其他探索目录或正式设置，没有新增依赖。

## Arc 依据

已通过 Arc MCP 读取 `SKILL`、`components`、`checklist`，搜索 `description list` 和 `expandable card`，并读取两个候选的 API：

- [Expandable Card](https://uiarc.dev/components/expandable-card)：免费；一张概要卡片按需揭示已有内容，支持原生按钮、`aria-expanded` / `aria-controls`、折叠 `inert`、Esc 焦点返回、reduced motion。采用此项。
- [Expandable Text](https://uiarc.dev/components/expandable-text)：免费；适用于正文截断，不应用于必须完整阅读的错误。未采用，避免引入第三种文字裁切规则。
- 免费目录没有找到适合的 description-list 组件，因此分项资料使用语义化原生描述列表，不猜测组件名或 API，不模仿 Pro 设置页。
- 实际源码：[expandable-card registry JSON](https://uiarc.dev/r/expandable-card.json)，读取日期 2026-10-22。没有执行 shadcn 安装，因为用户限制写入独占目录且现有依赖已满足。
- 字体、语义 tokens、Select、Switch、provider logo、MetricRow 和 motion tokens 来自正式项目，只有读取导入。

## Fixtures

`normal`、`missing`、`empty-note`、`long`、`multiline`、`forty`、`error`、`warning`、`no-time`。

涵盖正常资料、多字段缺失、空备注、长账号名/邮箱/套餐、多段备注、40 行备注、错误、长 warning、无更新时间。错误样例将指标标为 `hasData: false`，保留在 fixture 中的旧金额不当成当前余额显示。

## 验证结果

2026-10-22，在 Linux orb 的 Chromium 中验证；不是原生 Mac/Windows 运行验收。

```sh
# cwd: platforms/tauri
npx --no-install tsc --noEmit -p explorations/account-profile/tsconfig.json
```

结果：通过。未运行禁止的 `npm build` / 本地化生成。仓库没有独立 lint script；已执行类型检查、CSS/copy sweep 和 diff whitespace 检查。

浏览器 namespace `ap-lab`、session `ap`，最多一个活跃会话；完成后已关闭。

- 3 方案 × 9 场景 × 2 主题，**54 组检查通过**：字段全文、缺失字段、错误/warning 不在 inert 区、无更新时间不补写、空备注无按钮、错误不显示旧余额、新方案无横向溢出。
- 320、390、768、1024、1440px 浏览器宽度 × 3 方案，**15 组通过**：页面无横向滚动。基线内部的长套餐越界作为原样限制另行记录，不掩盖为通过。
- 实际控件操作通过：场景选择、480px 宽度、深色开关、URL 更新；键盘选择场景不抢占全局方案快捷键。
- Enter、空格、快速反向、Esc、焦点归还、折叠 inert、方向键切换时焦点留在 picker、数字快捷键、刷新恢复方案均通过。
- 40 行备注末行完整保留；键盘滚动达到 `scrollTop: 1671` / `max: 1672`（取整差异），截图可读第 40 行；基线长备注整面板也能键盘滚动。
- reduced motion 下展开与关闭、内容可见性、Esc 焦点返回均通过。
- 新候选在 200% 根字号下仍完整换行，无横向溢出。
- 对比度使用浏览器实际 CSS 颜色经 canvas 转为 sRGB 后按 WCAG 相对亮度测量：分项标签浅色 **7.11:1** / 深色 **8.89:1**，值浅色 **19.68:1** / 深色 **16.46:1**。这是抽样文字测量，不是整页完整审计。
- 最终清空日志后重新载入检查：无 console error、无运行时异常。reduced-motion 验证时只有 Motion 的预期说明 warning。
- 截图均为 DPR 2；已用 `view_media` 检查每个状态及最终更新后的总览。录屏经 5fps contact sheet 检查，显示真实移动指针、方案切换、展开与最终收起。

测试过程中两次过快的控件/滚动断言没有等待浏览器滚动或 Radix popup 收尾；改为等待实际状态后通过，没有因此修改产品组件。录屏第一次启用 `--restore` 导致空页，重新打开预览后已重录覆盖，不交付失败录屏。

## 审查清单

- [x] Explore / ui-design：先明确三个不同组织方向，保留基线与用户决定权。
- [x] Typography / color：沿用字体与 tokens，长文本换行，真实文字抽样对比度。
- [x] Borders / animations：沿用 Arc 免费组件表面与 motion tokens，不增加装饰动效；reduced motion 可操作。
- [x] Accessible interactions / ui-details：焦点、Esc、inert、完整状态文本、长备注滚动、深色、窄屏检查。
- [x] Arc find / wire / compose：MCP 确认 API，真实字段语义，免费源码来源清楚，不仿 Pro。
- [x] Arc copy / CSS sweep：候选无新 raw colors、渐变、粗字重或手制 focus ring；规定 picker 的固定颜色、13px、28px 控件和 ring 是明确例外。
- [x] 不创造操作：没有假编辑、刷新、登录、重试或成功反馈；加载/保存/禁用等异步流程不在此只读原型范围。
- [x] 样式例外透明：原样基线保留正式 px 尺寸与长套餐限制；Arc 原源码的 resting shadow 保留，未越权全局改造。
- [ ] 真机触屏、屏幕阅读器、Safari 与原生桌面壳未验证；中文独立原型不代表五语言正式实现。
- [ ] 用户尚未选择，不进入正式采用或删除探索阶段。

## 媒体

均在仓库根目录 `.amp/in/artifacts/account-profile/`：

- `01-baseline-light.png`、`02-fields-light.png`、`03-summary-light.png`：三种正常资料方案。
- `04-fields-long-dark.png`：360px 深色长账号名/邮箱/套餐。
- `05-summary-warning-dark.png`：warning 不被折叠。
- `06-summary-error.png`：错误与未知余额。
- `07-summary-empty-note.png`：没有空展开按钮。
- `08-forty-narrow-dark.png`：窄屏深色，完整备注滚动到第 40 行。
- `09-summary-missing.png`：只保留提供的账号名，不伪造资料。
- `walkthrough.mp4` / `walkthrough.loop.webp`：11.3 秒，2560×2000，真实移动指针切换三方案、展开备注、Esc 收起。
- `walkthrough-contact.jpg`：5fps 检查 contact sheet。
- `walkthrough-raw.mp4`：保留的原始录屏。

统一入口与跨区域组合验收由父任务处理；本目录不导入其他工作者的新候选，也不修改他们的文件。
