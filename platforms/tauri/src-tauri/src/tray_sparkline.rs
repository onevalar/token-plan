//! Arc Sparkline static point/line mapping, ported for the native menu-bar image.
//! https://uiarc.dev/r/sparkline.json — Copyright (c) 2026 Elia Kuratli, MIT.
//! See src/components/arc/LICENSE. Unlike upstream: dated slots, zero baseline,
//! straight segments and missing-day gaps; no interpolation or synthetic samples.
use crate::{i18n::translated,model::{Account,DesktopState},tray::visible};
use chrono::{Days,NaiveDate};
use std::collections::{HashMap,HashSet};

const DAYS:usize=14;
pub const WIDTH:u32=72;
const MAX_SAFE_INTEGER:i64=9_007_199_254_740_991;

pub struct TokenTrend {
    pub values:[Option<i64>;DAYS],
    pub partial:bool,
    pub invalid:bool,
}

impl TokenTrend {
    pub fn has_data(&self)->bool {self.values.iter().any(Option::is_some)}
    pub fn today(&self)->Option<i64> {self.values[DAYS-1]}

    pub fn svg(&self)->String {
        let max=self.values.iter().flatten().copied().max().unwrap_or(0).max(1) as f64;
        let points=self.values.iter().enumerate().map(|(index,value)|value.map(|v|(4.0+index as f64/(DAYS-1) as f64*64.0,36.0-v as f64/max*32.0))).collect::<Vec<_>>();
        let mut path=String::new();let mut dots=String::new();
        for (index,point) in points.iter().enumerate() {
            let Some((x,y))=point else {continue};
            let previous=index>0&&points[index-1].is_some();
            let next=index+1<DAYS&&points[index+1].is_some();
            path+=&format!("{}{x:.2},{y:.2} ",if previous{"L"}else{"M"});
            let radius=if index==DAYS-1||!previous&&!next{2.0}else{1.25};
            dots+=&format!(r#"<circle cx="{x}" cy="{y}" r="{radius}" fill="black"/>"#);
        }
        format!(r#"<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="40"><path d="{path}" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>{dots}</svg>"#)
    }

    pub fn summary(&self,language:&str)->String {
        let mut value=if self.has_data(){format!("{} · {}: {} {}",translated("Recorded Daily Tokens · 14 Days",language),translated("Today",language),self.today().map_or_else(||"—".into(),|n|n.to_string()),translated("tokens",language))}else{translated("No recent token records; showing selected values only.",language).into()};
        if self.partial {value+=&format!(" · {}",translated("Partial History",language));}
        if self.invalid {value+=&format!(" · {}",translated("Invalid or duplicate token records are omitted.",language));}
        value
    }
}

fn daily_tokens(account:&Account,today:NaiveDate)->TokenTrend {
    let start=today.checked_sub_days(Days::new((DAYS-1) as u64)).expect("calendar date");
    let mut trend=TokenTrend{values:[None;DAYS],partial:account.history_partial,invalid:false};
    let mut seen=HashSet::new();
    for row in &account.history {
        let date=NaiveDate::parse_from_str(&row.date,"%Y-%m-%d").ok().filter(|d|d.format("%Y-%m-%d").to_string()==row.date);
        let Some(date)=date else {trend.invalid=true;continue};
        let offset=date.signed_duration_since(start).num_days();
        if !(0..DAYS as i64).contains(&offset) {continue;}
        let index=offset as usize;
        if !seen.insert(index)||!(0..=MAX_SAFE_INTEGER).contains(&row.tokens) {trend.values[index]=None;trend.invalid=true;continue;}
        trend.values[index]=Some(row.tokens);
    }
    trend
}

/// Keep account history separate and show device-wide history just once per provider.
pub fn for_accounts(state:&DesktopState,today:NaiveDate)->HashMap<String,TokenTrend> {
    let mut seen=HashSet::new();let mut result=HashMap::new();
    for (account,_) in visible(state) {
        if !account.metrics.iter().any(|m|m.pinned)||account.history_scope=="device"&&seen.contains(&account.family) {continue;}
        let trend=daily_tokens(account,today);
        if trend.has_data()&&account.history_scope=="device" {seen.insert(account.family.clone());}
        result.insert(account.id.clone(),trend);
    }
    result
}

pub fn token_reading(value:Option<i64>)->String {
    let Some(value)=value else {return "—".into()};
    for (scale,suffix) in [(1_000_000_000,"B"),(1_000_000,"M"),(1_000,"k")] {
        if value>=scale {return format!("{}{suffix}",format!("{:.1}",value as f64/scale as f64).trim_end_matches(".0"));}
    }
    value.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::Day;
    use crate::tray_image::strip_at;
    use resvg::tiny_skia;
    fn today()->NaiveDate {NaiveDate::from_ymd_opt(2026,10,24).unwrap()}
    fn day(date:&str,tokens:i64)->Day {Day{date:date.into(),tokens,cost:None,models:vec![]}}
    fn fixture()->DesktopState {
        let mut s:DesktopState=serde_json::from_str(include_str!("../../tests/fixtures/desktop.json")).unwrap();
        s.accounts.truncate(1);s.settings.tray_style="sparkline".into();s.settings.language="en".into();s
    }
    fn alpha(image:&tauri::image::Image,x:u32,y:u32)->u8 {image.rgba()[((y*image.width()+x)*4+3) as usize]}

    #[test]
    fn native_pixels_keep_calendar_gaps_zero_and_independent_quota_readings() {
        let mut s=fixture();
        s.accounts[0].history=vec![day("2026-10-24",0),day("2026-10-11",0),day("2026-10-12",100),day("2026-10-14",25),day("2026-10-10",99999),day("2026-10-25",88888)];
        s.accounts[0].metrics[0].chart=vec![crate::model::ChartPoint{label:"undated quota".into(),value:999.0}];
        let used=strip_at(&s,today());
        // The graph starts 44px after the logo and spans 14 equally spaced days.
        assert!(alpha(&used,48,36)>100,"the first zero stays on the zero baseline");
        assert!(alpha(&used,53,4)>100,"the known maximum is not displaced by out-of-range history");
        assert!(alpha(&used,63,28)>100,"25 tokens stay at one quarter of the scale");
        assert!(alpha(&used,112,36)>100,"today's explicit zero remains visible");
        assert!((0..40).all(|y|alpha(&used,58,y)==0),"missing days must not be connected or filled with zero");
        s.settings.show_remaining=true;s.accounts[0].metrics[0].percent=Some(35.0);
        let remaining=strip_at(&s,today());
        for y in 0..40 {for x in 44..116 {assert_eq!(alpha(&used,x,y),alpha(&remaining,x,y),"quota preference must not invert token history");}}
        assert_ne!(used.rgba(),remaining.rgba(),"the selected current reading still changes");
        assert!(remaining.rgba().chunks_exact(4).all(|p|p[..3]==[0,0,0]),"native template remains alpha-only");
    }

    #[test]
    fn empty_history_and_empty_selection_keep_existing_fallbacks() {
        let mut s=fixture();s.accounts[0].history.clear();
        let missing=strip_at(&s,today());s.settings.tray_style="percentage".into();
        assert_eq!(missing.rgba(),strip_at(&s,today()).rgba());
        s.settings.tray_style="sparkline".into();s.accounts[0].history=vec![day("2026-10-24",0)];
        let zero=strip_at(&s,today());assert_ne!(missing.rgba(),zero.rgba());
        // A single genuine record draws one dot, not a fabricated horizontal trend.
        assert!((44..108).all(|x|(0..40).all(|y|alpha(&zero,x,y)==0)));
        s.accounts[0].metrics.iter_mut().for_each(|m|m.pinned=false);
        let icon=strip_at(&s,today());s.settings.tray_style="percentage".into();
        assert_eq!(icon.rgba(),strip_at(&s,today()).rgba());assert_eq!(icon.width(),40);
    }

    #[test]
    fn real_records_deduplicate_only_device_scope_and_reject_invalid_days() {
        let mut s=fixture();s.accounts[0].history_scope="device".into();
        s.accounts.push(Account{id:"second".into(),..s.accounts[0].clone()});
        assert_eq!(for_accounts(&s,today()).len(),1);
        s.accounts[0].tray=false;assert!(for_accounts(&s,today()).contains_key("second"));
        s.accounts[0].tray=true;s.accounts[0].metrics.iter_mut().for_each(|m|m.pinned=false);
        assert!(for_accounts(&s,today()).contains_key("second"));
        s.accounts[0].metrics[0].pinned=true;s.accounts[0].history.clear();
        assert!(for_accounts(&s,today())["second"].has_data());
        s.accounts.iter_mut().for_each(|a|a.history_scope="account".into());
        assert_eq!(for_accounts(&s,today()).len(),2);
        s.accounts[0].history=vec![day("2026-10-24",5),day("2026-10-24",9),day("2026-10-23",-1),day("2026-10-22",0),day("2026-02-30",7),day("2026-10-20",MAX_SAFE_INTEGER+1)];
        let all=for_accounts(&s,today());let trend=&all[&s.accounts[0].id];
        assert!(trend.invalid);assert_eq!(trend.values.iter().flatten().copied().collect::<Vec<_>>(),vec![0]);assert_eq!(trend.today(),None);
        assert!(trend.summary("en").contains("Invalid or duplicate"));
        assert!(trend.summary("zh-Hans").contains("无效或重复"));
    }

    #[test]
    fn selected_values_keep_overflow_missing_readings_and_all_three_pins() {
        let mut s=fixture();s.accounts[0].history=vec![day("2026-10-23",300),day("2026-10-24",12500)];
        let base=s.accounts[0].metrics[0].clone();
        s.accounts[0].metrics=vec![crate::model::Metric{percent:Some(112.0),..base.clone()},crate::model::Metric{percent:Some(-12.0),..base.clone()},crate::model::Metric{has_data:false,..base}];
        let overflow=strip_at(&s,today());s.accounts[0].metrics[0].percent=Some(100.0);
        assert_ne!(overflow.rgba(),strip_at(&s,today()).rgba(),"overflow must not look like 100%");
        s.accounts[0].metrics[0].percent=Some(112.0);s.accounts[0].metrics[1].percent=Some(0.0);
        assert_ne!(overflow.rgba(),strip_at(&s,today()).rgba(),"negative remaining must not look like zero");
        s.accounts[0].metrics[1].percent=Some(-12.0);
        let missing=strip_at(&s,today());s.accounts[0].metrics[2].has_data=true;s.accounts[0].metrics[2].percent=Some(87.0);
        assert_ne!(missing.rgba(),strip_at(&s,today()).rgba());
        let current=strip_at(&s,today());s.accounts[0].history_partial=true;
        assert_ne!(current.rgba(),strip_at(&s,today()).rgba(),"partial history needs its visible asterisk");
        assert_eq!(token_reading(Some(12500)),"12.5k");
    }

    /// Optional real-raster review export. Background colors illustrate template compositing,
    /// not macOS appearance or an NSStatusItem screenshot. Uses only synthetic records.
    #[test]
    fn export_native_trend_review() {
        let Ok(path)=std::env::var("TOKENPLAN_TREND_REVIEW") else {return};
        let width=1120;let height=760;let mut sheet=tiny_skia::Pixmap::new(width,height).unwrap();
        for (column,dark) in [false,true].into_iter().enumerate() {
            let left=column as u32*560;let bg=if dark{28}else{242};let fg=if dark{245}else{20};
            for y in 0..height {for x in left..left+560 {let i=((y*width+x)*4) as usize;sheet.data_mut()[i..i+4].copy_from_slice(&[bg,bg,bg,255]);}}
            for (row,label) in ["DAILY TOKENS / TWO CURRENT QUOTAS","MISSING DAYS / PARTIAL RECORDS","SINGLE ZERO RECORD / NOT MISSING","NO HISTORY / SELECTED VALUES ONLY","THREE QUOTAS / OVERFLOW + MISSING","NO SELECTED METRIC / ICON ONLY"].iter().enumerate() {
                let top=38+row as u32*115;let mut s=fixture();
                let base=s.accounts[0].metrics[0].clone();
                s.accounts[0].metrics=vec![crate::model::Metric{percent:Some(37.0),..base.clone()},crate::model::Metric{percent:Some(82.0),..base.clone()}];
                s.accounts[0].history=[2400,4800,3100,8300,2000,6500,0,4400,2200,8900,3900,5100,11200,12500].into_iter().enumerate().map(|(i,tokens)|day(&format!("2026-10-{:02}",11+i),tokens)).collect();
                match row {
                    1=>{s.accounts[0].history.retain(|d|!["2026-10-15","2026-10-16","2026-10-20"].contains(&d.date.as_str()));s.accounts[0].history_partial=true;},
                    2=>s.accounts[0].history=vec![day("2026-10-24",0)],
                    3=>s.accounts[0].history.clear(),
                    4=>s.accounts[0].metrics=vec![crate::model::Metric{percent:Some(112.0),..base.clone()},crate::model::Metric{percent:Some(-12.0),..base.clone()},crate::model::Metric{has_data:false,..base}],
                    5=>s.accounts[0].metrics.iter_mut().for_each(|m|m.pinned=false),
                    _=>{},
                }
                let svg=format!(r#"<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"><text x="{}" y="{}" font-family="Arial,sans-serif" font-size="15" fill="rgb({fg},{fg},{fg})">{label}</text></svg>"#,left+26,top);
                crate::tray_image::draw(&mut sheet,&svg,tiny_skia::Transform::identity());
                let icon=strip_at(&s,today());
                for y in 0..40 {for x in 0..icon.width() {
                    let a=alpha(&icon,x,y) as f32/255.;let v=(bg as f32*(1.-a)+fg as f32*a).round() as u8;
                    let i=(((top+20+y)*width+left+26+x)*4) as usize;sheet.data_mut()[i..i+4].copy_from_slice(&[v,v,v,255]);
                }}
            }
        }
        sheet.save_png(path).unwrap();
    }
}
