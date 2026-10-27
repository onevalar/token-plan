//! X11 desktop clicks need not change keyboard focus. Observe (never grab) button
//! presses while the popup is visible; Wayland keeps the normal focus fallback.
fn outside(point:(i32,i32),origin:(i32,i32),size:(u32,u32))->bool {
    let (x,y)=(i64::from(point.0),i64::from(point.1));
    let (left,top)=(i64::from(origin.0),i64::from(origin.1));
    x<left || y<top || x>=left+i64::from(size.0) || y>=top+i64::from(size.1)
}

#[cfg(target_os="linux")]
mod native {
    use super::outside;
    use std::{sync::{mpsc,OnceLock},time::Duration};
    use tauri::Manager;
    use x11_dl::{xinput2,xlib};

    #[derive(Default)]
    pub struct Observer(OnceLock<mpsc::Sender<bool>>);

    pub fn watch(app:&tauri::AppHandle,enabled:bool) {
        if let Some(tx)=app.state::<Observer>().0.get() {let _=tx.send(enabled);}
    }

    pub fn install(app:&tauri::AppHandle) {
        use gtk::prelude::*;
        let x11=gtk::gdk::Display::default().is_some_and(|d|d.type_().name()=="GdkX11Display");
        // XWayland cannot observe clicks in native Wayland clients.
        if !x11 || std::env::var("XDG_SESSION_TYPE").is_ok_and(|s|s=="wayland") {return;}
        let (tx,rx)=mpsc::channel();
        if app.state::<Observer>().0.set(tx).is_err() {return;}
        let handle=app.clone();
        std::thread::spawn(move||{
            if let Err(error)=run(handle,rx) {eprintln!("X11 outside-click detection unavailable; using focus dismissal: {error}");}
        });
    }

    fn run(app:tauri::AppHandle,rx:mpsc::Receiver<bool>)->Result<(),String> {
        let x=xlib::Xlib::open().map_err(|e|e.to_string())?;
        let xi=xinput2::XInput2::open().map_err(|e|e.to_string())?;
        // This connection is created and used only on this thread; GTK's connection
        // is never accessed here. No pointer/keyboard grabs or key events are used.
        unsafe {
            let display=(x.XOpenDisplay)(std::ptr::null());
            if display.is_null() {return Err("cannot open X11 display".into());}
            let result=(||{
                let (mut opcode,mut event,mut error)=(0,0,0);
                if (x.XQueryExtension)(display,c"XInputExtension".as_ptr(),&mut opcode,&mut event,&mut error)==0 {
                    return Err("XInput2 is missing".into());
                }
                let (mut major,mut minor)=(2,0);
                if (xi.XIQueryVersion)(display,&mut major,&mut minor)!=0 {return Err("XInput2 2.0 is unavailable".into());}
                let root=(x.XDefaultRootWindow)(display);
                let mut enabled=false;
                loop {
                    let message=if enabled {rx.recv_timeout(Duration::from_millis(10))}
                        else {rx.recv().map_err(|_|mpsc::RecvTimeoutError::Disconnected)};
                    match message {
                        Ok(value)=>{
                            enabled=value;
                            // Discard presses from before this visibility transition,
                            // including the tray/menu click which opened the popup.
                            while (x.XPending)(display)>0 {
                                let mut old=std::mem::zeroed();
                                (x.XNextEvent)(display,&mut old);
                            }
                            let mut bits=[0u8;4];
                            if enabled {xinput2::XISetMask(&mut bits,xinput2::XI_RawButtonPress);}
                            let mut mask=xinput2::XIEventMask{deviceid:xinput2::XIAllMasterDevices,mask_len:bits.len() as i32,mask:bits.as_mut_ptr()};
                            if (xi.XISelectEvents)(display,root,&mut mask,1)!=0 {return Err("cannot observe X11 pointer buttons".into());}
                            (x.XFlush)(display);
                        },
                        Err(mpsc::RecvTimeoutError::Disconnected)=>return Ok(()),
                        Err(mpsc::RecvTimeoutError::Timeout)=>{},
                    }
                    while (x.XPending)(display)>0 {
                        let mut event:xlib::XEvent=std::mem::zeroed();
                        (x.XNextEvent)(display,&mut event);
                        if !enabled || event.get_type()!=xlib::GenericEvent {continue;}
                        let cookie=event.generic_event_cookie;
                        if cookie.extension!=opcode || cookie.evtype!=xinput2::XI_RawButtonPress {continue;}
                        let (mut returned_root,mut child)=(0,0);
                        let (mut root_x,mut root_y,mut win_x,mut win_y,mut buttons)=(0,0,0,0,0);
                        if (x.XQueryPointer)(display,root,&mut returned_root,&mut child,&mut root_x,&mut root_y,&mut win_x,&mut win_y,&mut buttons)==0 {continue;}
                        let revision=app.state::<crate::panel::Panel>().outside_revision();
                        let ui=app.clone();
                        app.run_on_main_thread(move||{
                            let state=ui.state::<crate::panel::Panel>();
                            if !state.allows_outside_dismissal(revision) {return;}
                            if let Some(window)=ui.get_webview_window("main") {
                                if !window.is_visible().unwrap_or(false) {return;}
                                if let (Ok(origin),Ok(size))=(window.outer_position(),window.outer_size()) {
                                    if outside((root_x,root_y),(origin.x,origin.y),(size.width,size.height)) {crate::panel::hide(&ui);}
                                }
                            }
                        }).map_err(|e|e.to_string())?;
                    }
                }
            })();
            (x.XCloseDisplay)(display);
            result
        }
    }
}
#[cfg(target_os="linux")]
pub use native::{install,watch,Observer};

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn pointer_bounds_include_content_and_exclude_desktop() {
        assert!(!outside((100,50),(100,50),(390,680)));
        assert!(!outside((489,729),(100,50),(390,680)));
        assert!(outside((490,50),(100,50),(390,680)));
        assert!(outside((100,730),(100,50),(390,680)));
        assert!(outside((99,50),(100,50),(390,680)));
        assert!(!outside((-1800,400),(-1920,48),(780,1360)));
        assert!(outside((0,400),(-1920,48),(780,1360)));
    }
}
