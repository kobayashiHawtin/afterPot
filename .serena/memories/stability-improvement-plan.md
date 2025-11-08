# AfterPot 安定性向上プラン

## プロジェクト概要
- **アプリ名**: AfterPot
- **バージョン**: 1.1.0
- **技術スタック**: Tauri (Rust) + React + TypeScript
- **主要機能**: グローバルホットキー(Ctrl+Shift+Q)でテキスト選択→翻訳(Google/Gemini)

## 検出された安定性リスク

### 🔴 高優先度（クラッシュリスク）

#### 1. **Rustコードの過剰な`.unwrap()`使用**
**場所**: `src-tauri/src/main.rs`
**問題**: 17箇所でunwrap()を使用。失敗時にパニック（クラッシュ）
**影響**: ウィンドウ取得失敗、ロック失敗などでアプリ全体がクラッシュ

**該当箇所**:
- `state.0.lock().unwrap()` (3箇所) - Mutex poisoning時にパニック
- `get_window("translate").unwrap()` (2箇所) - ウィンドウ未作成時にパニック
- `get_window("settings").unwrap()` (4箇所) - ウィンドウ未作成時にパニック
- `window.show().unwrap()` (5箇所) - 表示失敗時にパニック
- `window.set_focus().unwrap()` (5箇所) - フォーカス失敗時にパニック
- `window.emit().unwrap()` (2箇所) - イベント送信失敗時にパニック

**推奨対策**:
```rust
// 現在の危険なコード
let window = app_handle_clone.get_window("translate").unwrap();
window.show().unwrap();

// 安全なコード
if let Some(window) = app_handle_clone.get_window("translate") {
    if let Err(e) = window.show() {
        eprintln!("Failed to show window: {}", e);
    }
}
```

#### 2. **setIntervalのメモリリーク可能性**
**場所**: `src/TranslatePopup.tsx` L242-251
**問題**: setIntervalをclearせずにコンポーネントがアンマウントされる可能性

**現在のコード**:
```typescript
const id = setInterval(() => {
    if (!loadingGoogle && !loadingGemini) {
        setIsLoading(false);
        clearInterval(id);
        // 履歴保存処理
    }
}, 100);
// クリーンアップなし
```

**リスク**: 
- 翻訳が完了せずにウィンドウを閉じた場合、intervalが残る
- 複数回翻訳すると複数のintervalが蓄積
- メモリリークとCPU使用率増加

**推奨対策**:
- useEffectのクリーンアップ関数で確実にclearInterval
- タイムアウト機構（最大10秒など）を追加

#### 3. **空のcatchブロック（エラー隠蔽）**
**場所**: `src/TranslatePopup.tsx` L169
**問題**: 言語検出失敗時にエラーログなし

```typescript
try {
    detectedLang = await invoke<string>("detect_language", { text });
    // ...
} catch {} // エラー完全無視
```

**リスク**: 
- デバッグ不可能
- ネットワークエラーやAPI変更を検知できない

**推奨対策**:
```typescript
} catch (error) {
    console.warn("Language detection failed:", error);
    logError("Language Detection", String(error));
}
```

### 🟡 中優先度（UX劣化リスク）

#### 4. **競合状態（Race Condition）**
**場所**: `src/TranslatePopup.tsx` handleTranslate関数
**問題**: 非同期IIFE（即時実行関数）が並行実行されるが、状態同期なし

**シナリオ**:
1. ユーザーが翻訳A開始
2. Google翻訳A実行中（3秒）
3. ユーザーが翻訳B開始（前の翻訳をキャンセルしない）
4. Google翻訳Bも並行実行
5. 結果が混在する可能性

**推奨対策**:
- AbortControllerでリクエストをキャンセル可能に
- 最新の翻訳リクエストIDを管理
- 古いリクエストの結果を破棄

#### 5. **ウィンドウフォーカス喪失時の誤動作**
**場所**: `src/TranslatePopup.tsx` L297-316
**問題**: ドラッグ中フラグが機能しない可能性

**現在のロジック**:
```typescript
const handleDragStart = async () => {
    setIsDragging(true);
    await appWindow.startDragging(); // ブロッキング
    setIsDragging(false);
};

// 別のuseEffect内
if (!alwaysOnTop && !isDragging) {
    await appWindow.hide();
}
```

**リスク**:
- `startDragging()`は同期的にブロックするが、`onFocusChanged`は別スレッドから発火
- ドラッグ開始直後にフォーカス喪失イベントが発火すると、isDragging=trueになる前にhide()が実行される可能性

**推奨対策**:
- useRefでドラッグ状態を管理（即座に更新）
- タイムアウトでフォーカス喪失を遅延（50ms程度）

#### 6. **テキスト選択取得の信頼性問題**
**場所**: `src-tauri/src/main.rs` - `selection::get_text`
**問題**: 
- クリップボード使用のため、ユーザーのクリップボード内容を上書きする可能性
- 一部のアプリケーション（セキュアテキストフィールドなど）では動作しない

**推奨対策**:
- クリップボード復元機能の実装
- 選択失敗時のフォールバックUI（手動入力）

### 🟢 低優先度（将来的な改善）

#### 7. **エラーログのストレージ制限なし**
**場所**: `src/utils/storage.ts`
**問題**: エラーログが無限に蓄積される可能性

**推奨対策**:
- 最大100件に制限
- 古いログを自動削除

#### 8. **TypeScriptの型安全性不足**
**問題**: `any`型や型アサーションの多用

**推奨対策**:
- strict modeの有効化
- 外部API応答の型検証（zod等）

#### 9. **デバッグログの本番残留**
**場所**: 多数のconsole.log/println!

**推奨対策**:
- 環境変数でログレベル制御
- 本番ビルドでconsole.log削除（既にterserで設定済み）

## 優先実装推奨順

1. **Rustの.unwrap()をResult/Option処理に変更**（最重要）
2. **setIntervalのクリーンアップ追加**
3. **空のcatchブロックにログ追加**
4. **競合状態の対策（AbortController）**
5. **ドラッグ中フォーカス喪失の修正**
6. **エラーログ上限設定**

## 追加テスト推奨項目

- ウィンドウが存在しない状態でのホットキー押下
- 高速連続翻訳（競合状態テスト）
- 長時間起動（メモリリークテスト）
- ネットワーク切断時の挙動
- Mutex poisoning シミュレーション
