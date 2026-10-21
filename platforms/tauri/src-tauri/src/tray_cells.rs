//! Fixed-size native tray cells. Never squeeze a multi-account strip into one square.
use crate::{model::{DesktopState, Metric}, tray, tray_image};
use resvg::tiny_skia::{Pixmap, Transform};
use tauri::image::Image;

pub const SIDE:u32=64;
pub struct Cell {
    pub title:String,
    pub lines:Vec<String>,
    pub image:Image<'static>,
}

fn xml(value:&str)->String {
    value.replace('&',"&amp;").replace('<',"&lt;").replace('>',"&gt;").replace('"',"&quot;")
}
fn draw(ink:&mut Pixmap,body:&str) {
    tray_image::draw(ink,&format!(r#"<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">{body}</svg>"#),Transform::identity());
}
fn label(ink:&mut Pixmap,value:&str,x:f32,y:f32,size:f32) {
    draw(ink,&format!(r#"<text x="{x}" y="{y}" text-anchor="middle" font-family="Arial,'DejaVu Sans',sans-serif" font-weight="700" font-size="{size}" fill="black">{}</text>"#,xml(value)));
}
fn badge(ink:&mut Pixmap,n:Option<usize>,center:bool) {
    if let Some(n)=n {
        let value=if n<=9{n.to_string()}else{"+".into()};
        label(ink,&value,if center{32.}else{54.},if center{38.}else{17.},if center{18.}else{16.});
    }
}

/// A neutral opaque plate guarantees contrast on both dark and light system panels,
/// independently of the app theme (which may not match the taskbar theme).
fn finish(ink:Pixmap)->Image<'static> {
    let mut background=Pixmap::new(SIDE,SIDE).unwrap();
    draw(&mut background,r##"<rect x="1" y="1" width="62" height="62" rx="10" fill="#202124" stroke="#85878b" stroke-width="1.5"/>"##);
    // tiny-skia pixels are premultiplied; Tauri/ksni require straight RGBA.
    let mut bytes=background.data().to_vec();
    for (pixel,mark) in bytes.chunks_exact_mut(4).zip(ink.data().chunks_exact(4)) {
        let alpha=mark[3] as f32/255.;
        let base=pixel[3] as f32/255.;
        let out=alpha+base*(1.-alpha);
        for channel in 0..3 {
            pixel[channel]=if out>0. {((alpha*245.+pixel[channel] as f32*(1.-alpha))/out).round() as u8}else{0};
        }
        pixel[3]=(out*255.).round() as u8;
    }
    Image::new_owned(bytes,SIDE,SIDE)
}
fn identity(family:&str,n:Option<usize>)->Image<'static> {
    let mut ink=Pixmap::new(SIDE,SIDE).unwrap();
    let side=if n.is_some(){40.}else{48.};
    tray_image::draw_logo(&mut ink,family,(64.-side)/2.,(64.-side)/2.,side);
    badge(&mut ink,n,false);
    finish(ink)
}
fn rings(family:&str,metrics:&[&Metric],n:Option<usize>,inside:bool)->Image<'static> {
    let mut ink=Pixmap::new(SIDE,SIDE).unwrap();
    // Corner badges have their own gutter; center badges belong only to three-ring groups.
    let corner=n.is_some()&&metrics.len()<3;
    let center=if corner{29.}else{32.};
    let outer=if corner{23.}else{27.};
    for (i,m) in metrics.iter().enumerate() {
        let radius=outer-i as f32*7.;
        let percent=if m.has_data{m.percent.unwrap_or(0.).clamp(0.,100.)}else{0.};
        let circle=format!(r#"cx="{center}" cy="34" r="{radius}" fill="none" stroke="black" stroke-width="4""#);
        draw(&mut ink,&format!(r#"<circle {circle} stroke-opacity="0.32"/>"#));
        if percent>=100. {draw(&mut ink,&format!("<circle {circle}/>"));}
        else if percent>0. {
            let circumference=2.*std::f32::consts::PI*radius;
            let arc=circumference*percent as f32/100.;
            draw(&mut ink,&format!(r#"<circle {circle} stroke-linecap="round" stroke-dasharray="{arc} {circumference}" transform="rotate(-90 {center} 34)"/>"#));
        }
    }
    if inside {
        let side=if metrics.len()>1{19.}else{29.};
        tray_image::draw_logo(&mut ink,family,center-side/2.,34.-side/2.,side);
    }
    badge(&mut ink,n,metrics.len()==3);
    finish(ink)
}
fn reading(metric:&Metric,n:Option<usize>)->Image<'static> {
    let mut ink=Pixmap::new(SIDE,SIDE).unwrap();
    // Full metric names stay in the tooltip/menu; a short cycle label identifies each cell.
    let cycle=if let Some(seconds)=metric.period_seconds.filter(|v|*v>0.) {
        if seconds>=604800.&&seconds%604800.==0.{format!("{:.0}w",seconds/604800.)}
        else if seconds>=86400.{format!("{:.0}d",seconds/86400.)}
        else{format!("{:.0}h",seconds/3600.)}
    }else{String::new()};
    label(&mut ink,&cycle,22.,18.,15.);
    badge(&mut ink,n,false);
    let value=tray_image::reading(metric);
    let size=if value.chars().count()>4{23.}else if value.chars().count()>3{26.}else{32.};
    label(&mut ink,&value,32.,50.,size);
    finish(ink)
}

/// Slot IDs stay constant when accounts reorder. Existing OS positions then receive
/// the new ordered content rather than retaining an old account's badge or reading.
pub fn slot_id(index:usize)->String {format!("TokenPlan-{index:04}")}
pub fn menu_action(id:&str)->Option<&str> {
    let (slot,action)=id.strip_prefix("TokenPlan-")?.rsplit_once('-')?;
    if slot.len()==4&&slot.bytes().all(|b|b.is_ascii_digit())&&["open","quit"].contains(&action){Some(action)}else{None}
}
pub fn cells(state:&DesktopState)->Vec<Cell> {
    let mut cells=Vec::new();
    for (account,n) in tray::visible(state) {
        let identity_text=if account.email.is_empty(){account.name.clone()}else{format!("{} · {}",account.name,account.email)};
        let title=match n {Some(n)=>format!("{identity_text} · {n}"),None=>identity_text};
        let metrics:Vec<_>=account.metrics.iter().filter(|m|m.pinned).take(3).collect();
        let lines:Vec<_>=metrics.iter().map(|m|format!("{}: {}",m.label,tray_image::reading(m))).collect();
        let ring=state.settings.tray_style=="ring"&&!metrics.is_empty()&&metrics.iter().all(|m|m.percent.is_some()||m.unit=="percent");
        let inside=ring&&state.settings.ring_icon_position=="inside"&&metrics.len()<3;
        if !inside {
            cells.push(Cell{title:title.clone(),lines:lines.clone(),image:identity(&account.family,if ring&&metrics.len()==3{None}else{n})});
        }
        if ring {
            cells.push(Cell{title,lines,image:rings(&account.family,&metrics,n,inside)});
        }else{
            for metric in metrics {
                cells.push(Cell{title:format!("{title} · {}: {}",metric.label,tray_image::reading(metric)),lines:lines.clone(),image:reading(metric,n)});
            }
        }
    }
    if cells.is_empty(){cells.push(Cell{title:"TokenPlan".into(),lines:vec![],image:identity("tokenplan",None)});}
    cells
}

#[cfg(test)]
mod tests;
