
// Translation related types
export interface TranslationResult {
    originalText: string;
    translatedText: string;
    detectedLanguage: string;
    targetLanguage: string;
    translationService: string;
}

// History related types
export interface HistoryEntry {
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

// Error log related types
export interface ErrorLog {
    timestamp: number;
    context: string;
    error: string;
}

// Window state types
export interface WindowState {
    width: number;
    height: number;
    x: number;
    y: number;
}

// Settings types
export interface AppSettings {
    geminiApiKey: string;
    geminiModel: string;
    targetLanguage: string;
    hotkey: string;
    theme: "light" | "dark" | "system";
    alwaysOnTop: boolean;
}

export type Theme = "light" | "dark" | "system";
