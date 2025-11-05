import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { appWindow, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
import "./TranslatePopup.css";

interface TranslationResult {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
  translationService: string;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  originalText: string;
  detectedLanguage: string;
  targetLanguage: string;
  translations: {
    service: string;
    result: string;
  }[];
}

function TranslatePopup() {
  const [translations, setTranslations] = useState<TranslationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGemini, setLoadingGemini] = useState(false);
  const [detectedLangState, setDetectedLangState] = useState<string>("unknown");
  const [currentTargetLang, setCurrentTargetLang] = useState<string>("ja");
  const [manualTargetLang, setManualTargetLang] = useState<string | null>(null);
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(false);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1200);
    } catch (e) {
      console.error("Failed to copy: ", e);
      logError("Copy failed", String(e));
    }
  };

  const logError = (context: string, error: string) => {
    try {
      const existingLogs = localStorage.getItem("errorLogs");
      const logs = existingLogs ? JSON.parse(existingLogs) : [];

      const logEntry = {
        timestamp: Date.now(),
        context,
        error,
      };

      logs.unshift(logEntry);

      // Keep last 100 error logs
      if (logs.length > 100) {
        logs.splice(100);
      }

      localStorage.setItem("errorLogs", JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to save error log:", e);
    }
  };

  type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

  const startResize = async (dir: ResizeDir, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);

    const startMouseX = (e as any).screenX as number;
    const startMouseY = (e as any).screenY as number;

    const startSize = await appWindow.outerSize();
    const startPos = await appWindow.outerPosition();

    const minW = 320;
    const minH = 200;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.screenX - startMouseX;
      const dy = ev.screenY - startMouseY;

      let newW = startSize.width;
      let newH = startSize.height;
      let newX = startPos.x;
      let newY = startPos.y;

      if (dir.includes("e")) newW = Math.max(minW, startSize.width + dx);
      if (dir.includes("w")) {
        newW = Math.max(minW, startSize.width - dx);
        newX = startPos.x + dx;
      }
      if (dir.includes("s")) newH = Math.max(minH, startSize.height + dy);
      if (dir.includes("n")) {
        newH = Math.max(minH, startSize.height - dy);
        newY = startPos.y + dy;
      }

      appWindow.setSize(new LogicalSize(newW, newH));
      if (newX !== startPos.x || newY !== startPos.y) {
        appWindow.setPosition(new LogicalPosition(newX, newY));
      }
    };

    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Save window state after resize
      setTimeout(() => saveWindowState(), 100);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Load settings from localStorage
  const getSettings = () => {
    return {
      gemini: localStorage.getItem("geminiApiKey") || "",
      geminiModel: localStorage.getItem("geminiModel") || "auto",
      targetLang: localStorage.getItem("targetLanguage") || "ja",
    };
  };

  // Save window state (size and position) to localStorage
  const saveWindowState = async () => {
    try {
      const size = await appWindow.outerSize();
      const position = await appWindow.outerPosition();

      const windowState = {
        width: size.width,
        height: size.height,
        x: position.x,
        y: position.y,
      };

      localStorage.setItem("windowState", JSON.stringify(windowState));
    } catch (e) {
      console.error("Failed to save window state:", e);
    }
  };

  // Restore window state from localStorage
  const restoreWindowState = async () => {
    try {
      const saved = localStorage.getItem("windowState");
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
      console.error("Failed to restore window state:", e);
    }
  };

  // Listen for the global shortcut event
  useEffect(() => {
    // Restore window state
    restoreWindowState();

    // initialize always-on-top from localStorage (default off)
    const pinPref = localStorage.getItem("alwaysOnTop") === "true";
    setAlwaysOnTop(pinPref);
    appWindow.setAlwaysOnTop(pinPref).catch(() => {});

    // Load and apply theme
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    const themeToApply = savedTheme || "system";

    const applyTheme = (theme: "light" | "dark" | "system") => {
      let actualTheme: "light" | "dark";
      if (theme === "system") {
        actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      } else {
        actualTheme = theme;
      }
      document.documentElement.setAttribute("data-theme", actualTheme);
    };

    applyTheme(themeToApply);

    // Listen to system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      const currentTheme = localStorage.getItem("theme") || "system";
      if (currentTheme === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    const unlisten = listen<string>("translate-shortcut", async (event) => {
      const selectedText = event.payload;
      if (selectedText && selectedText.trim()) {
        setOriginalText(selectedText.trim());
        await handleTranslate(selectedText.trim());
      }
    });

    // Save window state on close/hide
    const saveInterval = setInterval(saveWindowState, 2000); // Auto-save every 2 seconds

    return () => {
      unlisten.then((fn) => fn());
      clearInterval(saveInterval);
      saveWindowState(); // Save on unmount
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  // Prefer Gemini above Google in the list
  const serviceOrder = (service: string) => {
    if (service.startsWith("Gemini")) return 0;
    if (service.startsWith("Google")) return 1;
    return 2;
  };

  const addTranslation = (item: TranslationResult) => {
    setTranslations((prev) => {
      const next = [...prev, item];
      next.sort((a, b) => serviceOrder(a.translationService) - serviceOrder(b.translationService));
      return next;
    });
  };

  // Save translation to history
  const saveToHistory = (
    originalText: string,
    detectedLang: string,
    targetLang: string,
    translations: TranslationResult[]
  ) => {
    try {
      const historyEntry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        originalText,
        detectedLanguage: detectedLang,
        targetLanguage: targetLang,
        translations: translations.map(t => ({
          service: t.translationService,
          result: t.translatedText,
        })),
      };

      // Get existing history
      const existingHistory = localStorage.getItem("translationHistory");
      const history: HistoryEntry[] = existingHistory ? JSON.parse(existingHistory) : [];

      // Add new entry at the beginning
      history.unshift(historyEntry);

      // Keep only last 100 entries
      const trimmedHistory = history.slice(0, 100);

      // Save back to localStorage
      localStorage.setItem("translationHistory", JSON.stringify(trimmedHistory));
    } catch (e) {
      console.error("Failed to save translation history:", e);
    }
  };

  const handleTranslate = async (text: string) => {
    setIsLoading(true);
    setTranslations([]);
    setLoadingGoogle(false);
    setLoadingGemini(false);
    const { gemini: geminiApiKey, geminiModel, targetLang } = getSettings();

    // Declare these variables at function scope so they're accessible in finally block
    let detectedLangState = "unknown";
    let chosenTarget = targetLang;

    try {
      // Detect language
      let detectedLang = "unknown";
      try {
        detectedLang = await invoke<string>("detect_language", { text });
        detectedLangState = detectedLang;
        setDetectedLangState(detectedLang);
      } catch {}

      // Choose target
      let autoTargetLang = targetLang;
      if (detectedLang === "ja") autoTargetLang = "en";
      else if (detectedLang === "en") autoTargetLang = "ja";
      chosenTarget = manualTargetLang ?? autoTargetLang;
      setCurrentTargetLang(chosenTarget);

      // Google request
      setLoadingGoogle(true);
      (async () => {
        try {
          const googleResult = await invoke<string>("translate_text", {
            text,
            targetLang: chosenTarget,
            sourceLang: detectedLang === "unknown" ? "auto" : detectedLang,
          });
          addTranslation({
            originalText: text,
            translatedText: googleResult,
            detectedLanguage: detectedLang,
            targetLanguage: chosenTarget,
            translationService: "Google (Free)",
          });
        } catch (error) {
          console.error("Google Translate failed:", error);
          logError("Google Translate", String(error));
        } finally {
          setLoadingGoogle(false);
        }
      })();

      // Gemini request
      if (geminiApiKey) {
        setLoadingGemini(true);
        (async () => {
          try {
            const languageNames: { [key: string]: string } = {
              ja: "Japanese",
              en: "English",
              zh: "Chinese",
              ko: "Korean",
              fr: "French",
              de: "German",
              es: "Spanish",
            };
            const modelToUse = geminiModel === "auto" ? null : geminiModel;
            const geminiResult = await invoke<string>("translate_with_gemini", {
              text,
              targetLang: languageNames[chosenTarget] || chosenTarget,
              apiKey: geminiApiKey,
              model: modelToUse,
            });
            const modelDisplay = geminiModel === "auto" ? "auto" : geminiModel;
            addTranslation({
              originalText: text,
              translatedText: geminiResult,
              detectedLanguage: detectedLang,
              targetLanguage: chosenTarget,
              translationService: `Gemini (${modelDisplay})`,
            });
          } catch (error) {
            console.error("Gemini translation failed:", error);
            logError("Gemini Translation", String(error));
          } finally {
            setLoadingGemini(false);
          }
        })();
      }
    } catch (error) {
      console.error("Translation failed:", error);
    } finally {
      const id = setInterval(() => {
        if (!loadingGoogle && !loadingGemini) {
          setIsLoading(false);
          clearInterval(id);

          // Save to history after all translations complete
          if (translations.length > 0) {
            saveToHistory(text, detectedLangState, chosenTarget, translations);
          }
        }
      }, 100);
    }
  };

  const handleClose = async () => {
    try {
      await appWindow.minimize();
    } catch {
      await appWindow.hide();
    }
    setTranslations([]);
  };

  const handleDragStart = async () => {
    await appWindow.startDragging();
  };

  const handleSwapLanguages = () => {
    const defaultAuto = detectedLangState === "ja" ? "en" : detectedLangState === "en" ? "ja" : currentTargetLang;
    const next = currentTargetLang === detectedLangState ? defaultAuto : detectedLangState;
    setManualTargetLang(next);
    if (originalText.trim()) {
      handleTranslate(originalText.trim());
    }
  };

  const togglePin = async () => {
    const next = !alwaysOnTop;
    setAlwaysOnTop(next);
    localStorage.setItem("alwaysOnTop", next ? "true" : "false");
    try {
      await appWindow.setAlwaysOnTop(next);
    } catch (e) {
      console.error("Failed to set always on top:", e);
    }
  };

  return (
    <div className={`translate-popup${isResizing ? " resizing" : ""}`}>
      {/* Resize handles */}
      <div className="resize-handle handle-n" onMouseDown={(e) => startResize("n", e)} />
      <div className="resize-handle handle-s" onMouseDown={(e) => startResize("s", e)} />
      <div className="resize-handle handle-e" onMouseDown={(e) => startResize("e", e)} />
      <div className="resize-handle handle-w" onMouseDown={(e) => startResize("w", e)} />
      <div className="resize-handle handle-ne" onMouseDown={(e) => startResize("ne", e)} />
      <div className="resize-handle handle-nw" onMouseDown={(e) => startResize("nw", e)} />
      <div className="resize-handle handle-se" onMouseDown={(e) => startResize("se", e)} />
      <div className="resize-handle handle-sw" onMouseDown={(e) => startResize("sw", e)} />

      <div className="popup-header" onMouseDown={handleDragStart}>
        <div className="popup-title">翻訳結果</div>
        <div className="header-actions">
          <button
            onClick={(e) => { e.stopPropagation(); togglePin(); }}
            className={`pin-btn ${alwaysOnTop ? "active" : ""}`}
            title={alwaysOnTop ? "最前面ピン留めを解除" : "最前面にピン留め"}
          >
            📌
          </button>
          <button onClick={handleClose} className="close-btn">×</button>
        </div>
      </div>

      {translations.length === 0 && !isLoading && (
        <div className="no-result">
          <p>テキストを選択して Ctrl+Shift+Q を押してください</p>
        </div>
      )}

      {translations.length > 0 && (
        <div className="results">
          <div className="original-text">
            <div className="original-header">
              <div className="label">原文</div>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(originalText, "original")}
                title="原文をコピー"
              >
                {copiedKey === "original" ? "コピー済み" : "コピー"}
              </button>
              <button
                className="copy-btn swap-btn"
                onClick={handleSwapLanguages}
                title="元言語とターゲット言語を入れ替え"
              >
                ⇄ {detectedLangState} ↔ {currentTargetLang}
              </button>
            </div>
            <div className="text">{originalText}</div>
          </div>

          {/* Per-service loading placeholders */}
          {loadingGemini && !translations.some(t => t.translationService.startsWith("Gemini")) && (
            <div className="translation-item">
              <div className="service-name">
                <span className="service-label">Gemini</span>
                <div className="service-actions">
                  <span className="lang-info">{detectedLangState} → {currentTargetLang}</span>
                </div>
              </div>
              <div className="translated-text"><span className="inline-spinner" /> 翻訳中…</div>
            </div>
          )}

          {loadingGoogle && !translations.some(t => t.translationService.startsWith("Google")) && (
            <div className="translation-item">
              <div className="service-name">
                <span className="service-label">Google (Free)</span>
                <div className="service-actions">
                  <span className="lang-info">{detectedLangState} → {currentTargetLang}</span>
                </div>
              </div>
              <div className="translated-text"><span className="inline-spinner" /> 翻訳中…</div>
            </div>
          )}

          {translations.map((result, index) => (
            <div key={index} className="translation-item">
              <div className="service-name">
                <span className="service-label">{result.translationService}</span>
                <div className="service-actions">
                  <span className="lang-info">
                    {result.detectedLanguage} → {result.targetLanguage}
                  </span>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(result.translatedText, `t-${index}`)}
                    title="翻訳文をコピー"
                  >
                    {copiedKey === `t-${index}` ? "コピー済み" : "コピー"}
                  </button>
                </div>
              </div>
              <div className="translated-text">{result.translatedText}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TranslatePopup;
