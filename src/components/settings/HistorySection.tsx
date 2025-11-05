import { useState } from "react";
import type { HistoryEntry } from "../../types";
import { appStorage } from "../../utils/storage";

interface HistorySectionProps {
  history: HistoryEntry[];
  onHistoryChange: (history: HistoryEntry[]) => void;
}

export function HistorySection({
  history,
  onHistoryChange,
}: HistorySectionProps) {
  const [showHistory, setShowHistory] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const clearHistory = () => {
    if (confirm("翻訳履歴をすべて削除しますか？")) {
      appStorage.clearTranslationHistory();
      onHistoryChange([]);
    }
  };

  return (
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
            <small className="ml-10 color-666">{history.length}件の履歴</small>
          </div>
          <div className="history-container">
            {history.length === 0 ? (
              <p className="history-empty">履歴がありません</p>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="history-item">
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
                    <div key={idx} className="history-translation">
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
  );
}
