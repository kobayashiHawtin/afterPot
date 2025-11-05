import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { appStorage } from "../../utils/storage";

interface HotkeySectionProps {
  hotkey: string;
  onHotkeyChange: (newHotkey: string) => void;
}

export function HotkeySection({ hotkey, onHotkeyChange }: HotkeySectionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string>("");

  const handleHotkeyChange = async () => {
    setError("");
    try {
      const result = await invoke<string>("register_hotkey", { hotkey });
      alert(result);
      appStorage.setHotkey(hotkey);
    } catch (error) {
      const errorMsg = String(error);
      setError(errorMsg);
      alert(errorMsg);
    }
  };

  const handleRecordHotkey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsRecording(true);

    const keys: string[] = [];
    if (e.ctrlKey) keys.push("Ctrl");
    if (e.shiftKey) keys.push("Shift");
    if (e.altKey) keys.push("Alt");
    if (e.metaKey) keys.push("Command");

    const key = e.key.toUpperCase();
    if (
      key !== "CONTROL" &&
      key !== "SHIFT" &&
      key !== "ALT" &&
      key !== "META"
    ) {
      keys.push(key);
    }

    if (keys.length >= 2) {
      const newHotkey = keys.join("+");
      onHotkeyChange(newHotkey);
      setIsRecording(false);
    }
  };

  return (
    <div className="form-group">
      <label>グローバルホットキー</label>
      <div className="flex-row">
        <input
          type="text"
          value={isRecording ? "キーを押してください..." : hotkey}
          onChange={(e) => onHotkeyChange(e.target.value)}
          onKeyDown={handleRecordHotkey}
          onFocus={() => setIsRecording(true)}
          onBlur={() => setIsRecording(false)}
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
      <small className={error ? "error-text" : ""}>
        {error
          ? error
          : "入力欄をクリックしてキーを押すと自動で記録されます。Ctrl/Shift/Alt + キーの組み合わせを推奨"}
      </small>
    </div>
  );
}
