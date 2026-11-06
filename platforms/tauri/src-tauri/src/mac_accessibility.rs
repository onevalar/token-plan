//! WKWebView has no prefers-reduced-transparency media query. Forward AppKit's setting.
use std::{cell::RefCell, sync::atomic::Ordering};
use tauri::{Emitter, Manager};
use tauri_nspanel::{
    objc2::{define_class, msg_send, rc::Retained, sel, AnyThread, DeclaredClass},
    objc2_app_kit::{NSWorkspace, NSWorkspaceAccessibilityDisplayOptionsDidChangeNotification},
    objc2_foundation::{NSNotification, NSObject},
};

define_class!(
    // The callback can arrive on the posting thread; it only dispatches an AppHandle to the main thread.
    #[unsafe(super(NSObject))]
    #[ivars = tauri::AppHandle]
    struct TokenPlanAccessibilityObserver;

    impl TokenPlanAccessibilityObserver {
        #[unsafe(method(displayOptionsChanged:))]
        fn display_options_changed(&self, _notification: &NSNotification) {
            let app=self.ivars();
            let handle=app.clone();
            if let Err(error)=app.run_on_main_thread(move||refresh(&handle)) {
                eprintln!("Could not refresh macOS accessibility settings: {error}");
                let _=app.emit("desktop-error","request_failed");
            }
        }
    }
);

thread_local! {
    // Selector observers are not retained by NSNotificationCenter. Own this one on the setup/main
    // thread until the app exits; never move the Objective-C object into Tauri's shared state.
    static OBSERVER:RefCell<Option<Retained<TokenPlanAccessibilityObserver>>>=const {RefCell::new(None)};
}

fn refresh(app:&tauri::AppHandle) {
    let reduced=NSWorkspace::sharedWorkspace().accessibilityDisplayShouldReduceTransparency();
    if app.state::<crate::panel::Panel>().reduce_transparency.swap(reduced,Ordering::SeqCst)!=reduced {
        if let Err(error)=app.emit("panel-frame",crate::panel::panel_frame(app.clone())) {
            eprintln!("Could not publish macOS accessibility settings: {error}");
            let _=app.emit("desktop-error","request_failed");
        }
    }
}

/// Called once from Tauri setup on the main thread, before the frontend can request its frame.
pub fn observe(app:&tauri::AppHandle) {
    let allocated=TokenPlanAccessibilityObserver::alloc().set_ivars(app.clone());
    // NSObject's initializer preserves our initialized Rust ivars.
    let observer:Retained<TokenPlanAccessibilityObserver>=unsafe {msg_send![super(allocated),init]};
    unsafe {
        // The selector above accepts exactly the NSNotification argument sent by this center.
        NSWorkspace::sharedWorkspace().notificationCenter().addObserver_selector_name_object(
            &observer,sel!(displayOptionsChanged:),
            Some(NSWorkspaceAccessibilityDisplayOptionsDidChangeNotification),None,
        );
    }
    OBSERVER.with(|slot|*slot.borrow_mut()=Some(observer));
    // Register before reading so a change cannot be lost between the initial read and observation.
    refresh(app);
}
