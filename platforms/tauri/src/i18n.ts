const en = {
  refresh: "Refresh", more: "More", back: "Back", about: "About", quit: "Quit",
  empty: "No enabled services have usage data yet.",
  loading: "Reading usage…", missing: "No data", retry: "Try again",
  bridge_unavailable: "The usage helper is unavailable. Rebuild the preview with its helper.",
  invalid_response: "The usage response could not be read.",
  read_failed: "Usage could not be read. Check the native diagnostic log.",
  read_timeout: "The usage request timed out. Try again later.",
  preview: "Migration preview", stale: "Previously retrieved data",
  notice: "This preview shows usage only. Account settings, history and updates are still being migrated.",
};
type Messages = typeof en;
const translations: Record<string, Messages> = {
  en,
  "zh-Hans": { refresh:"刷新", more:"更多", back:"返回", about:"关于", quit:"退出",
    empty:"已启用的服务暂无用量数据。", loading:"正在读取用量…", missing:"无数据", retry:"重试",
    bridge_unavailable:"用量读取程序不可用，请重新构建包含该程序的预览版。",
    invalid_response:"无法解析用量响应。", read_failed:"无法读取用量，请查看本机诊断日志。",
    read_timeout:"用量请求超时，请稍后重试。", preview:"迁移预览", stale:"此前获取的数据",
    notice:"此预览版仅展示用量。账号设置、历史记录和自动更新仍在迁移中。" },
  "zh-Hant": { refresh:"重新整理", more:"更多", back:"返回", about:"關於", quit:"結束",
    empty:"已啟用的服務暫無用量資料。", loading:"正在讀取用量…", missing:"無資料", retry:"重試",
    bridge_unavailable:"用量讀取程式無法使用，請重新建置包含該程式的預覽版。",
    invalid_response:"無法解析用量回應。", read_failed:"無法讀取用量，請查看本機診斷記錄。",
    read_timeout:"用量請求逾時，請稍後重試。", preview:"遷移預覽", stale:"先前取得的資料",
    notice:"此預覽版僅顯示用量。帳號設定、歷史記錄和自動更新仍在遷移中。" },
  ja: { refresh:"更新", more:"その他", back:"戻る", about:"情報", quit:"終了",
    empty:"有効なサービスの使用量データはまだありません。", loading:"使用量を読み込み中…", missing:"データなし", retry:"再試行",
    bridge_unavailable:"使用量ヘルパーが見つかりません。ヘルパーを含めて再ビルドしてください。",
    invalid_response:"使用量の応答を解析できません。", read_failed:"使用量を取得できません。診断ログを確認してください。",
    read_timeout:"要求がタイムアウトしました。後でもう一度お試しください。", preview:"移行プレビュー", stale:"以前取得したデータ",
    notice:"このプレビューは使用量表示のみです。アカウント設定、履歴、自動更新は移行中です。" },
  ko: { refresh:"새로 고침", more:"더 보기", back:"뒤로", about:"정보", quit:"종료",
    empty:"활성화된 서비스의 사용량 데이터가 아직 없습니다.", loading:"사용량 읽는 중…", missing:"데이터 없음", retry:"다시 시도",
    bridge_unavailable:"사용량 도우미를 찾을 수 없습니다. 도우미를 포함하여 다시 빌드하세요.",
    invalid_response:"사용량 응답을 읽을 수 없습니다.", read_failed:"사용량을 읽을 수 없습니다. 진단 로그를 확인하세요.",
    read_timeout:"요청 시간이 초과되었습니다. 나중에 다시 시도하세요.", preview:"마이그레이션 미리 보기", stale:"이전에 가져온 데이터",
    notice:"이 미리 보기는 사용량만 표시합니다. 계정 설정, 기록 및 자동 업데이트는 이전 중입니다." },
};
export function messages(locale: string): Messages {
  const key = /zh.*(TW|HK|Hant)/i.test(locale) ? "zh-Hant" : locale.startsWith("zh") ? "zh-Hans" : locale.split("-")[0];
  return translations[key] ?? en;
}
