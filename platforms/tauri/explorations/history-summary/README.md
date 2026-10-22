# 历史汇总样式比较

**状态：用户尚未选择。独立探索，未上线，不接正式设置。**

保留三个方案及原有 explorations。正式功能没有导入这里的代码；没有改动 `src`、依赖清单、旧原型或其他工作者目录。没有提交或推送。

## 打开与比较

沿用已运行的 Vite 服务，路径为 `/explorations/history-summary/`，无需额外服务或构建。

- 默认 390 × 704px 详情框，可选 360 / 390 / 480px。
- 底部切换器、数字键 `1–3`、左右箭头切换；输入控件操作不触发全局快捷键。
- `?v=1`、`?v=2`、`?v=3` 可直接打开相应方案，刷新保留方案编号。
- 每次只展示一个方案；主题和场景是比较工具，不写入产品设置。
- 窄屏与长内容可滚动。底部切换器按既定规范悬浮；继续滚动可露出被它暂时经过的正文。

| 方案 | 探索重点 | 代价 |
| --- | --- | --- |
| 现有汇总 | 直接导入正式 `src/preview/HistoryPage.tsx` 导出的 `HistorySummary`，保留当前范围按钮、费用、token 合计与小柱图 | 最紧凑，但不提供每日精确数值；覆盖与未知费用的说明较简略 |
| 数字摘要 | 静态大数字，日期边界、记录天数、已知费用覆盖独立说明 | 清晰但不展示每日分布，纵向空间更多 |
| 每日概览 | 带刻度的日柱图，未知问号与真实零圆点，可展开逐日精确数值 | 更容易比较每日用量，但占用更多空间 |

本轮只比较历史汇总。参考组件保持原样，包括其未知费用的破折号和真实零的最小可见柱高；新方向不复制这些表现。

## 数据含义与时间

- `data.ts` 使用现有 `accountSchema` 验证全部虚构账号；历史记录符合 `Account['history']`。
- token 和费用是明确写出的虚构数值对，不推算未知费用，不引用真实账号或模型价格。
- 正常 30 天合计：**1,664,000 tokens / $16.64**。今天 **42,000 / $0.42**，昨天 **78,000 / $0.78**。
- 缺日场景只保留 24 天：**1,348,000 / $13.48**；6 个日期保留未知，不生成零记录。
- 全未知费用保留 `null`，显示“未知”，而不是免费或 `$0.00`。
- 部分费用场景只有 15 / 30 条费用已知：**$8.14**。`historyPartial` 同时明确标记来源不完整；这不是全量账单。
- 全零场景有 30 条明确的零 token / 零费用记录，与缺日和空状态不同。
- 设备场景有两个同 family 的虚构账号共享历史，经正式 `historyRows` 去重后仍是正常场景的单份合计。
- 新方案通过正式 `historyRange` / `historyBounds` / `summarizeHistory` 读取及汇总，沿用 account/device 去重语义。
- 不使用 `tests/fixtures/designPreview.ts`，避免其 `null cost → 0` 行为。
- 每日 tokens 是已记录的使用量，不是套餐额度、剩余额度、使用率或真实账单趋势。

日期不是固定旧日期。页面挂载后读取浏览器本地时钟，固定数值按“距今天多少日”整体平移；同一次渲染用同一个 `now` 创建记录及计算新方案的范围。正式 `HistorySummary` 使用同一个真实本地日历，未替换全局 Date。

`useLocalDay` 在下一个本地午夜和窗口重新聚焦/恢复可见时更新，避免长期开着页面后日期过期。已用浏览器时钟验证 2035-12-31 跨到 2036-01-01，覆盖 UTC、上海和洛杉矶三个时区，三个方案均保持数据有效。

场景包括完整、真实零、缺日、全部未知费用、部分费用、空、读取失败、长内容、设备去重和模拟读取中。失败与模拟读取状态不展示虚假的零总量；恢复按钮只恢复固定示例。模拟读取由按钮完成，不声称有真实网络请求。

## Arc 来源与适配

2026-10-22 先通过 Arc MCP `get_skill({id:'SKILL'})`、`search_components`、`get_component` 核实免费组件文档/API，再阅读 registry 中的完整 TSX/CSS 源码：

- [Metric Card 文档](https://uiarc.dev/components/metric-card) / [免费源码](https://uiarc.dev/r/metric-card.json)
- [Bar Chart 文档](https://uiarc.dev/components/bar-chart) / [免费源码](https://uiarc.dev/r/bar-chart.json)
- [Arc Checklist](https://uiarc.dev/r/skills/arc/checklist.md)

适配仅在当前目录内：

- `Summaries.tsx`：保留 Metric Card 的 article、label、value、context 结构和语义 token。去掉 AnimatedCounter、change chip 和裁剪，改用静态可换行读数；未知费用不是数字 prop 的替身。
- `Daily.tsx`：沿用 Bar Chart 的 `scaleFor`、圆头 `barPath`、58% 柱宽与 28 单位上限。使用静态 SVG，保留每日槽位；`tokens === null` 不进入柱形计算。零值只标圆点。去掉动画、平均线与 scrubber，避免不完整日期上的“日均”误导。精确数据用可展开的原生只读表格提供，无排序需求。
- 比较控件直接使用项目已有 Arc `Button`、`Select`、`Switch`，已阅读本地真实实现，不猜 props，不修改内部样式。
- 不执行 shadcn 安装：所需控件已存在，用户明确禁止改依赖或 `src`。没有复制或重建 Pro 组件，没有新依赖、Tooltip 或计数动画。
- 沿用 detail-benefits 的独立入口结构、真实 Geist/Inter 字体、foundation/product/preview 样式及 390 × 704px 框架。底部 Picker 按既定实现只改三个名称；桌面布局保留 flex-wrap 以适应放大。
- 新方向 CSS 仅作用于 `.hs-candidate`；比较环境样式作用于 `.hs-lab`。不覆盖正式 `.usage-summary`。

## 验证

在 `platforms/tauri` 执行：

```sh
npx --no-install tsc --noEmit -p explorations/history-summary/tsconfig.json
git diff --check -- explorations/history-summary
```

均通过。项目没有独立 lint script；执行了 Arc 要求的原始颜色、字体粗细、非 token、outline、渐变、破折号和 `100vw` 检索，新候选代码无命中。没有运行会触发 localization sync 的 `npm build`。

浏览器验证用 `node --input-type=module` 内联 Playwright 脚本和既有 Chromium，不保留临时测试文件：

| 检查 | 结果 |
| --- | --- |
| 3 方案 × 10 场景 × 双主题；有数据/空场景遍历三个范围，读取/失败验证恢复 | 156 状态，853 断言通过，console/page errors 为 0 |
| 3 方案 × 双主题 × 3 面板宽度 × 6 浏览器宽度，长内容；加 200% CSS zoom 和 200% 根字体 | 110 布局状态，326 断言通过，无横向溢出 |
| 数字键、箭头、URL 刷新、无效 URL 回退、菜单键盘/焦点返回、Space 切主题、范围焦点、表格 Enter/Space、重试与 Tab | 27 断言通过 |
| 3 时区 × 3 方案，未来日期跨本地午夜 | 9 场景，36 断言通过 |
| Chromium 触屏模拟，验证 coarse pointer、点击范围/展开/主题 | 4 断言通过 |
| 浅深主题 × neutral/blue，文字与图形 token 对比度 | 12 检查通过；正文最低 7.11:1，柱图最低 5.25:1 |
| 最后再核对 10 组 fixture 合计、缺口/零标记和默认按钮未被裁切 | 22 断言通过 |

录屏使用唯一 `AGENT_BROWSER_NAMESPACE=hs-lab`、`ACTION_VIDEO_SESSION=hs`，agent-browser 0.38.1，真实桌面指针路径，2× DPR。完成后已关闭该 session。

## 审阅证据

全部位于仓库根目录 `.amp/in/artifacts/history-summary/`，已通过 view_media 检查：

- `default-1.png` / `default-2.png` / `default-3.png`：三个默认方案，1280 × 1200 CSS px、2× DPR。
- `daily-gaps-dark-360.png`：缺 6 天，360px 深色。
- `daily-zero.png`：真实零点与 `$0.00`。
- `summary-unknown-cost.png` / `summary-partial-cost-dark.png`：未知与部分费用。
- `summary-empty.png` / `read-error.png`：空与失败。
- `daily-long-480.png` / `daily-records-expanded.png` / `narrow-390.png`：长内容、展开精确值与窄屏。
- `history-flow.mp4` / `history-flow.loop.webp`：真实指针切换三个方案、展开并滚动每日记录。
- `history-flow-raw.mp4`：原始录制；`history-flow-contact.jpg`：5fps 检查接触表，末尾空格是 tile 填充，不是页面黑屏。

## Arc Checklist 复查

- [x] Find：先核实免费 Metric Card / Bar Chart 的使用场景、API 和源码。
- [x] Install/Wire：复用已安装组件，foundation 只导入一次；没有额外依赖或虚构 props。
- [x] Type/Copy：静态等宽数字，400/500 字重、token 字号；清楚区分记录、账单、未知与零。
- [x] Color/Surfaces：新候选仅语义 token、1px 边界，无装饰渐变/阴影或嵌套装饰卡片。
- [x] Layout/Responsive：单页面容器，窄屏、长内容、360/390/480、768/1024/1440、双主题和放大已检查。
- [x] States：正常/空/失败/未知/部分/零/长内容/模拟读取可操作；没有假成功或假服务请求。
- [x] Motion/React：图表和读数静态；既有控件及 Picker 保留 reduced-motion；浏览器时钟只在挂载后参与渲染。
- [x] Accessibility：命名控件、原生按钮/只读表格、未知形状标记、错误播报；键盘/触屏和恢复焦点已验证。

限制与明确例外：规定的底部 Picker 高 28px，正式参考范围按钮也是既有尺寸，未为满足 44px 建议而改写它们；新方案范围/展开/恢复按钮使用 44px Arc 默认尺寸。正式参考的行为和样式缺点不在原型里偷偷修复。模拟读取没有真实请求/骨架加载承诺。200% 是 CSS 页面缩放与根字体测试，不是原生浏览器菜单缩放。未在原生 macOS WebView、Safari 或真实屏幕阅读器上验证，触屏为 Chromium 模拟；本轮中文原型尚未接正式五语言流程。

**设计决定仍为空。等待用户选择，不能把任一新方案当成已批准的产品设置。**
