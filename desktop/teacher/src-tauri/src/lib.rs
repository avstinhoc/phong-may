use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
fn open_teacher_google_oauth(app: tauri::AppHandle, url: String) -> Result<(), String> {
    // The user may only open the explicit Supabase OAuth authorize endpoint.
    // No arbitrary URL opener, filesystem/shell or local network access.
    let parsed = url::Url::parse(&url).map_err(|_| "OAuth URL invalid".to_string())?;
    if parsed.scheme() != "https"
        || parsed.host_str() != Some("hzxfgwnwmpdqxkvnqyim.supabase.co")
        || parsed.port_or_known_default() != Some(443)
        || parsed.username() != ""
        || parsed.password().is_some()
        || parsed.path() != "/auth/v1/authorize"
        || parsed.query_pairs().find(|(k, _)| k == "provider").map(|(_, v)| v.to_string()) != Some("google".to_string())
    {
        return Err("Only the QLPM Google login endpoint is allowed".into());
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| format!("Cannot open default browser: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // On Windows, the single-instance plugin must be initialized FIRST.
    // It forwards the deep-link URL to the already running Teacher window.
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_teacher_google_oauth])
        .setup(|app| {
            #[cfg(all(debug_assertions, windows))]
            app.deep_link().register_all()?;
            Ok(())
        });
    builder
        .run(tauri::generate_context!())
        .expect("Cannot start QLPM Teacher");
}
