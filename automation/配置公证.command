#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
set -euo pipefail
finish() { status=$?; if [ "$status" -ne 0 ]; then printf "\n配置未完成，请保留上方错误提示（不要复制密码）。\n"; fi; read -r -p "按回车关闭窗口。" done_key; }
trap finish EXIT
printf '\nTokenPlan 自动公证配置（只需一次）\n\n'
printf '请先在 https://account.apple.com 的「登录和安全 → App 专用密码」生成密码。\n'
printf '接下来由 Apple notarytool 安全读取密码并保存到系统钥匙串，不会保存到项目文件。\n\n'
read -r -p 'Apple 账户邮箱: ' apple_account
read -r -p 'Apple Developer Team ID [H4982D35ZR]: ' apple_team
xcrun notarytool store-credentials TokenPlan-Notary --apple-id "$apple_account" --team-id "${apple_team:-H4982D35ZR}"
printf '\n认证已保存；之后打包会自动使用此配置。\n'
