# 模型用量明细：隔离比较原型

**状态：尚未被用户选定。三种方案全部保留，没有接入正式设置。**

只探索一个明确记录日、一个账号或本机设备来源内的模型记录。其他详情区域可以独立选择样式，不把整页绑定为一个主题。没有修改生产代码、依赖 manifest、其他探索目录；没有安装依赖、执行产品构建或生成本地化。

## 打开与操作

复用已有 `tokenplan-usage-lab` Vite 服务，路由为 `/explorations/model-breakdown/`。不要另起服务。

- `?v=1` 原样列表；`?v=2` 横向排名；`?v=3` 构成环形。
- 底部 picker、数字 `1–3`、左右箭头切换；原生输入/Select/Switch 获得焦点时不抢键。
- `v`、`scenario`、`width`、`theme`、`scope` 写入 URL，刷新后保留。没有正式偏好写入。
- 例如 `?v=3&scenario=missing&width=360&theme=dark&scope=device`。
- 预览面板默认 390 × 704，支持 360 / 390 / 480px。窄浏览器会进一步收缩至可用宽度。
- 可展开变体与精确读数；错误、空、加载状态的按钮只载入本地合成数据，文案明确这一点。

| 方案 | 用途 | 代价 |
| --- | --- | --- |
| 现有列表 | 保留正式 model-record 的紧凑名称、费用、tokens、variants 结构 | 比较大小需要逐条读数；紧凑格式的精确值放在附加的原生 details 中 |
| 横向排名 | 按已记录 tokens 降序，共用从 0 开始的绝对数量刻度 | 行高更大，需要滚动；它不是份额图或套餐进度 |
| 构成环形 | 对少量模型解释同一份记录的构成，精确 tokens、费用、份额常显 | 环和图例占空间；非零部分超过六个时说明原因并回到全部列表 |

## 来源与隔离

- `Classic.tsx` 的 `model-record` JSX、`money`、`number` **逐字复制**自 `src/preview/HistoryPage.tsx` 的内部模型记录块；直接导入正式 `preview.css` 的 `.model-record` 样式。没有改变生产导出，也没有挂载整页后用 CSS 隐藏其他区域。
- 基线外的说明和 `ExactReadings` 是本轮附加物，不改变正式模型行。未知费用在基线继续显示原有 `—`，旁边解释其含义；新方案直接显示“费用未知”。
- fixtures 使用 `Account['history'][number]['models'][number]`，经正式 `accountSchema` 校验，再调用正式 `historyRows([account], 'all')`。没有另造模型数据契约，也不重复计算 variants。
- `historyRows` 的 account/device owner 路径保持原样。设备示例不显示成某账号的专属记录，也不按账号再次相加。
- 读取了 `src/historyModel.ts`；本轮不调用依赖当前日期的范围过滤。固定记录日 `2026-10-21`，跨日仍有效，日期是来源记录日，未声称后端提供时区或逐时明细。
- 环境壳沿用 `detail-benefits/main.tsx` 的独立入口、Geist / Inter、Arc foundation / 产品 tokens、704px 面板；复用 `usage-candidates/prototype.css`、`detail-benefits/benefits.css`。这些旧文件只读，没有修改。
- `Picker.tsx` 沿用 detail-benefits 的结构和行为，只换三个名称。picker 外观按 explore 技能固定规范，不随主题改变。

## 合成证据，不是当前后端字段

`Fixture.coverage = { synthetic: true, totalTrusted, note }` 是**仅供此原型的合成 coverage 证据**，不属于当前 desktop schema；不能把“模型和总数恰好相等”当作真实来源完整的证据。`partial` 只是现有 `historyPartial` 的本地副本。

所有模型、账号、金额、日期、加载/错误状态都是合成的。没有后端请求，不代表这些模型的真实价格。

数据规则：

1. 份额只除以同日同来源的 `row.tokens`，界面明确显示分母。
2. 模型合计小于记录总数：差额显示为“未归类记录”，纳入环形和图例，费用未知。不把现有模型重新归一化成 100%。
3. 模型合计大于总数、总数不可确认、无效数量或全零：说明原因后回到列表，不画误导占比。排名在这些情况也保守回列表。
4. 来源不完整仍可描述这份记录内的构成，但只称“已记录 tokens 占比”，不是完整账号用量、套餐额度或总账单。
5. 不隐藏图例，不重新归一化，不显示费用合计。可空费用不是 0。
6. 没有最小条长/最小扇区填充；真实 0 的条宽是 0、无扇区。极小正值保留精确数字，图形可小于一个屏幕像素。
7. variants 是模型内部的细分，不再次加入总量。

## 场景覆盖

| `scenario` | 内容 / 预期 |
| --- | --- |
| `normal` | 37 / 22 / 19 / 14 / 8%，100,000 tokens，含两条 variants |
| `equal` | 四个模型各 25% |
| `missing` | 模型 78,000 / 总数 100,000；未归类 22,000 = 22% |
| `unknown-cost` | 全部模型及 variants 费用为 null，无 $0 填充 |
| `partial-cost` | 部分 null，不声称已知费用是总账单 |
| `partial-source` | 现有 `historyPartial: true`，已记录范围警示 |
| `zero` | 总数与模型为 0，费用仍未知，不画图 |
| `conflict` | 模型 100,000 > 总数 80,000，回列表 |
| `untrusted` | 数量相等但合成 coverage 无法确认总数，回列表 |
| `many` | 40 个模型、超长名称；排名保留 40 条，环形方案回列表 |
| `tiny` | 99,999 / 1 / 0 tokens，不抬高小值、不填充零值 |
| `loading` / `error` / `empty` | 状态分别表达，不伪造零用量；可载入本地示例 |

## Arc 核实与适配

执行了 MCP `get_skill('SKILL')`、`search_components`、`get_component('donut-chart')`、`get_component('bar-chart')`、`get_component('split-bar')` 和 `get_skill('checklist')`，并实际读取了免费 registry TSX 源码。

| 组件 | 判断 / 处理 |
| --- | --- |
| [Donut Chart（免费）](https://uiarc.dev/components/donut-chart) | 文档适用“一个整体的少数部分”，不用于额度。原生支持隐藏后重分配、hover lift、动画；本轮固定分母，不能原样保留这些行为。局部适配其累计角度和 annular sector 几何，取消间隔/圆角/悬停位移/动画/自动 Other 分组，精确值常显。坐标保留六位小数，只有完整一圈才走全环路径，避免吞掉极小值。 |
| [Bar Chart（免费）](https://uiarc.dev/components/bar-chart) | 原组件是逐日纵向柱图，不假装存在 horizontal 模式。本轮只复用其 `scaleFor` 纯刻度算法，配同一静态数量刻度的水平行；没有照搬时间轴、平均线或 scrubber。 |
| [Split Bar（Pro）](https://uiarc.dev/components/split-bar) | 其隐藏图例重排、悬停加宽不符合本轮固定几何与分母约束。**未复制、未适配、未使用 Pro 代码**，也没有构造一个仿制 SplitBar。 |
| Select / Switch / Button | 直接使用项目已有 Arc 组件与文档属性，无新增 tooltip |

源码：`https://uiarc.dev/r/donut-chart.json`、`https://uiarc.dev/r/bar-chart.json`，2026-10-22 核实。下载响应 SHA-256 分别为 `7f5c311af1d74c30af6bac9336f82b35b075a11375106d431daa7a53b49b8d6a`、`142e679514af4aab6cfeee4a69629f7b62887250584f4108d2c3ed45a9bbb463`。

有限静态适配位于 `arc/static-chart.tsx`，保留 [Arc 免费 MIT 许可](https://uiarc.dev/license)和 `Copyright (c) 2026 Elia Kuratli` 于 `arc/LICENSE`。未运行 shadcn 安装，因为本任务禁止修改共享依赖/组件目录；foundation 仅在入口导入一次。

## 已完成验证

在 Linux orb 的 Chrome 155、`AGENT_BROWSER_NAMESPACE=mb-lab` / session `mb` 中检查，使用 `/tmp/chrome-desktop-pointer.sh`，确认 fine pointer / hover，截图 DPR=2。会话结束后关闭。没有启动第二个浏览器会话。

```sh
# cwd: platforms/tauri
npx --no-install tsc --noEmit -p explorations/model-breakdown/tsconfig.json

# 复用已有服务；以下地址仅为 orb 内测试目标，不是对外分享 URL。
export AGENT_BROWSER_NAMESPACE=mb-lab
agent-browser --session mb --restore --executable-path /tmp/chrome-desktop-pointer.sh open 'http://127.0.0.1:1420/explorations/model-breakdown/?v=3&scenario=missing&width=360&theme=dark'
agent-browser --session mb --restore set viewport 1280 1024 2
agent-browser --session mb --restore eval '[...document.querySelectorAll(".mb-donut path")].map(p=>({model:p.dataset.part,share:+p.dataset.end-+p.dataset.start}))'
agent-browser --session mb --restore errors
agent-browser --session mb --restore close
```

- TypeScript：通过。此项目没有独立 lint script，没有运行 build 或本地化生成。
- 逐字检查：完整 `model-record` JSX 与两项 formatter 均在生产源码中原样找到。
- 42 个浏览器场景（14 × 3）：通过。交错覆盖 360 / 390 / 480 面板宽度、浅深主题、未知/部分费用、fallback、零/小值、不完整来源；无页面或面板横向溢出。
- 18 个窄屏检查（3 方案 × 360 / 390 / 480 / 768 / 1024 / 1440 浏览器宽度），使用 40 模型：全部通过，无横向溢出。
- 实际 SVG 几何：对 DOM 的每个 `d` 构造 `Path2D`，沿中径取 36,000 个角度采样，不只是检查 data 属性。normal 得到 37 / 22 / 19 / 14 / 8%；equal 各 25%；missing 得到 37 / 22 / 19 / **22% 未归类**。
- 实际条形 DOM 宽度：390px 面板的 340px track 上为 314.5 / 187 / 161.5 / 119 / 68px，恰为 tokens / 40,000。极小正值宽度 >0 且 <0.01px；真实零条宽度为 0。
- 键盘 1–3、左右箭头、Select 中不抢箭头、URL 刷新记忆、精确读数 Enter 展开、错误示例按钮、40 行 End 原生滚动：通过。滚动检查等待实际 scrollTop，不把浏览器滚动首帧当结果。
- reduced-motion：picker 的 transition 为 `0s`，数据图形原本即静态。控制台 errors 为空，未产生 tooltip/title。
- 实际颜色经 Canvas 转 sRGB 测 WCAG 对比：普通主文本浅/深 19.68 / 16.46，辅助文本 7.11 / 8.89，未归类图形 5.04 / 5.48；不是整页无障碍认证。
- 真实 pointer 录屏：列表 → 排名 → 展开变体 → 环形 → 选择缺失场景 → 深色 → 内部滚动；12.6 秒，2x，10fps。已用 5fps 接触表逐帧查看。Radix Select 退出期间的自动化点击曾被临时菜单遮挡，菜单退出后重试成功；录屏没有伪造交互。

证据在仓库 `.amp/in/artifacts/model-breakdown/`：

- `classic-390.png`、`ranking-390.png`、`composition-390.png`；汇总 `three-directions.jpg`。
- `missing-dark-360.png`、`missing-legend-dark-360.png`、`unknown-cost-480.png`、`conflict-fallback.png`。
- `forty-models-dark-360.png`（包含原生键盘焦点）、`loading.png`、`error.png`、`empty.png`；汇总 `data-states.jpg`。
- `comparison.mp4`、`comparison.loop.webp`、`comparison-raw.mp4`、`video-contact-sheet.jpg`。

## 结束 Checklist 与限制

- [x] 加载 explore、ui-design、typography、color、accessible-interactions、ui-details、performance；分别约束探索隔离、层级、精确数字、主题、键盘、边界状态及 40 行列表。不声称做了性能优化。
- [x] Arc Find → 有限本地适配 → 真实类型 wiring → 状态 compose → token/copy → checklist 复查完成。
- [x] 原样基线独立文件，新方案各独立文件；未复制 Pro；未添加依赖；没有 tooltip。
- [x] 同日同来源、固定分母、未归类差额、未知费用、不可信/全零回退经过浏览器验证。
- [x] 字号使用现有 tokens、400/500 字重、tabular nums；纯数字图表无持续动效；长名不截断；浅/深、窄屏、键盘已检查。
- [x] 所有方案保留，未替用户选定，未接正式设置。
- [ ] 真机触控、Safari、macOS Tauri、屏幕阅读器和真实后端证据尚未验证。
- [ ] 未做全页/所有色对的 WCAG 审计；目前沿用产品默认图表 palette，没有新增可选 accent 主题。
- [ ] 保持原样的 model-record 有固定小字号及较小 summary；按 explore 规范的 picker 为 28px 高。这些明确保留，不声称全部触控目标达 44px。
- [ ] 当前 `coverage` 没有生产来源。未来若采用环形，必须先确定真实来源完整性/分母可信度，不能直接把此合成字段当后端 API。

Arc checklist 的例外：基线 `—` 是生产未知值标记，不能为风格规则改掉；固定 picker 的颜色、字体、focus 和 transition 来自 explore 指定规范；未运行 shadcn 安装和产品构建是本次隔离约束。未测项如上，未把它们标为通过。
