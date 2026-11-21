use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            // On a school PC, default to launching after the student logs into Windows.
            // Register ONCE. If an admin disables startup later, never force it back on.
            #[cfg(target_os = "windows")]
            {
                use tauri_plugin_autostart::ManagerExt;
                let preferences_dir = app.path().app_config_dir()?;
                std::fs::create_dir_all(&preferences_dir)?;
                let marker = preferences_dir.join("autostart-choice-initialized");
                if !marker.exists() {
                    app.autolaunch().enable()?;
                    std::fs::write(&marker, b"enabled by default on first run")?;
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Cannot start QLPM Student");
}
