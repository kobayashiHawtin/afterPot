import type { Theme } from "../../types";

interface ThemeSectionProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function ThemeSection({ theme, onThemeChange }: ThemeSectionProps) {
  return (
    <div className="form-group">
      <label>テーマ</label>
      <div className="theme-button-container">
        <button
          onClick={() => onThemeChange("light")}
          className={`save-button theme-button ${
            theme === "light" ? "theme-button-active" : "theme-button-inactive"
          }`}
        >
          ライト
        </button>
        <button
          onClick={() => onThemeChange("dark")}
          className={`save-button theme-button ${
            theme === "dark" ? "theme-button-active" : "theme-button-inactive"
          }`}
        >
          ダーク
        </button>
        <button
          onClick={() => onThemeChange("system")}
          className={`save-button theme-button ${
            theme === "system" ? "theme-button-active" : "theme-button-inactive"
          }`}
        >
          システム
        </button>
      </div>
      <small>テーマを切り替えます（システムはOS設定に従います）</small>
    </div>
  );
}
