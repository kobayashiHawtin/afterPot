import type { HistoryEntry, ErrorLog, WindowState, Theme } from "../types";

// Caps to prevent unbounded localStorage growth
const MAX_HISTORY_ENTRIES = 100;
const MAX_ERROR_LOGS = 100;

// LocalStorage keys
const STORAGE_KEYS = {
    GEMINI_API_KEY: "geminiApiKey",
    GEMINI_MODEL: "geminiModel",
    TARGET_LANGUAGE: "targetLanguage",
    HOTKEY: "hotkey",
    THEME: "theme",
    ALWAYS_ON_TOP: "alwaysOnTop",
    WINDOW_STATE: "windowState",
    SETTINGS_WINDOW_STATE: "settingsWindowState",
    TRANSLATION_HISTORY: "translationHistory",
    ERROR_LOGS: "errorLogs",
} as const;

// Generic storage functions
export const storage = {
    // Get string value
    getString(key: string, defaultValue = ""): string {
        return localStorage.getItem(key) || defaultValue;
    },

    // Set string value
    setString(key: string, value: string): void {
        localStorage.setItem(key, value);
    },

    // Get boolean value
    getBoolean(key: string, defaultValue = false): boolean {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        return value === "true";
    },

    // Set boolean value
    setBoolean(key: string, value: boolean): void {
        localStorage.setItem(key, value ? "true" : "false");
    },

    // Get JSON value
    getJSON<T>(key: string, defaultValue: T): T {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.error(`Failed to parse JSON for key "${key}":`, e);
            return defaultValue;
        }
    },

    // Set JSON value
    setJSON<T>(key: string, value: T): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Failed to stringify JSON for key "${key}":`, e);
        }
    },

    // Remove value
    remove(key: string): void {
        localStorage.removeItem(key);
    },
};

// Specific storage functions for app settings
export const appStorage = {
    // Gemini API Key
    getGeminiApiKey(): string {
        return storage.getString(STORAGE_KEYS.GEMINI_API_KEY);
    },
    setGeminiApiKey(key: string): void {
        storage.setString(STORAGE_KEYS.GEMINI_API_KEY, key);
    },

    // Gemini Model
    getGeminiModel(): string {
        return storage.getString(STORAGE_KEYS.GEMINI_MODEL, "auto");
    },
    setGeminiModel(model: string): void {
        storage.setString(STORAGE_KEYS.GEMINI_MODEL, model);
    },

    // Target Language
    getTargetLanguage(): string {
        return storage.getString(STORAGE_KEYS.TARGET_LANGUAGE, "ja");
    },
    setTargetLanguage(lang: string): void {
        storage.setString(STORAGE_KEYS.TARGET_LANGUAGE, lang);
    },

    // Hotkey
    getHotkey(): string {
        return storage.getString(STORAGE_KEYS.HOTKEY, "Ctrl+Shift+Q");
    },
    setHotkey(hotkey: string): void {
        storage.setString(STORAGE_KEYS.HOTKEY, hotkey);
    },

    // Theme
    getTheme(): Theme {
        const theme = storage.getString(STORAGE_KEYS.THEME, "system");
        if (theme === "light" || theme === "dark" || theme === "system") {
            return theme;
        }
        return "system";
    },
    setTheme(theme: Theme): void {
        storage.setString(STORAGE_KEYS.THEME, theme);
    },

    // Always on Top
    getAlwaysOnTop(): boolean {
        return storage.getBoolean(STORAGE_KEYS.ALWAYS_ON_TOP, false);
    },
    setAlwaysOnTop(value: boolean): void {
        storage.setBoolean(STORAGE_KEYS.ALWAYS_ON_TOP, value);
    },

    // Window State
    getWindowState(): WindowState | null {
        return storage.getJSON<WindowState | null>(STORAGE_KEYS.WINDOW_STATE, null);
    },
    setWindowState(state: WindowState): void {
        storage.setJSON(STORAGE_KEYS.WINDOW_STATE, state);
    },

    // Settings Window State
    getSettingsWindowState(): WindowState | null {
        return storage.getJSON<WindowState | null>(
            STORAGE_KEYS.SETTINGS_WINDOW_STATE,
            null
        );
    },
    setSettingsWindowState(state: WindowState): void {
        storage.setJSON(STORAGE_KEYS.SETTINGS_WINDOW_STATE, state);
    },

    // Translation History
    getTranslationHistory(): HistoryEntry[] {
        return storage.getJSON<HistoryEntry[]>(
            STORAGE_KEYS.TRANSLATION_HISTORY,
            []
        );
    },
    setTranslationHistory(history: HistoryEntry[]): void {
        storage.setJSON(STORAGE_KEYS.TRANSLATION_HISTORY, history);
    },
    addTranslationHistory(entry: HistoryEntry): void {
        const history = this.getTranslationHistory();
        history.unshift(entry);
        // Keep only last N entries
        const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);
        this.setTranslationHistory(trimmed);
    },
    clearTranslationHistory(): void {
        storage.remove(STORAGE_KEYS.TRANSLATION_HISTORY);
    },

    // Error Logs
    getErrorLogs(): ErrorLog[] {
        return storage.getJSON<ErrorLog[]>(STORAGE_KEYS.ERROR_LOGS, []);
    },
    setErrorLogs(logs: ErrorLog[]): void {
        storage.setJSON(STORAGE_KEYS.ERROR_LOGS, logs);
    },
    addErrorLog(log: ErrorLog): void {
        const logs = this.getErrorLogs();
        logs.unshift(log);
        // Keep only last N logs
        const trimmed = logs.slice(0, MAX_ERROR_LOGS);
        this.setErrorLogs(trimmed);
    },
    clearErrorLogs(): void {
        storage.remove(STORAGE_KEYS.ERROR_LOGS);
    },
};

// Export keys for reference
export { STORAGE_KEYS };
