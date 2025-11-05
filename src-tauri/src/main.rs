// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, GlobalShortcutManager, Manager, SystemTray, SystemTrayEvent,
    SystemTrayMenu, SystemTrayMenuItem,
};
use std::sync::Mutex;
use std::path::PathBuf;

// Global state to store clipboard content
struct ClipboardState(Mutex<String>);

// Global state to store current hotkey
struct HotkeyState(Mutex<String>);

// Utility: safely truncate a &str by character count to avoid UTF-8 boundary panics
fn truncate_chars(s: &str, max_chars: usize) -> String {
    s.chars().take(max_chars).collect::<String>()
}

// Utility: get total character count (not bytes)
fn char_len(s: &str) -> usize {
    s.chars().count()
}

// Utility: redact sensitive text for logging (show only length unless in verbose mode)
fn redact_text(s: &str) -> String {
    if cfg!(debug_assertions) && std::env::var("VERBOSE_LOG").is_ok() {
        // In debug mode with VERBOSE_LOG env var, show truncated text
        if char_len(s) > 50 {
            format!("{}... ({} chars)", truncate_chars(s, 50), char_len(s))
        } else {
            s.to_string()
        }
    } else {
        // In production or without VERBOSE_LOG, only show length
        format!("<redacted {} chars>", char_len(s))
    }
}

// Use selection crate's get_text function (like Pot)
fn get_selected_text() -> String {
    use selection::get_text;

    println!("=== Getting selected text using selection crate ===");
    let text = get_text();
    println!("Selected text: {}", redact_text(&text));
    text
}

#[tauri::command]
async fn get_selected_text_command() -> Result<String, String> {
    let text = get_selected_text();
    if text.trim().is_empty() {
        Err("No text selected".to_string())
    } else {
        Ok(text)
    }
}

#[tauri::command]
async fn translate_text(text: String, target_lang: String, source_lang: String) -> Result<String, String> {
    println!("=== translate_text called ===");
    println!("Text: {}", redact_text(&text));
    println!("Source lang: {}", source_lang);
    println!("Target lang: {}", target_lang);

    // Google Translate Web API (no API key required, same as pot-app)
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    let url = "https://translate.google.com/translate_a/single";

    println!("Sending request to Google Translate...");

    match client.get(url)
        .query(&[
            ("client", "gtx"),
            ("sl", &source_lang),
            ("tl", &target_lang),
            ("hl", &target_lang),
            ("dt", "t"),
            ("dt", "bd"),
            ("dj", "1"),
            ("source", "input"),
            ("q", &text),
        ])
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            println!("Response status: {}", status);

            if response.status().is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(json) => {
                        println!("Received JSON response");
                        println!("JSON: {}", serde_json::to_string_pretty(&json).unwrap_or_default());

                        if let Some(sentences) = json["sentences"].as_array() {
                            println!("Found {} sentences", sentences.len());
                            let mut result = String::new();
                            for sentence in sentences {
                                if let Some(trans) = sentence["trans"].as_str() {
                                    println!("Translation part: {}", trans);
                                    result.push_str(trans);
                                }
                            }
                            if !result.is_empty() {
                                println!("Final translation: {}", result);
                                return Ok(result);
                            }
                            println!("No translation found in sentences");
                        } else {
                            println!("No 'sentences' field in JSON");
                        }
                        Err("Translation not found in response".to_string())
                    }
                    Err(e) => {
                        println!("Failed to parse JSON: {}", e);
                        Err(format!("Failed to parse response: {}", e))
                    }
                }
            } else {
                println!("Request failed with status: {}", status);
                Err(format!("API request failed with status: {}", response.status()))
            }
        }
        Err(e) => {
            println!("Request error: {}", e);
            if e.is_timeout() {
                Err("翻訳リクエストがタイムアウトしました。インターネット接続を確認してください。".to_string())
            } else if e.is_connect() {
                Err("Google翻訳に接続できませんでした。オフラインの可能性があります。".to_string())
            } else {
                Err(format!("リクエストに失敗しました: {}", e))
            }
        }
    }
}

#[tauri::command]
async fn get_gemini_models(api_key: String) -> Result<Vec<String>, String> {
    println!("Fetching Gemini models with key length: {}", api_key.len());
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    // Correct endpoint for listing models
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", api_key);

    println!("Request URL: {}", url.replace(&api_key, "***"));

    match client.get(&url).send().await {
        Ok(response) => {
            let status = response.status();
            println!("Response status: {}", status);

            // Get response body as text for debugging
            match response.text().await {
                Ok(body) => {
                    let preview = truncate_chars(&body, 500);
                    println!("Response body (first 500 chars): {}", preview);

                    if status.is_success() {
                        match serde_json::from_str::<serde_json::Value>(&body) {
                            Ok(json) => {
                                println!("Successfully parsed JSON");
                                let mut models = Vec::new();
                                if let Some(model_list) = json["models"].as_array() {
                                    println!("Found {} models in response", model_list.len());
                                    for model in model_list {
                                        if let Some(name) = model["name"].as_str() {
                                            // Extract model name from "models/gemini-xxx" format
                                            if let Some(model_name) = name.strip_prefix("models/") {
                                                println!("Adding model: {}", model_name);
                                                models.push(model_name.to_string());
                                            }
                                        }
                                    }
                                } else {
                                    println!("No 'models' array found in response");
                                }
                                println!("Returning {} models", models.len());
                                Ok(models)
                            }
                            Err(e) => {
                                let err_msg = format!("Failed to parse JSON: {}", e);
                                println!("{}", err_msg);
                                // Return fallback models if parsing fails
                                Ok(get_fallback_models())
                            }
                        }
                    } else {
                        let err_msg = format!("API returned error {}: {}", status, body);
                        println!("{} - Using fallback models", err_msg);
                        // Return fallback models if API call fails
                        Ok(get_fallback_models())
                    }
                }
                Err(e) => {
                    let err_msg = format!("Failed to read response body: {}", e);
                    println!("{} - Using fallback models", err_msg);
                    Ok(get_fallback_models())
                }
            }
        }
        Err(e) => {
            let err_msg = format!("Request failed: {}", e);
            println!("{} - Using fallback models", err_msg);
            Ok(get_fallback_models())
        }
    }
}

// Fallback list of commonly used Gemini models
fn get_fallback_models() -> Vec<String> {
    vec![
        "gemini-2.0-flash-exp".to_string(),
        "gemini-2.0-flash".to_string(),
        "gemini-1.5-flash".to_string(),
        "gemini-1.5-flash-8b".to_string(),
        "gemini-1.5-pro".to_string(),
        "gemini-pro".to_string(),
    ]
}

#[tauri::command]
async fn get_latest_flash_model(api_key: String) -> Result<String, String> {
    let models = get_gemini_models(api_key).await?;

    // Filter flash models and sort to get the latest
    let mut flash_models: Vec<String> = models
        .into_iter()
        .filter(|m| m.contains("flash") && m.contains("gemini"))
        .collect();

    if flash_models.is_empty() {
        return Err("No flash models found".to_string());
    }

    // Sort to get the latest version (e.g., gemini-2.5-flash is newer than gemini-1.5-flash)
    flash_models.sort_by(|a, b| b.cmp(a)); // Descending order

    Ok(flash_models[0].clone())
}

#[tauri::command]
async fn translate_with_gemini(text: String, target_lang: String, api_key: String, model: Option<String>) -> Result<String, String> {
    println!("=== Gemini Translation Start ===");
    println!("Text: {}", redact_text(&text));
    println!("Target Lang: {}", target_lang);
    println!("API Key length: {}", api_key.len());
    println!("Model: {:?}", model);

    // Use provided model or get the latest flash model
    let model_name = match model {
        Some(m) => {
            println!("Using provided model: {}", m);
            m
        },
        None => {
            println!("Getting latest flash model...");
            match get_latest_flash_model(api_key.clone()).await {
                Ok(m) => {
                    println!("Latest flash model: {}", m);
                    m
                },
                Err(e) => {
                    println!("Failed to get latest flash model: {}", e);
                    return Err(e);
                }
            }
        }
    };

    println!("Final model name: {}", model_name);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model_name, api_key
    );

    println!("Request URL: {}", url.replace(&api_key, "***"));

    // System-style instruction to improve translation quality and preserve formatting/placeholders
    let system_instruction = format!(
        concat!(
            "You are a professional translation engine. Translate the user-provided text into {} only.\n",
            "Constraints:\n",
            "- Preserve original formatting, line breaks, markdown, code blocks, and list structure.\n",
            "- Keep placeholders and variables untouched (e.g., {{like_this}}, {{{{curly}}}}, %s, %d, {{{{name}}}}, <tag>, URLs, and file paths).\n",
            "- Do not add explanations or commentary. Output only the translated text.\n",
            "- Maintain numbers, units, punctuation, emojis, and inline symbols.\n",
            "- If the text is mostly code or untranslatable terms, keep them as-is and translate surrounding prose naturally.\n",
            "- Prefer concise, natural, context-appropriate wording.\n"
        ),
        target_lang
    );

    let prompt = format!(
        "{}\n\nText to translate:\n{}",
        system_instruction,
        text
    );

    let params = serde_json::json!({
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    });

    println!("Request params: {}", serde_json::to_string(&params).unwrap_or_default());

    match client.post(&url).json(&params).send().await {
        Ok(response) => {
            let status = response.status();
            println!("Response status: {}", status);

            if status.is_success() {
                match response.text().await {
                    Ok(body) => {
                        let preview = truncate_chars(&body, 300);
                        println!("Response body (first 300 chars): {}", preview);
                        match serde_json::from_str::<serde_json::Value>(&body) {
                            Ok(json) => {
                                if let Some(candidates) = json["candidates"].as_array() {
                                    if let Some(candidate) = candidates.get(0) {
                                        if let Some(content) = candidate["content"]["parts"].as_array() {
                                            if let Some(part) = content.get(0) {
                                                if let Some(translated_text) = part["text"].as_str() {
                                                    println!("Translation successful!");
                                                    return Ok(translated_text.to_string());
                                                }
                                            }
                                        }
                                    }
                                }
                                let err = "Translation not found in Gemini response".to_string();
                                println!("Error: {}", err);
                                Err(err)
                            }
                            Err(e) => {
                                let err = format!("Failed to parse Gemini response: {}", e);
                                println!("Error: {}", err);
                                Err(err)
                            }
                        }
                    }
                    Err(e) => {
                        let err = format!("Failed to read response body: {}", e);
                        println!("Error: {}", err);
                        Err(err)
                    }
                }
            } else {
                match response.text().await {
                    Ok(body) => {
                        let err = format!("Gemini API request failed with status {}: {}", status, body);
                        println!("Error: {}", err);
                        Err(err)
                    }
                    Err(e) => {
                        let err = format!("Gemini API request failed with status {}: {}", status, e);
                        println!("Error: {}", err);
                        Err(err)
                    }
                }
            }
        }
        Err(e) => {
            let err = if e.is_timeout() {
                "Gemini APIリクエストがタイムアウトしました。".to_string()
            } else if e.is_connect() {
                "Gemini APIに接続できませんでした。オフラインの可能性があります。".to_string()
            } else {
                format!("Geminiリクエストに失敗しました: {}", e)
            };
            println!("Error: {}", err);
            Err(err)
        }
    }
}

#[tauri::command]
async fn get_clipboard_text() -> Result<String, String> {
    use clipboard::{ClipboardContext, ClipboardProvider};

    let mut ctx: ClipboardContext = ClipboardProvider::new()
        .map_err(|e| format!("Failed to get clipboard context: {}", e))?;

    ctx.get_contents()
        .map_err(|e| format!("Failed to get clipboard contents: {}", e))
}

#[tauri::command]
async fn detect_language(text: String) -> Result<String, String> {
    // Use Google Translate Web API for language detection (no API key required)
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    let url = "https://translate.google.com/translate_a/single";

    match client.get(url)
        .query(&[
            ("client", "gtx"),
            ("sl", "auto"),
            ("tl", "en"),
            ("dt", "t"),
            ("q", &text),
        ])
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.text().await {
                    Ok(body) => {
                        // Parse the response array to extract detected language
                        // Response format: [[["translation",...],...],...,"detected_lang",...]
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&body) {
                            if let Some(arr) = json.as_array() {
                                // The detected language is usually at index 2
                                if arr.len() > 2 {
                                    if let Some(lang) = arr[2].as_str() {
                                        return Ok(lang.to_string());
                                    }
                                }
                            }
                        }
                        Err("Failed to detect language from response".to_string())
                    }
                    Err(e) => Err(format!("Failed to read response: {}", e)),
                }
            } else {
                Err(format!("Detection request failed with status: {}", response.status()))
            }
        }
        Err(e) => {
            if e.is_timeout() {
                Err("言語検出がタイムアウトしました。".to_string())
            } else if e.is_connect() {
                Err("言語検出に失敗しました。オフラインの可能性があります。".to_string())
            } else {
                Err(format!("言語検出リクエストに失敗しました: {}", e))
            }
        }
    }
}

#[tauri::command]
async fn register_hotkey(app_handle: tauri::AppHandle, hotkey: String, state: tauri::State<'_, HotkeyState>) -> Result<String, String> {
    println!("Registering new hotkey: {}", hotkey);

    let mut current_hotkey = state.0.lock().unwrap();
    let old_hotkey = current_hotkey.clone();

    // Unregister old hotkey if it exists
    if !old_hotkey.is_empty() {
        println!("Unregistering old hotkey: {}", old_hotkey);
        match app_handle.global_shortcut_manager().unregister(&old_hotkey) {
            Ok(_) => println!("Successfully unregistered old hotkey"),
            Err(e) => println!("Warning: Failed to unregister old hotkey: {}", e),
        }
    }

    // Register new hotkey
    let app_handle_clone = app_handle.clone();
    let hotkey_display = hotkey.clone();
    match app_handle.global_shortcut_manager()
        .register(&hotkey, move || {
            println!("=== Global shortcut pressed ===");

            // Get text BEFORE showing window
            use selection::get_text;
            let text = get_text();
            println!("Selected text: {}", redact_text(&text));

            // Then show window
            let window = app_handle_clone.get_window("translate").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();

            // Emit event with the text
            window.emit("translate-shortcut", text).unwrap();
        }) {
        Ok(_) => {
            println!("Successfully registered new hotkey: {}", hotkey_display);
            *current_hotkey = hotkey_display.clone();
            Ok(format!("ホットキーを登録しました: {}", hotkey_display))
        }
        Err(e) => {
            let error_msg = format!("ホットキーの登録に失敗しました: {}。このキーは他のアプリケーションで使用されている可能性があります。", e);
            println!("Error: {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
async fn get_current_hotkey(state: tauri::State<'_, HotkeyState>) -> Result<String, String> {
    let hotkey = state.0.lock().unwrap();
    Ok(hotkey.clone())
}

// Auto-start functionality for Windows
#[tauri::command]
async fn enable_auto_start() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::env;

        // Get current executable path
        let exe_path = env::current_exe()
            .map_err(|e| format!("Failed to get executable path: {}", e))?;

        // Get startup folder path
        let startup_folder = get_startup_folder()?;

        // Create shortcut path
        let shortcut_path = startup_folder.join("AfterPot.lnk");

        // Create shortcut using PowerShell
        let ps_script = format!(
            r#"$WScriptShell = New-Object -ComObject WScript.Shell; $Shortcut = $WScriptShell.CreateShortcut('{}'); $Shortcut.TargetPath = '{}'; $Shortcut.Save()"#,
            shortcut_path.display(),
            exe_path.display()
        );

        let output = std::process::Command::new("powershell")
            .args(&["-Command", &ps_script])
            .output()
            .map_err(|e| format!("Failed to execute PowerShell: {}", e))?;

        if output.status.success() {
            println!("Auto-start enabled: {:?}", shortcut_path);
            Ok("自動起動を有効にしました".to_string())
        } else {
            let error = String::from_utf8_lossy(&output.stderr);
            Err(format!("ショートカット作成に失敗しました: {}", error))
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Auto-start is only supported on Windows".to_string())
    }
}

#[tauri::command]
async fn disable_auto_start() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let startup_folder = get_startup_folder()?;
        let shortcut_path = startup_folder.join("AfterPot.lnk");

        if shortcut_path.exists() {
            std::fs::remove_file(&shortcut_path)
                .map_err(|e| format!("ショートカットの削除に失敗しました: {}", e))?;
            println!("Auto-start disabled: {:?}", shortcut_path);
            Ok("自動起動を無効にしました".to_string())
        } else {
            Ok("自動起動は既に無効です".to_string())
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Auto-start is only supported on Windows".to_string())
    }
}

#[tauri::command]
async fn is_auto_start_enabled() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let startup_folder = get_startup_folder()?;
        let shortcut_path = startup_folder.join("AfterPot.lnk");
        Ok(shortcut_path.exists())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

#[cfg(target_os = "windows")]
fn get_startup_folder() -> Result<PathBuf, String> {
    use std::path::PathBuf;

    let appdata = std::env::var("APPDATA")
        .map_err(|_| "APPDATA environment variable not found".to_string())?;

    let startup_folder = PathBuf::from(appdata)
        .join("Microsoft")
        .join("Windows")
        .join("Start Menu")
        .join("Programs")
        .join("Startup");

    if !startup_folder.exists() {
        return Err("Startup folder not found".to_string());
    }

    Ok(startup_folder)
}

fn create_system_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "終了");
    let settings = CustomMenuItem::new("settings".to_string(), "設定");
    let tray_menu = SystemTrayMenu::new()
        .add_item(settings)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}

fn main() {
    let system_tray = create_system_tray();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("Second instance detected!");
            println!("argv: {:?}, cwd: {:?}", argv, cwd);

            // Show and focus the settings window when a second instance is launched
            if let Some(window) = app.get_window("settings") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .manage(ClipboardState(Default::default()))
        .manage(HotkeyState(Mutex::new("Ctrl+Shift+Q".to_string())))
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                // 左クリックで設定画面を開く
                let window = app.get_window("settings").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "settings" => {
                    let window = app.get_window("settings").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            translate_text,
            translate_with_gemini,
            get_clipboard_text,
            get_selected_text_command,
            detect_language,
            get_gemini_models,
            get_latest_flash_model,
            register_hotkey,
            get_current_hotkey,
            enable_auto_start,
            disable_auto_start,
            is_auto_start_enabled
        ])
        .setup(|app| {
            let app_handle = app.handle();
            let state = app.state::<HotkeyState>();
            let hotkey = state.0.lock().unwrap().clone();

            // Register global shortcut (like Pot's implementation)
            // Try to register the saved hotkey (default: Ctrl+Shift+Q)
            let hotkey_for_closure = hotkey.clone();
            let hotkey_for_log = hotkey.clone();
            match app.global_shortcut_manager()
                .register(&hotkey, move || {
                    println!("=== Global shortcut {} pressed ===", hotkey_for_closure);

                    // IMPORTANT: Get text BEFORE showing window (like Pot)
                    use selection::get_text;
                    let text = get_text();
                    println!("Selected text: {}", redact_text(&text));

                    // Then show window
                    let window = app_handle.get_window("translate").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();

                    // Emit event with the text
                    window.emit("translate-shortcut", text).unwrap();
                }) {
                Ok(_) => {
                    println!("Successfully registered global shortcut: {}", hotkey_for_log);
                }
                Err(e) => {
                    eprintln!("WARNING: Failed to register global shortcut {}: {}", hotkey_for_log, e);
                    eprintln!("The hotkey may be in use by another application.");
                    eprintln!("Please change the hotkey in Settings or close conflicting applications.");
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}