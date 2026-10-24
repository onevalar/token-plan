use std::collections::HashMap;
use crate::model::{DesktopState,Metric};
use crate::i18n::translated;
use tauri::{Manager,Emitter};
use tokio::sync::Mutex;
#[derive(Clone,Default)]
struct Observation {reset:Option<i64>,bucket:i8,under:bool,primed:bool,fired:[bool;3]}
#[derive(Default)]
pub struct Alerts(Mutex<HashMap<String,Observation>>);
const TITLES:[&str;3]=["Almost Out","Cutting It Close","Will Run Out"];
const BODIES:[&str;3]=["Under 10% usage remaining for this window.","Projected to finish close to your limit.","Projected to finish before the limit resets."];
fn transition(previous:&Observation,used:f64,bucket:i8,reset:Option<i64>,enabled:[bool;3])->(Observation,Vec<usize>) {
    let mut next=previous.clone();
    if reset.is_some_and(|r|next.reset.is_none_or(|old|r>old+1000)) {next.fired=[false;3];next.bucket=-1;next.under=false;}
    next.reset=reset.or(next.reset);let under=used>90.0;
    if !next.primed {next.primed=true;next.bucket=bucket;next.under=under;return(next,vec![])}
    let mut fire=vec![];
    if bucket>=0 {
        let milestone=if bucket==1&&next.bucket<1{Some(1)}else if bucket==2&&next.bucket<2{Some(2)}else{None};
        if let Some(i)=milestone {if enabled[i]&&!next.fired[i] {fire.push(i);next.bucket=bucket;}}
        if bucket<=next.bucket {
            if bucket<next.bucket {if bucket==0{next.fired[1]=false;}if bucket<=1{next.fired[2]=false;}}
            next.bucket=bucket;
        }
    }
    if !under{next.under=false;next.fired[0]=false;}
    else if !next.under&&enabled[0]&&!next.fired[0]{fire.push(0);next.under=true;}
    (next,fire)
}
fn sample(m:&Metric,remaining:bool,now:i64)->Option<(f64,i8,Option<i64>)> {
    if !m.has_data{return None}let percent=m.percent?;if !percent.is_finite(){return None}
    let used=if remaining{100.0-percent}else{percent};let reset=m.resets_at.as_deref().and_then(|s|chrono::DateTime::parse_from_rfc3339(s).ok()).map(|d|d.timestamp_millis());
    let mut bucket=-1;
    if used>99.5 {bucket=2;} else if !m.not_started {
        if let (Some(end),Some(period))=(reset,m.period_seconds) {
            let elapsed=period-(end-now) as f64/1000.0;
            if used>0.0&&period>0.0&&end>now&&elapsed>=60.0_f64.max(period*0.01) {
                let projected=used/elapsed*period;
                bucket=if projected<=90.0{0}else if used<5.0{-1}else if (100.0-projected).round()>=1.0{1}else{2};
            }
        }
    }
    Some((used,bucket,reset))
}
pub async fn evaluate(app:&tauri::AppHandle,state:&DesktopState) {
    if option_env!("VITE_MAC_NAVIGATION_PREVIEW") == Some("1") {return;}
    let alerts=app.state::<Alerts>();let mut stored=alerts.0.lock().await;
    let language=if state.settings.language=="system"{&state.settings.locale}else{&state.settings.language};
    let mut present=std::collections::HashSet::new();
    for account in state.accounts.iter().filter(|a|a.enabled&&a.error.is_empty()) {
        for m in account.metrics.iter().filter(|m|m.placement!="hidden") {
            let key=format!("{}:{}",account.id,m.id);present.insert(key.clone());
            let Some((used,bucket,reset))=sample(m,state.settings.show_remaining,chrono::Utc::now().timestamp_millis()) else {continue};
            let previous=stored.get(&key).cloned().unwrap_or_else(||Observation{bucket:-1,..Default::default()});
            let (mut next,fire)=transition(&previous,used,bucket,reset,state.settings.notifications);
            for i in fire {
                let title=translated(TITLES[i],language).to_owned();
                let account_label=if account.email.is_empty(){account.name.clone()}else{format!("{} · {}",account.name,account.email)};
                let body=format!("{} · {}\n{}",account_label,translated(&m.label,language),translated(BODIES[i],language));
                let result=deliver(app,title,body).await;
                if result.is_ok(){next.fired[i]=true;}else{
                    let new_window=reset.is_some_and(|r|previous.reset.is_none_or(|old|r>old+1000));
                    if i==0{next.under=if new_window{false}else{previous.under};}else{next.bucket=if new_window{-1}else{previous.bucket};}
                    let _=app.emit("desktop-error","notification_failed");
                }
            }
            stored.insert(key,next);
        }
    }
    // Keep baselines through temporary provider errors, but discard removed/disabled accounts.
    stored.retain(|key,_|present.contains(key)||state.accounts.iter().any(|a|a.enabled&&!a.error.is_empty()&&key.starts_with(&format!("{}:",a.id))));
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn baseline_edges_and_recovery(){let(a,f)=transition(&Observation::default(),95.,2,Some(10000),[true;3]);assert!(f.is_empty());let(b,_)=transition(&a,20.,0,Some(10000),[true;3]);let(mut c,f)=transition(&b,95.,2,Some(10000),[true;3]);assert_eq!(f,vec![2,0]);c.fired=[true,false,true];assert!(transition(&c,96.,2,Some(10001),[true;3]).1.is_empty());assert!(!transition(&c,96.,2,Some(20000),[true;3]).1.is_empty());}
    #[test] fn display_mode_and_empty_data_do_not_change_alerts(){
        let state:DesktopState=serde_json::from_str(include_str!("../../tests/fixtures/desktop.json")).unwrap();
        let mut metric=state.accounts[0].metrics[0].clone();metric.has_data=true;metric.not_started=false;metric.percent=Some(95.0);metric.resets_at=None;
        let used=sample(&metric,false,0).unwrap();metric.percent=Some(5.0);assert_eq!(used,sample(&metric,true,0).unwrap());metric.has_data=false;assert!(sample(&metric,true,0).is_none());
    }
    #[test] fn disabled_edge_is_not_consumed(){let(a,_)=transition(&Observation::default(),20.,0,None,[false;3]);let(b,f)=transition(&a,95.,2,None,[false;3]);assert!(f.is_empty());assert_eq!(transition(&b,95.,2,None,[true;3]).1,vec![2,0]);}
}

async fn deliver(app:&tauri::AppHandle,title:String,body:String)->Result<(),String> {
    #[cfg(target_os="macos")]
    {app.state::<crate::bridge::Bridge>().call(serde_json::json!({"method":"notify","value":{"title":title,"body":body}})).await.map(|_|())}
    #[cfg(not(target_os="macos"))]
    {
        let identifier=app.config().identifier.clone();
        tauri::async_runtime::spawn_blocking(move|| {
            let mut notification=notify_rust::Notification::new();
            notification.summary(&title).body(&body).appname("TokenPlan");
            #[cfg(windows)] notification.app_id(&identifier);
            #[cfg(not(windows))] let _=identifier;
            notification.show().map(|_|()).map_err(|_|"notification_failed".to_owned())
        }).await.map_err(|_|"notification_failed")?
    }
}
