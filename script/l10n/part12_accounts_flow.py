# Order: zh-Hans, zh-Hant, ja, ko. Refresh status, Add Account flow, notes, menu bar settings.
T = {
 'Refreshed': ('已刷新', '已重新整理', '更新しました', '새로고침됨'),
 'Up to date': ('已是最新', '已是最新', '最新です', '최신 상태'),
 'Needs attention': ('需要留意', '需要留意', '要確認', '확인 필요'),
 'Some failed': ('部分失败', '部分失敗', '一部失敗', '일부 실패'),
 'Nothing to refresh': ('无需刷新', '無需重新整理', '更新対象なし', '새로고침할 항목 없음'),
 'Add Account': ('添加账号', '新增帳號', 'アカウントを追加', '계정 추가'),
 'No accounts yet. Add one to start tracking your usage.': ('还没有账号。添加一个，开始追踪用量。', '尚無帳號。新增一個，開始追蹤用量。', 'アカウントがありません。追加すると使用状況を確認できます。', '계정이 없습니다. 계정을 추가하면 사용량을 추적할 수 있습니다.'),
 'Found on This Mac': ('在这台 Mac 上发现', '在這台 Mac 上發現', 'この Mac で見つかったもの', '이 Mac에서 찾은 항목'),
 'Added to Home': ('已添加到首页', '已加入首頁', 'ホームに追加しました', '홈에 추가됨'),
 'Needs an API key': ('需要 API 密钥', '需要 API 金鑰', 'API キーが必要です', 'API 키 필요'),
 'Set Up': ('设置', '設定', '設定', '설정'),
 'Everything found on this Mac is already added.': ('这台 Mac 上发现的账号都已添加。', '這台 Mac 上發現的帳號都已加入。', 'この Mac で見つかったアカウントはすべて追加済みです。', '이 Mac에서 찾은 계정은 모두 추가되었습니다.'),
 'TokenPlan reads accounts that are already signed in on this Mac. Add one below, or sign in to another account.': ('TokenPlan 会读取这台 Mac 上已登录的账号。可以在下方直接添加，或登录另一个账号。', 'TokenPlan 會讀取這台 Mac 上已登入的帳號。可在下方直接新增，或登入另一個帳號。', 'TokenPlan はこの Mac でサインイン済みのアカウントを読み取ります。下から追加するか、別のアカウントにサインインしてください。', 'TokenPlan은 이 Mac에 로그인된 계정을 읽습니다. 아래에서 추가하거나 다른 계정에 로그인하세요.'),
 'Turning off an account hides it from Home but keeps it under Add Account.': ('关闭账号只会在首页隐藏它，仍可在“添加账号”中找到。', '關閉帳號只會在首頁隱藏，仍可在「新增帳號」中找到。', 'アカウントをオフにするとホームでは非表示になりますが、「アカウントを追加」には残ります。', '계정을 끄면 홈에서만 숨겨지며 "계정 추가"에는 남아 있습니다.'),
 'Use this to track a second or third Claude or Codex account. TokenPlan opens a terminal with its own login folder, so the account you are already using stays signed in.': ('用于追踪第二个、第三个 Claude 或 Codex 账号。TokenPlan 会打开终端，并使用独立的登录文件夹，所以你正在使用的账号不会被登出。', '用於追蹤第二個、第三個 Claude 或 Codex 帳號。TokenPlan 會開啟終端機，並使用獨立的登入資料夾，因此你正在使用的帳號不會被登出。', '2 つ目・3 つ目の Claude または Codex アカウントを追跡するときに使います。TokenPlan は専用のログインフォルダでターミナルを開くため、使用中のアカウントはサインインしたままです。', '두 번째·세 번째 Claude 또는 Codex 계정을 추적할 때 사용합니다. TokenPlan이 별도의 로그인 폴더로 터미널을 열기 때문에 사용 중인 계정은 로그인된 상태로 유지됩니다.'),
 'Open Terminal to Sign In': ('打开终端登录', '開啟終端機登入', 'ターミナルを開いてサインイン', '터미널을 열어 로그인'),
 'Check for Existing Logins': ('检查已有登录', '檢查現有登入', '既存のログインを確認', '기존 로그인 확인'),
 'Finish signing in inside the terminal window that opened.': ('请在打开的终端窗口中完成登录。', '請在開啟的終端機視窗中完成登入。', '開いたターミナルのウィンドウでサインインを完了してください。', '열린 터미널 창에서 로그인을 완료하세요.'),
 'A terminal could not be opened. Copy this command and run it in your own terminal.': ('无法打开终端。请复制下面的命令，在你自己的终端中运行。', '無法開啟終端機。請複製下面的指令，在你自己的終端機中執行。', 'ターミナルを開けませんでした。下のコマンドをコピーして、お使いのターミナルで実行してください。', '터미널을 열 수 없습니다. 아래 명령을 복사해 직접 터미널에서 실행하세요.'),
 'Install the official command-line tool first if the command is not available.': ('如果提示找不到该命令，请先安装官方命令行工具。', '若提示找不到該指令，請先安裝官方命令列工具。', 'コマンドが見つからない場合は、先に公式のコマンドラインツールをインストールしてください。', '명령을 찾을 수 없으면 먼저 공식 명령줄 도구를 설치하세요.'),
 'Come back here and check for the new account.': ('登录后回到这里，检查新账号。', '登入後回到這裡，檢查新帳號。', 'サインイン後にここへ戻り、新しいアカウントを確認します。', '로그인한 뒤 여기로 돌아와 새 계정을 확인하세요.'),
 'I Have Signed In — Check Again': ('我已登录，重新检查', '我已登入，重新檢查', 'サインインしました。もう一度確認', '로그인했습니다. 다시 확인'),
 'Start Over': ('重新开始', '重新開始', 'やり直す', '다시 시작'),
 'Advanced: Use an Existing Folder': ('高级：使用已有文件夹', '進階：使用現有資料夾', '詳細：既存のフォルダを使う', '고급: 기존 폴더 사용'),
 'Account Details': ('账号信息', '帳號資訊', 'アカウント情報', '계정 정보'),
 'Add Note': ('添加备注', '新增備註', 'メモを追加', '메모 추가'),
 'Menu bar accounts follow the same order as under Accounts.': ('菜单栏中的账号顺序与“账号”页面一致。', '選單列中的帳號順序與「帳號」頁面一致。', 'メニューバーのアカウントは「アカウント」と同じ順序で表示されます。', '메뉴 막대의 계정 순서는 "계정" 페이지와 같습니다.'),
 'Accounts in the Menu Bar': ('显示在菜单栏的账号', '顯示在選單列的帳號', 'メニューバーに表示するアカウント', '메뉴 막대에 표시할 계정'),
}
T.update({
 'Available to Add': ('可添加', '可新增', '追加できるもの', '추가 가능'),
 'Another Account': ('其他账号', '其他帳號', '別のアカウント', '다른 계정'),
 'Found on this Mac': ('已在这台 Mac 上发现', '已在這台 Mac 上發現', 'この Mac で見つかりました', '이 Mac에서 찾았습니다'),
 'Not detected yet': ('尚未检测到', '尚未偵測到', 'まだ検出されていません', '아직 감지되지 않음'),
})
T.update({
 # Page title in the Windows/Linux (.NET) client; it was missing from every table.
 'Notifications & Sync': ('通知与同步', '通知與同步', '通知と同期', '알림 및 동기화'),
})
