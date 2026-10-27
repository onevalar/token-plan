# GitHub 产品展示

README 使用一张循环 GIF、六张分类样式总览和一张统计 PNG；`docs/demo/` 是可独立部署的静态交互演示。所有账号、读数和费用均为示例数据，不请求真实账号或服务。保留组件许可于 `public/NOTICE.txt`。

演示复用 portfolio 的 TokenPlan 封面、用量样式和历史组件，没有复制项目介绍正文。交互演示保持原组件的布局和展开层级；统计不拆出模型图表、不拼接多窗口。用量样式另提供分类比较图，复用原 HomeMetrics 渲染器，列出全部 18 个主样式/子样式，并补充 6 个底纹横条例子；仅新增总览排版，不修改组件内部设计。portfolio 是构建输入，原文件不修改；发布产物不依赖访问 portfolio 仓库。

## 更新

在仓库根目录运行，先准备 `platforms/tauri` 已锁定的 npm 依赖以及 portfolio 自身依赖：

```sh
PORTFOLIO_DIR=/path/to/portfolio platforms/tauri/node_modules/.bin/vite build --config showcase/vite.config.mjs --configLoader runner
python3 -m http.server 1432 --bind 127.0.0.1 --directory docs/demo
```

另一个终端运行（需要 Chromium 与 FFmpeg；非 macOS 设置 `TOKENPLAN_TEST_BROWSER`）：

```sh
node showcase/export.mjs
ffmpeg -y -framerate 15 -i dist/showcase-frames/frame-%03d.png -filter_complex '[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle' -loop 0 assets/showcase/cover.gif
```

脚本检查样式切换、用量滑块、统计展开、手机溢出和减少动态效果；导出后仍需检查截图和动画。`CHECK_ONLY=1 SHOWCASE_URL=https://onevalar.github.io/token-plan/ node showcase/export.mjs` 只检查在线演示，不覆盖发布图片。

提交 `docs/demo/` 的已构建文件及 `assets/showcase/` 展示素材。Pages 工作流仅发布 `docs/demo/`，不构建应用、不发布安装包，也不暴露整个文档目录。

仅更新静态图片及检查交互可运行 `STILLS_ONLY=1 node showcase/export.mjs`，不会重新导出封面动画。
