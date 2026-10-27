# GitHub 产品展示

README 使用一张循环 GIF 和两张 PNG；`docs/demo/` 是可独立部署的静态交互演示。所有账号、读数和费用均为示例数据，不请求真实账号或服务。保留组件许可于 `public/NOTICE.txt`。

演示复用 portfolio 的 TokenPlan 封面、用量样式和历史组件，没有复制项目介绍正文。portfolio 是构建输入，原文件不修改；发布产物不依赖访问 portfolio 仓库。

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
