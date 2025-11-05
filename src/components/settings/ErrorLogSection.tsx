import { useState } from "react";
import type { ErrorLog } from "../../types";
import { appStorage } from "../../utils/storage";

interface ErrorLogSectionProps {
  logs: ErrorLog[];
  onLogsChange: (logs: ErrorLog[]) => void;
}

export function ErrorLogSection({ logs, onLogsChange }: ErrorLogSectionProps) {
  const [showLogs, setShowLogs] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const clearLogs = () => {
    if (confirm("すべてのエラーログを削除しますか？")) {
      appStorage.clearErrorLogs();
      onLogsChange([]);
    }
  };

  const exportLogs = () => {
    const logsText = logs
      .map((log) => {
        const date = new Date(log.timestamp).toLocaleString("ja-JP");
        return `[${date}] ${log.context}: ${log.error}`;
      })
      .join("\n\n");

    const blob = new Blob([logsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afterpot-error-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
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
            <button onClick={clearLogs} className="save-button flex-1 bg-red">
              ログをクリア
            </button>
            <button onClick={exportLogs} className="save-button flex-1 bg-green">
              ログをエクスポート
            </button>
            <small className="ml-10 color-666 self-center">
              {logs.length}件のログ
            </small>
          </div>
          <div className="history-container">
            {logs.length === 0 ? (
              <p className="history-empty">エラーログはありません</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="error-log-item">
                  <div className="history-header">
                    <span>{formatDate(log.timestamp)}</span>
                    <span className="error-log-context">{log.context}</span>
                  </div>
                  <div className="error-log-message">{log.error}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
