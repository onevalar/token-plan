//! Keep macOS screen selection and panel frames in AppKit's global logical points.
//! Tray events and Tauri monitor rectangles can use different backing scales.
#[derive(Clone, Copy, Debug, PartialEq)]
struct Frame { x:f64, y:f64, width:f64, height:f64 }
impl Frame {
    fn top(self)->f64 { self.y+self.height }
    fn contains(self,point:(f64,f64))->bool {
        point.0>=self.x && point.0<self.x+self.width && point.1>=self.y && point.1<self.top()
    }
}
fn screen_at(frames:&[Frame],point:(f64,f64))->Option<usize> {
    frames.iter().position(|frame|frame.contains(point))
}
fn fitted_frame(area:Frame,center:f64,top:f64,height:f64)->Frame {
    let width=390_f64.min(area.width);
    let height=height.clamp(120.,680.).min((area.height-12.).max(1.));
    let inset=6_f64.min(((area.width-width)/2.).max(0.));
    let x=(center-width/2.).clamp(area.x+inset,area.x+area.width-width-inset);
    let y=(top-height).clamp(area.y,(area.top()-height).max(area.y));
    Frame{x,y,width,height}
}
fn menu_frame(screen:Frame,work:Frame,point:(f64,f64),bar_height:f64,height:f64)->Frame {
    fitted_frame(work,point.0,work.top().min(screen.top()-bar_height)-6.,height)
}

#[cfg(target_os="macos")]
mod native {
    use super::*;
    use tauri::{Emitter,Manager};
    use tauri_nspanel::{ManagerExt,NSPoint,NSRect,NSSize,
        objc2::MainThreadMarker,objc2_app_kit::{NSEvent,NSScreen,NSStatusBar}};

    impl From<NSRect> for Frame {
        fn from(r:NSRect)->Self { Self{x:r.origin.x,y:r.origin.y,width:r.size.width,height:r.size.height} }
    }
    impl From<Frame> for NSRect {
        fn from(r:Frame)->Self { Self::new(NSPoint::new(r.x,r.y),NSSize::new(r.width,r.height)) }
    }
    fn report(app:&tauri::AppHandle,error:impl std::fmt::Display) {
        eprintln!("macOS panel positioning failed: {error}");
        let _=app.emit("desktop-error","tray_failed");
    }
    // This reads and writes NSPanel/NSScreen on the main thread, without converting
    // through physical pixels or the scale of the panel's previous display.
    fn position(app:&tauri::AppHandle)->Result<(),String> {
        let mtm=MainThreadMarker::new().ok_or("not_on_main_thread")?;
        let panel=app.get_webview_panel("main").map_err(|e|format!("{e:?}"))?;
        let window=panel.as_panel();
        let state=app.state::<crate::panel::Panel>();
        let point=*state.mac_anchor.lock().unwrap();
        let screens=NSScreen::screens(mtm);
        let frames=screens.iter().map(|s|Frame::from(s.frame())).collect::<Vec<_>>();
        let selected=point.and_then(|p|screen_at(&frames,p));
        let screen=selected.map(|i|screens.objectAtIndex(i))
            .or_else(||window.screen()).or_else(||screens.firstObject()).ok_or("screen_unavailable")?;
        let desired=state.content_height.load(std::sync::atomic::Ordering::SeqCst);
        let height=if desired==0 {280.}else{desired as f64};
        let work=Frame::from(screen.visibleFrame());
        let frame=if let (Some(point),Some(_))=(point,selected) {
            menu_frame(screen.frame().into(),work,point,NSStatusBar::systemStatusBar().thickness(),height)
        } else {
            // On first load, or after unplugging the anchor display, keep the
            // current top edge and constrain it to an available screen.
            *state.mac_anchor.lock().unwrap()=None;
            let previous=Frame::from(window.frame());
            fitted_frame(work,previous.x+previous.width/2.,previous.top(),height)
        };
        window.setFrame_display(frame.into(),true);
        Ok(())
    }
    pub fn toggle(app:&tauri::AppHandle) {
        let handle=app.clone();
        if let Err(error)=app.run_on_main_thread(move||{
            match handle.get_webview_panel("main") {
                Ok(panel) if panel.as_panel().isVisible()=>{crate::panel::hide(&handle);return;},
                Err(error)=>{report(&handle,format!("{error:?}"));return;},
                _=>{}
            }
            let point=NSEvent::mouseLocation();
            *handle.state::<crate::panel::Panel>().mac_anchor.lock().unwrap()=Some((point.x,point.y));
            match position(&handle) {
                Ok(())=>crate::panel::show(&handle),
                Err(error)=>report(&handle,error),
            }
        }) { report(app,error); }
    }
    pub fn resize(app:&tauri::AppHandle)->Result<(),String> {
        let handle=app.clone();
        app.run_on_main_thread(move||{if let Err(error)=position(&handle){report(&handle,error);}}).map_err(|e|e.to_string())
    }
}
#[cfg(target_os="macos")]
pub use native::{resize,toggle};

#[cfg(test)]
mod tests {
    use super::*;
    const LAPTOP:Frame=Frame{x:0.,y:0.,width:1512.,height:982.};
    #[test]
    fn external_screens_use_one_logical_coordinate_space_in_every_arrangement() {
        let external=[
            Frame{x:1512.,y:0.,width:1920.,height:1080.},
            Frame{x:-1920.,y:0.,width:1920.,height:1080.},
            Frame{x:0.,y:982.,width:1920.,height:1080.},
            Frame{x:0.,y:-1080.,width:1920.,height:1080.},
        ];
        for screen in external {
            let point=(screen.x+900.,screen.top()-12.);
            assert_eq!(screen_at(&[LAPTOP,screen],point),Some(1));
            let work=Frame{height:screen.height-24.,..screen};
            let result=menu_frame(screen,work,point,24.,280.);
            assert_eq!(result.x,point.0-195.);
            assert_eq!(result.top(),work.top()-6.);
            assert_eq!(result.width,390.); // Same logical size on Retina and 1x screens.
        }
    }
    #[test]
    fn resizing_retains_the_clicked_external_screen_and_menu_edge() {
        let screen=Frame{x:-2560.,y:200.,width:2560.,height:1440.};
        let work=Frame{height:1416.,..screen};
        let point=(-50.,screen.top()-12.);
        let small=menu_frame(screen,work,point,24.,200.);
        let large=menu_frame(screen,work,point,24.,680.);
        assert_eq!(small.top(),large.top());
        assert_eq!(small.x,large.x);
        assert_eq!(large.x+large.width,-6.);
        assert!(work.contains((large.x,large.y)));
    }
    #[test]
    fn auto_hidden_menu_and_docks_keep_the_panel_inside_the_visible_frame() {
        let work=Frame{x:70.,y:60.,width:1442.,height:922.};
        let frame=menu_frame(LAPTOP,work,(2.,970.),24.,2000.);
        assert_eq!(frame.x,76.);
        assert_eq!(frame.top(),952.);
        assert_eq!(frame.height,680.);
        assert!(frame.y>=work.y);
        let tiny=Frame{x:0.,y:0.,width:320.,height:200.};
        let frame=menu_frame(tiny,tiny,(310.,190.),24.,680.);
        assert_eq!(frame.width,320.);
        assert!(frame.y>=0. && frame.top()<=200.);
    }
}
