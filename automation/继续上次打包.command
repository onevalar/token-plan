#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1
python3 script/automation.py resume
status=$?
printf "\n执行结束（状态 %s）。按回车关闭。" "$status"
read -r done_key
exit "$status"
