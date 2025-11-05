import { useState, useEffect } from "react";
import { appWindow, LogicalSize, LogicalPosition } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/tauri";
import "./Settings.css";

interface HistoryEntry {
  id: string;
  timestamp: number;
  originalText: string;
  detectedLanguage: string;
  targetLanguage: string;
  translations: { service: string; result: string; }[];
}

interface ErrorLog {
  timestamp: number;
  context: string;
  error: string;
}

function Settings() {
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("auto");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [targetLanguage, setTargetLanguage] = useState("ja");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string>("");
  const [hotkey, setHotkey] = useState("Ctrl+Shift+Q");
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [hotkeyError, setHotkeyError] = useState<string>("");
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [autoStartLoading, setAutoStartLoading] = useState(false);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  // Apply theme to document
  const applyTheme = (selectedTheme: "light" | "dark" | "system") => {
    let actualTheme: "light" | "dark";

    if (selectedTheme === "system") {
      // Detect system preference
      actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      actualTheme = selectedTheme;
    }

    document.documentElement.setAttribute("data-theme", actualTheme);
  };

  // Handle theme change
  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  // Save window state (size and position) to localStorage
  const saveWindowState = async () => {
    try {
      const size = await appWindow.outerSize();
      const position = await appWindow.outerPosition();

      const settingsWindowState = {
        width: size.width,
        height: size.height,
        x: position.x,
        y: position.y,
      };

      localStorage.setItem("settingsWindowState", JSON.stringify(settingsWindowState));
    } catch (e) {
      console.error("Failed to save settings window state:", e);
    }
  };

  // Restore window state from localStorage
  const restoreWindowState = async () => {
    try {
      const saved = localStorage.getItem("settingsWindowState");
      if (saved) {
        const state = JSON.parse(saved);

        // Restore size
        if (state.width && state.height) {
          await appWindow.setSize(new LogicalSize(state.width, state.height));
        }

        // Restore position
        if (state.x !== undefined && state.y !== undefined) {
          await appWindow.setPosition(new LogicalPosition(state.x, state.y));
        }
      }
    } catch (e) {
      console.error("Failed to restore settings window state:", e);
    }
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    // Restore window state
    restoreWindowState();

    const savedGeminiKey = localStorage.getItem("geminiApiKey");
    const savedGeminiModel = localStorage.getItem("geminiModel");
    const savedTargetLang = localStorage.getItem("targetLanguage");
    const savedHotkey = localStorage.getItem("hotkey");
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;

    if (savedGeminiKey) {
      setGeminiApiKey(savedGeminiKey);
      // Load models immediately if key exists
      if (savedGeminiKey.length > 10) {
        fetchModels(savedGeminiKey);
      }
    }
    if (savedGeminiModel) setGeminiModel(savedGeminiModel);
    if (savedTargetLang) setTargetLanguage(savedTargetLang);
    if (savedHotkey) setHotkey(savedHotkey);

    // Load and apply theme
    const themeToApply = savedTheme || "system";
    setTheme(themeToApply);
    applyTheme(themeToApply);

    // Listen to system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    // Load translation history
    loadHistory();

    // Load error logs
    loadErrorLogs();

    // Check auto-start status
    checkAutoStartStatus();

    // Get current hotkey from backend
    invoke<string>("get_current_hotkey")
      .then((currentHotkey) => {
        if (currentHotkey) {
          setHotkey(currentHotkey);
        }
      })
      .catch((err) => console.error("Failed to get current hotkey:", err));

    // Save window state periodically and on unmount
    const saveInterval = setInterval(saveWindowState, 3000);
    return () => {
      clearInterval(saveInterval);
      saveWindowState();
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const fetchModels = async (apiKey: string) => {
    setIsLoadingModels(true);
    setModelError("");
    console.log("Fetching models with API key...");
    try {
      const models = await invoke<string[]>("get_gemini_models", {
        apiKey: apiKey,
      });
      console.log("Fetched models:", models);
      setAvailableModels(models);
      if (models.length === 0) {
        setModelError("モデルが見つかりませんでした");
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
      setModelError(`エラー: ${error}`);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleApiKeyChange = (newKey: string) => {
    setGeminiApiKey(newKey);
    if (newKey.length > 10) {
      fetchModels(newKey);
    } else {
      setAvailableModels([]);
      setModelError("");
    }
  };

  const handleSave = () => {
    localStorage.setItem("geminiApiKey", geminiApiKey);
    localStorage.setItem("geminiModel", geminiModel);
    localStorage.setItem("targetLanguage", targetLanguage);
    localStorage.setItem("hotkey", hotkey);

    alert("設定を保存しました！");
  };

  const handleHotkeyChange = async () => {
    setHotkeyError("");
    try {
      const result = await invoke<string>("register_hotkey", { hotkey });
      alert(result);
      localStorage.setItem("hotkey", hotkey);
    } catch (error) {
      const errorMsg = String(error);
      setHotkeyError(errorMsg);
      alert(errorMsg);
    }
  };

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem("translationHistory");
      if (saved) {
        const history = JSON.parse(saved) as HistoryEntry[];
        setHistoryEntries(history);
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  };

  const clearHistory = () => {
    if (confirm("翻訳履歴をすべて削除しますか？")) {
      localStorage.removeItem("translationHistory");
      setHistoryEntries([]);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const checkAutoStartStatus = async () => {
    try {
      const enabled = await invoke<boolean>("is_auto_start_enabled");
      setAutoStartEnabled(enabled);
    } catch (error) {
      console.error("Failed to check auto-start status:", error);
    }
  };

  const handleAutoStartToggle = async () => {
    setAutoStartLoading(true);
    try {
      if (autoStartEnabled) {
        const result = await invoke<string>("disable_auto_start");
        alert(result);
        setAutoStartEnabled(false);
      } else {
        const result = await invoke<string>("enable_auto_start");
        alert(result);
        setAutoStartEnabled(true);
      }
    } catch (error) {
      alert("自動起動設定に失敗しました: " + error);
    } finally {
      setAutoStartLoading(false);
    }
  };

  const loadErrorLogs = () => {
    try {
      const saved = localStorage.getItem("errorLogs");
      if (saved) {
        const logs = JSON.parse(saved) as ErrorLog[];
        setErrorLogs(logs);
      }
    } catch (e) {
      console.error("Failed to load error logs:", e);
    }
  };

  const clearErrorLogs = () => {
    if (confirm("すべてのエラーログを削除しますか？")) {
      localStorage.removeItem("errorLogs");
      setErrorLogs([]);
    }
  };

  const exportErrorLogs = () => {
    const logsText = errorLogs.map(log => {
      const date = new Date(log.timestamp).toLocaleString("ja-JP");
      return `[${date}] ${log.context}: ${log.error}`;
    }).join("\n\n");

    const blob = new Blob([logsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afterpot-error-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRecordHotkey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsRecordingHotkey(true);

    const keys: string[] = [];
    if (e.ctrlKey) keys.push("Ctrl");
    if (e.shiftKey) keys.push("Shift");
    if (e.altKey) keys.push("Alt");
    if (e.metaKey) keys.push("Command");

    const key = e.key.toUpperCase();
    if (key !== "CONTROL" && key !== "SHIFT" && key !== "ALT" && key !== "META") {
      keys.push(key);
    }

    if (keys.length >= 2) {
      const newHotkey = keys.join("+");
      setHotkey(newHotkey);
      setIsRecordingHotkey(false);
    }
  };

  const handleClose = () => {
    appWindow.hide();
  };

  const handleTestTranslation = async () => {
    const testText = "Hello, this is a test translation.";
    try {
      // Open translate window and emit test event
      const translateWindow = await import("@tauri-apps/api/window").then(
        (mod) => mod.WebviewWindow.getByLabel("translate")
      );
      if (translateWindow) {
        await translateWindow.show();
        await translateWindow.setFocus();
        // Emit event with test text
        await translateWindow.emit("translate-shortcut", testText);
      }
    } catch (error) {
      console.error("Failed to test translation:", error);
      alert("翻訳テストに失敗しました: " + error);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>AfterPot 設定</h1>
        <button onClick={handleClose} className="close-button">
          ×
        </button>
      </div>

      <div className="settings-content">
        <div className="info-box">
          <h3>📌 使い方</h3>
          <ul>
            <li>テキストを選択して <strong>Ctrl+Shift+Q</strong> を押す</li>
            <li>翻訳結果がポップアップで表示されます</li>
            <li>Google翻訳は<strong>無料</strong>で使えます（APIキー不要）</li>
            <li>Gemini翻訳はAPIキーが必要です（オプション）</li>
            <li>Geminiは最新のFlashモデルを自動選択します</li>
            <li>日本語⇔英語は自動で判定されます</li>
          </ul>
        </div>

        <div className="form-group">
          <label>グローバルホットキー</label>
          <div className="flex-row">
            <input
              type="text"
              value={isRecordingHotkey ? "キーを押してください..." : hotkey}
              onChange={(e) => setHotkey(e.target.value)}
              onKeyDown={handleRecordHotkey}
              onFocus={() => setIsRecordingHotkey(true)}
              onBlur={() => setIsRecordingHotkey(false)}
              placeholder="キーを押して記録（例: Ctrl+Shift+Q）"
              className="input-field flex-1"
            />
            <button
              onClick={handleHotkeyChange}
              className="save-button p-8-16 fs-14 min-w-auto"
            >
              適用
            </button>
          </div>
          <small className={hotkeyError ? "error-text" : ""}>
            {hotkeyError ? hotkeyError : "入力欄をクリックしてキーを押すと自動で記録されます。Ctrl/Shift/Alt + キーの組み合わせを推奨"}
          </small>
        </div>

        <div className="form-group">
          <label>Gemini API Key (オプション)</label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="Gemini APIキーを入力（なくても使えます）"
            className="input-field"
          />
          <small>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.open("https://makersuite.google.com/app/apikey");
              }}
            >
              API Keyの取得方法 →
            </a>
          </small>
        </div>

        <div className="form-group">
          <label>Gemini モデル</label>
          <div className="flex-row">
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="select-field flex-1"
              title="Gemini Model"
              disabled={!geminiApiKey || isLoadingModels}
            >
              <option value="auto">自動（最新のFlashモデル）</option>
              {availableModels
                .filter((m) => m.includes("flash") || m.includes("pro"))
                .map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
            </select>
            <button
              onClick={() => geminiApiKey && fetchModels(geminiApiKey)}
              disabled={!geminiApiKey || isLoadingModels}
              className="save-button p-8-16 fs-14 min-w-auto"
            >
              {isLoadingModels ? "取得中..." : "更新"}
            </button>
          </div>
          <small className={modelError ? "error-text" : ""}>
            {isLoadingModels && "モデル一覧を取得中..."}
            {!isLoadingModels && modelError && modelError}
            {!isLoadingModels && !modelError && availableModels.length > 0 &&
              `${availableModels.length}個のモデルが利用可能です (Flash/Pro: ${availableModels.filter(m => m.includes("flash") || m.includes("pro")).length}個)`}
            {!isLoadingModels && !modelError && geminiApiKey && availableModels.length === 0 &&
              "モデルが取得できませんでした"}
            {!geminiApiKey && "※ APIキーを入力すると利用可能なモデルが表示されます"}
          </small>
        </div>

        <div className="form-group">
          <label>デフォルト翻訳先言語</label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="select-field"
            title="Target Language"
          >
            <option value="ja">日本語 (Japanese)</option>
            <option value="en">英語 (English)</option>
            <option value="zh">中国語 (Chinese)</option>
            <option value="ko">韓国語 (Korean)</option>
            <option value="fr">フランス語 (French)</option>
            <option value="de">ドイツ語 (German)</option>
            <option value="es">スペイン語 (Spanish)</option>
          </select>
          <small>
            ※ 日本語と英語は自動で相互翻訳されます
          </small>
        </div>

        <div className="button-group">
          <button onClick={handleSave} className="save-button">
            保存
          </button>
          <button onClick={handleTestTranslation} className="save-button test-button">
            翻訳テスト
          </button>
        </div>

        {/* Auto-start Section */}
        <div className="form-group">
          <label>Windows起動時に自動起動</label>
          <div className="flex-row-10">
            <label className="switch">
              <input
                type="checkbox"
                checked={autoStartEnabled}
                onChange={handleAutoStartToggle}
                disabled={autoStartLoading}
                aria-label="自動起動設定"
              />
              <span className="slider"></span>
            </label>
            <span className="text-secondary">
              {autoStartEnabled ? "有効" : "無効"}
            </span>
          </div>
          <small>
            {autoStartLoading && "設定中..."}
            {!autoStartLoading && "Windows起動時にAfterPotを自動的に起動します"}
          </small>
        </div>

        {/* Theme Setting Section */}
        <div className="form-group">
          <label>テーマ</label>
          <div className="theme-button-container">
            <button
              onClick={() => handleThemeChange("light")}
              className={`save-button theme-button ${theme === "light" ? "theme-button-active" : "theme-button-inactive"}`}
            >
              ライト
            </button>
            <button
              onClick={() => handleThemeChange("dark")}
              className={`save-button theme-button ${theme === "dark" ? "theme-button-active" : "theme-button-inactive"}`}
            >
              ダーク
            </button>
            <button
              onClick={() => handleThemeChange("system")}
              className={`save-button theme-button ${theme === "system" ? "theme-button-active" : "theme-button-inactive"}`}
            >
              システム
            </button>
          </div>
          <small>
            テーマを切り替えます（システムはOS設定に従います）
          </small>
        </div>

        {/* Translation History Section */}
        <div className="form-group">
          <div className="flex-between">
            <label>翻訳履歴</label>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="save-button p-4-12 fs-12 min-w-auto"
            >
              {showHistory ? "非表示" : "表示"}
            </button>
          </div>
          {showHistory && (
            <div className="mt-10">
              <div className="mb-10">
                <button
                  onClick={clearHistory}
                  className="save-button p-4-12 fs-12 bg-red"
                >
                  履歴をクリア
                </button>
                <small className="ml-10 color-666">
                  {historyEntries.length}件の履歴
                </small>
              </div>
              <div className="history-container">
                {historyEntries.length === 0 ? (
                  <p className="history-empty">
                    履歴がありません
                  </p>
                ) : (
                  historyEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="history-item"
                    >
                      <div className="history-header">
                        <span>{formatDate(entry.timestamp)}</span>
                        <span>
                          {entry.detectedLanguage} → {entry.targetLanguage}
                        </span>
                      </div>
                      <div className="history-text mb-4 fw-500">
                        {entry.originalText.length > 60
                          ? entry.originalText.substring(0, 60) + "..."
                          : entry.originalText}
                      </div>
                      {entry.translations.map((trans, idx) => (
                        <div
                          key={idx}
                          className="history-translation"
                        >
                          <strong>{trans.service}:</strong>{" "}
                          {trans.result.length > 80
                            ? trans.result.substring(0, 80) + "..."
                            : trans.result}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Log Viewer */}
        <div className="setting-section">
          <h3>エラーログ</h3>
          <div className="flex-between">
            <p>翻訳エラーのログを確認できます</p>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`save-button ${showLogs ? "bg-gray" : "bg-blue"}`}
            >
              {showLogs ? "非表示" : "表示"}
            </button>
          </div>
          {showLogs && (
            <div className="mt-10">
              <div className="mb-10 button-group-flex">
                <button
                  onClick={clearErrorLogs}
                  className="save-button flex-1 bg-red"
                >
                  ログをクリア
                </button>
                <button
                  onClick={exportErrorLogs}
                  className="save-button flex-1 bg-green"
                >
                  ログをエクスポート
                </button>
                <small className="ml-10 color-666 self-center">
                  {errorLogs.length}件のログ
                </small>
              </div>
              <div className="history-container">
                {errorLogs.length === 0 ? (
                  <p className="history-empty">
                    エラーログはありません
                  </p>
                ) : (
                  errorLogs.map((log, index) => (
                    <div
                      key={index}
                      className="error-log-item"
                    >
                      <div className="history-header">
                        <span>{formatDate(log.timestamp)}</span>
                        <span className="error-log-context">
                          {log.context}
                        </span>
                      </div>
                      <div className="error-log-message">
                        {log.error}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="app-info">
          <p>AfterPot v1.0.0</p>
          <p>Windows11常駐翻訳アプリ</p>
        </div>
      </div>
    </div>
  );
}

export default Settings;
