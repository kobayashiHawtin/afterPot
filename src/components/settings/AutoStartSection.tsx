import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";

export function AutoStartSection() {
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAutoStartStatus();
  }, []);

  const checkAutoStartStatus = async () => {
    try {
      const enabled = await invoke<boolean>("is_auto_start_enabled");
      setAutoStartEnabled(enabled);
    } catch (error) {
      console.error("Failed to check auto-start status:", error);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="form-group">
      <label>Windows起動時に自動起動</label>
      <div className="flex-row-10">
        <label className="switch">
          <input
            type="checkbox"
            checked={autoStartEnabled}
            onChange={handleToggle}
            disabled={loading}
            aria-label="自動起動設定"
          />
          <span className="slider"></span>
        </label>
        <span className="text-secondary">
          {autoStartEnabled ? "有効" : "無効"}
        </span>
      </div>
      <small>
        {loading && "設定中..."}
        {!loading && "Windows起動時にAfterPotを自動的に起動します"}
      </small>
    </div>
  );
}
