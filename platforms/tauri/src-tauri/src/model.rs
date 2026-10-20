use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings { #[serde(default)] pub notifications: [bool;3], #[serde(default)] pub shortcut: String, #[serde(default)] pub show_remaining: bool, pub appearance: String, pub language: String, #[serde(default)] pub locale: String, pub tray_style: String, pub refresh_minutes: u64, pub auto_refresh: bool, pub auto_updates: bool }
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Metric { pub id: String, pub label: String, pub placement: String, pub pinned: bool, pub pinnable: bool, pub has_data: bool, #[serde(default)] pub not_started: bool, #[serde(default)] pub expiries: Vec<String>, #[serde(default)] pub chart: Vec<ChartPoint>, pub unit: String, pub percent: Option<f64>, pub amount: Option<f64>, pub resets_at: Option<String>, pub period_seconds: Option<f64>, pub values: Vec<MetricValue> }
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ChartPoint { pub label: String, pub value: f64 }
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct MetricValue { pub amount: f64, pub unit: String, pub label: String }
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Day { pub date: String, pub tokens: i64, pub cost: Option<f64>, #[serde(default)] pub models: Vec<ModelUsage> }
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ModelUsage { pub model: String, pub tokens: i64, pub cost: Option<f64>, #[serde(default)] pub variants: Vec<ModelVariant> }
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ModelVariant { pub model: String, pub tokens: i64, pub cost: Option<f64> }
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Observation { pub date: String, pub label: String, pub value: Option<f64>, pub unit: Option<String> }
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Account { pub id: String, pub family: String, pub name: String, pub email: String, pub plan: String, pub enabled: bool, pub tray: bool, pub removable: bool, pub api_key: bool, pub note: String, pub error: String, pub fetched_at: String, pub metrics: Vec<Metric>, #[serde(default)] pub observations: Vec<Observation>, pub history_scope: String, pub history_partial: bool, pub history: Vec<Day> }
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct DesktopState { pub schema: String, pub accounts: Vec<Account>, pub settings: Settings, #[serde(default)] pub sync: SyncStatus }
impl DesktopState {
    pub fn validate(&self) -> bool {
        self.schema == "tokenplan.desktop.v1" && self.accounts.len() < 512 && [1,2,5,10,15,30,60].contains(&self.settings.refresh_minutes)
            && self.accounts.iter().all(|a| a.metrics.len() < 128 && a.history.len() < 1000 && a.observations.len() <= 2400)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct SyncStatus { pub available: bool, pub enabled: bool, pub syncing: bool, pub error: String, pub devices: Vec<SyncDevice> }
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDevice { pub id: String, pub name: String, pub current: bool, pub updated_at: String }
