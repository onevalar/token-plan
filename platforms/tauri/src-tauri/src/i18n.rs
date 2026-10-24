use std::sync::OnceLock;

/// Native labels share the same five-language source as the web interface.
pub fn translated<'a>(text:&'a str,language:&str)->&'a str {
    static TABLE:OnceLock<serde_json::Value>=OnceLock::new();
    let table=TABLE.get_or_init(||serde_json::from_str(include_str!("../../src/provider-translations.json")).unwrap_or_default());
    let lang=if language.starts_with("zh") {if language.contains("Hant")||language.contains("TW")||language.contains("HK"){"zh-Hant"}else{"zh-Hans"}}else{language.split(['-','_']).next().unwrap_or("en")};
    table[lang][text].as_str().unwrap_or(text)
}
