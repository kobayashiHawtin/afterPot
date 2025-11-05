import { useState, useEffect } from "react";
import { appWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/tauri";
import type { HistoryEntry, ErrorLog } from "./types";
import { appStorage } from "./utils/storage";
import { useWindowState } from "./hooks/useWindowState";
import { useTheme } from "./hooks/useTheme";
import {
  HotkeySection,
  ThemeSection,
  HistorySection,
  ErrorLogSection,
  AutoStartSection,
} from "./components/settings";
import "./Settings.css";

function Settings() {
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("auto");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [targetLanguage, setTargetLanguage] = useState("ja");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string>("");
  const [hotkey, setHotkey] = useState("Ctrl+Shift+Q");
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);

  // Use custom hooks
  const { theme, setTheme } = useTheme();
  useWindowState({ storageKey: "settingsWindowState", autoSaveInterval: 3000 });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedGeminiKey = appStorage.getGeminiApiKey();
    const savedGeminiModel = appStorage.getGeminiModel();
    const savedTargetLang = appStorage.getTargetLanguage();
    const savedHotkey = appStorage.getHotkey();

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

    // Load translation history
    setHistoryEntries(appStorage.getTranslationHistory());

    // Load error logs
    setErrorLogs(appStorage.getErrorLogs());

    // Get current hotkey from backend
    invoke<string>("get_current_hotkey")
      .then((currentHotkey) => {
        if (currentHotkey) {
          setHotkey(currentHotkey);
        }
      })
      .catch((err) => console.error("Failed to get current hotkey:", err));
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
    appStorage.setGeminiApiKey(geminiApiKey);
    appStorage.setGeminiModel(geminiModel);
    appStorage.setTargetLanguage(targetLanguage);
    appStorage.setHotkey(hotkey);

    alert("設定を保存しました！");
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

        <HotkeySection hotkey={hotkey} onHotkeyChange={setHotkey} />

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
            {!isLoadingModels &&
              !modelError &&
              availableModels.length > 0 &&
              `${availableModels.length}個のモデルが利用可能です (Flash/Pro: ${
                availableModels.filter(
                  (m) => m.includes("flash") || m.includes("pro")
                ).length
              }個)`}
            {!isLoadingModels &&
              !modelError &&
              geminiApiKey &&
              availableModels.length === 0 &&
              "モデルが取得できませんでした"}
            {!geminiApiKey &&
              "※ APIキーを入力すると利用可能なモデルが表示されます"}
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
          <small>※ 日本語と英語は自動で相互翻訳されます</small>
        </div>

        <div className="button-group">
          <button onClick={handleSave} className="save-button">
            保存
          </button>
          <button
            onClick={handleTestTranslation}
            className="save-button test-button"
          >
            翻訳テスト
          </button>
        </div>

        <AutoStartSection />

        <ThemeSection theme={theme} onThemeChange={setTheme} />

        <HistorySection
          history={historyEntries}
          onHistoryChange={setHistoryEntries}
        />

        <ErrorLogSection logs={errorLogs} onLogsChange={setErrorLogs} />

        <div className="app-info">
          <p>AfterPot v1.0.0</p>
          <p>Windows11常駐翻訳アプリ</p>
        </div>
      </div>
    </div>
  );
}

export default Settings;
