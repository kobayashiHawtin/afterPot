import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { appWindow, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
import type { TranslationResult, HistoryEntry, ErrorLog } from "./types";
import { appStorage } from "./utils/storage";
import { useWindowState } from "./hooks/useWindowState";
import { useTheme } from "./hooks/useTheme";
import "./TranslatePopup.css";

interface GeminiTranslationResult {
  translated_text: string;
  model_used: string;
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
  const completionTimerRef = useRef<number | null>(null);
  const translationIdRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false); // ref (for immediate focus-loss guard)
  // Grace period after mount to ignore transient blur/focus churn
  const mountTimeRef = useRef<number>(Date.now());

  // Use custom hooks
  useTheme(); // Apply theme
  useWindowState({ storageKey: "windowState", autoSaveInterval: 2000 });

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
    const logEntry: ErrorLog = {
      timestamp: Date.now(),
      context,
      error,
    };
    appStorage.addErrorLog(logEntry);
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
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Prefer Gemini above Google in the list
  const serviceOrder = (service: string) => {
    if (service.startsWith("Gemini")) return 0;
    if (service.startsWith("Google")) return 1;
    return 2;
  };

  const addTranslation = (item: TranslationResult) => {
    setTranslations((prev) => {
      const next = [...prev, item];
      next.sort(
        (a, b) =>
          serviceOrder(a.translationService) -
          serviceOrder(b.translationService)
      );
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
    const historyEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      originalText,
      detectedLanguage: detectedLang,
      targetLanguage: targetLang,
      translations: translations.map((t) => ({
        service: t.translationService,
        result: t.translatedText,
      })),
    };

    appStorage.addTranslationHistory(historyEntry);
  };

  const handleTranslate = async (text: string) => {
    // Cancel previous translation by incrementing ID
    translationIdRef.current += 1;
    const currentTranslationId = translationIdRef.current;

    setIsLoading(true);
    setTranslations([]);
    setLoadingGoogle(false);
    setLoadingGemini(false);

    const geminiApiKey = appStorage.getGeminiApiKey();
    const geminiModel = appStorage.getGeminiModel();
    const targetLang = appStorage.getTargetLanguage();

    // Declare these variables at function scope so they're accessible in finally block
    let detectedLangState = "unknown";
    let chosenTarget = targetLang;

    try {
      // Detect language
      let detectedLang = "unknown";
      try {
        detectedLang = await invoke<string>("detect_language", { text });

        // Check if this translation is still current
        if (currentTranslationId !== translationIdRef.current) {
          console.log("Translation cancelled - newer request started");
          return;
        }

        detectedLangState = detectedLang;
        setDetectedLangState(detectedLang);
      } catch (error) {
        console.warn("Language detection failed:", error);
        logError("Language Detection", String(error));
      }

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

          // Only add result if this is still the current translation
          if (currentTranslationId === translationIdRef.current) {
            addTranslation({
              originalText: text,
              translatedText: googleResult,
              detectedLanguage: detectedLang,
              targetLanguage: chosenTarget,
              translationService: "Google (Free)",
            });
          }
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
            const geminiResult = await invoke<GeminiTranslationResult>("translate_with_gemini", {
              text,
              targetLang: languageNames[chosenTarget] || chosenTarget,
              apiKey: geminiApiKey,
              model: modelToUse,
            });

            // Only add result if this is still the current translation
            if (currentTranslationId === translationIdRef.current) {
              const modelDisplay = geminiResult.model_used;
              addTranslation({
                originalText: text,
                translatedText: geminiResult.translated_text,
                detectedLanguage: detectedLang,
                targetLanguage: chosenTarget,
                translationService: `Gemini (${modelDisplay})`,
              });
            }
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
      // Clear any existing completion timer
      if (completionTimerRef.current !== null) {
        clearInterval(completionTimerRef.current);
        completionTimerRef.current = null;
      }

      // Set timeout to prevent infinite polling (max 10 seconds)
      const startTime = Date.now();
      const MAX_WAIT_TIME = 10000;

      completionTimerRef.current = window.setInterval(() => {
        if (!loadingGoogle && !loadingGemini) {
          setIsLoading(false);
          if (completionTimerRef.current !== null) {
            clearInterval(completionTimerRef.current);
            completionTimerRef.current = null;
          }

          // Save to history after all translations complete
          if (translations.length > 0) {
            saveToHistory(text, detectedLangState, chosenTarget, translations);
          }
        } else if (Date.now() - startTime > MAX_WAIT_TIME) {
          // Timeout: force completion
          console.warn("Translation completion timeout - forcing stop");
          setIsLoading(false);
          setLoadingGoogle(false);
          setLoadingGemini(false);
          if (completionTimerRef.current !== null) {
            clearInterval(completionTimerRef.current);
            completionTimerRef.current = null;
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
    // Set ref synchronously so focus change events see dragging state immediately
    isDraggingRef.current = true;
    await appWindow.startDragging();
    // Drag finished
    isDraggingRef.current = false;
  };

  const handleSwapLanguages = () => {
    const defaultAuto =
      detectedLangState === "ja"
        ? "en"
        : detectedLangState === "en"
        ? "ja"
        : currentTargetLang;
    const next =
      currentTargetLang === detectedLangState ? defaultAuto : detectedLangState;
    setManualTargetLang(next);
    if (originalText.trim()) {
      handleTranslate(originalText.trim());
    }
  };

  const togglePin = async () => {
    const next = !alwaysOnTop;
    console.log(`Toggling pin: ${alwaysOnTop} -> ${next}`);
    setAlwaysOnTop(next);
    appStorage.setAlwaysOnTop(next);
    try {
      await appWindow.setAlwaysOnTop(next);
      console.log(`Successfully set always on top to: ${next}`);
    } catch (e) {
      console.error("Failed to set always on top:", e);
    }
  };

  // Listen for the global shortcut event
  useEffect(() => {
    // Initialize always-on-top from localStorage (default off)
    const pinPref = appStorage.getAlwaysOnTop();
    setAlwaysOnTop(pinPref);
    appWindow.setAlwaysOnTop(pinPref).catch(() => {});

    const unlisten = listen<string>("translate-shortcut", async (event) => {
      const selectedText = event.payload;
      if (selectedText && selectedText.trim()) {
        setOriginalText(selectedText.trim());
        await handleTranslate(selectedText.trim());
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Auto-hide when focus is lost (if not pinned)
  useEffect(() => {
    const handleBlur = async () => {
      // Ignore early blur events right after window appears (OS focus churn)
      const sinceMount = Date.now() - mountTimeRef.current;
      if (sinceMount < 500) {
        console.log(`Ignoring blur during grace period (${sinceMount}ms)`);
        return;
      }
      // Use ref for instantaneous state (guard race between drag start and focus loss)
      if (!alwaysOnTop && !isDraggingRef.current) {
        try {
          // Double-check focus/visibility before hiding to avoid false positives
          let focused = false;
          let visible = true;
          try { focused = await appWindow.isFocused(); } catch { /* noop */ }
          try { visible = await appWindow.isVisible(); } catch { /* noop */ }

          if (focused) {
            console.log("Blur reported but window is focused; skip hide");
            return;
          }
          if (!visible) {
            console.log("Window already not visible; skip hide");
            return;
          }

          console.log("Window lost focus and not pinned - hiding");
          await appWindow.hide();
        } catch { /* ignore hide failure */ }
      }
    };

    const unlistenBlur = appWindow.onFocusChanged(({ payload: focused }) => {
      if (!focused) {
        handleBlur();
      }
    });

    return () => {
      unlistenBlur.then((fn) => fn());
    };
  }, [alwaysOnTop]);

  // Cleanup completion timer on unmount
  useEffect(() => {
    return () => {
      if (completionTimerRef.current !== null) {
        clearInterval(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`translate-popup${isResizing ? " resizing" : ""}`}>
      {/* Resize handles */}
      <div
        className="resize-handle handle-n"
        onMouseDown={(e) => startResize("n", e)}
      />
      <div
        className="resize-handle handle-s"
        onMouseDown={(e) => startResize("s", e)}
      />
      <div
        className="resize-handle handle-e"
        onMouseDown={(e) => startResize("e", e)}
      />
      <div
        className="resize-handle handle-w"
        onMouseDown={(e) => startResize("w", e)}
      />
      <div
        className="resize-handle handle-ne"
        onMouseDown={(e) => startResize("ne", e)}
      />
      <div
        className="resize-handle handle-nw"
        onMouseDown={(e) => startResize("nw", e)}
      />
      <div
        className="resize-handle handle-se"
        onMouseDown={(e) => startResize("se", e)}
      />
      <div
        className="resize-handle handle-sw"
        onMouseDown={(e) => startResize("sw", e)}
      />

      <div className="popup-header" onMouseDown={handleDragStart}>
        <div className="popup-title">翻訳結果</div>
        <div className="header-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePin();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`pin-btn ${alwaysOnTop ? "active" : ""}`}
            title={
              alwaysOnTop ? "最前面ピン留めを解除" : "最前面にピン留め"
            }
          >
            📌 {alwaysOnTop ? "ON" : "OFF"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="close-btn"
          >
            ×
          </button>
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
          {loadingGemini &&
            !translations.some((t) => t.translationService.startsWith("Gemini")) && (
              <div className="translation-item">
                <div className="service-name">
                  <span className="service-label">Gemini</span>
                  <div className="service-actions">
                    <span className="lang-info">
                      {detectedLangState} → {currentTargetLang}
                    </span>
                  </div>
                </div>
                <div className="translated-text">
                  <span className="inline-spinner" /> 翻訳中…
                </div>
              </div>
            )}

          {loadingGoogle &&
            !translations.some((t) => t.translationService.startsWith("Google")) && (
              <div className="translation-item">
                <div className="service-name">
                  <span className="service-label">Google (Free)</span>
                  <div className="service-actions">
                    <span className="lang-info">
                      {detectedLangState} → {currentTargetLang}
                    </span>
                  </div>
                </div>
                <div className="translated-text">
                  <span className="inline-spinner" /> 翻訳中…
                </div>
              </div>
            )}

          {translations.map((result, index) => (
            <div key={index} className="translation-item">
              <div className="service-name">
                <span className="service-label">
                  {result.translationService}
                </span>
                <div className="service-actions">
                  <span className="lang-info">
                    {result.detectedLanguage} → {result.targetLanguage}
                  </span>
                  <button
                    className="copy-btn"
                    onClick={() =>
                      copyToClipboard(result.translatedText, `t-${index}`)
                    }
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
