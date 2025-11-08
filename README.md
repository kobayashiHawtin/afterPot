# AfterPot

<div align="center">

**Windows 11 常駐翻訳アプリ**

選択したテキストを瞬時に翻訳 - Google翻訳とGemini AIを活用

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/kobayashiHawtin/afterPot/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2011-lightgrey.svg)]()

</div>

## 特徴

- 🚀 **グローバルホットキー**: `Ctrl+Shift+Q` でどこからでも翻訳
- 🔄 **自動言語検出**: 日本語⇔英語を自動で判定
- 🤖 **デュアル翻訳エンジン**: Google翻訳とGemini AIを同時表示
- 🎨 **クリーンなUI**: コンパクトなポップアップインターフェース
- 📌 **常時表示対応**: ピン留めで最前面表示（デフォルトOFF）
- 🪟 **安定したウィンドウ表示**: 最小化状態からの自動復元、サイズ・位置補正機能
- 🔒 **プライバシー重視**: ログの機密情報リダクション機能
- 💾 **軽量インストーラー**: WebView2 Bootstrapper採用で約2.5MB（従来比98%削減）
- 🆓 **Google翻訳は無料**: APIキー不要（Geminiはオプション）
- 🛡️ **ロバスト設計**: エラーハンドリング強化、メモリリーク対策、競合状態の回避

## インストール

### 要件
- Windows 11
- 管理者権限（初回インストール時のみ）

### 手順

1. [Releases](https://github.com/kobayashiHawtin/afterPot/releases/latest)から最新の`AfterPot_1.2.0_x64-setup.exe`をダウンロード
2. インストーラーを実行（WebView2ランタイムが未インストールの場合は自動ダウンロード・インストールされます）
3. システムトレイにアイコンが表示されます

**注意**: 初回起動時にWindows Defenderの警告が表示される場合があります（コード署名未実装のため）。「詳細情報」→「実行」で進んでください。

## 使い方

### 基本的な使い方

1. 任意のアプリケーションでテキストを選択
2. `Ctrl+Shift+Q` を押す
3. 翻訳結果がポップアップで表示されます（Gemini→Google順）

### 機能

- **コピー**: 各翻訳結果の横にあるコピーボタンでクリップボードにコピー
- **言語スワップ**: ↔️ボタンで翻訳方向を反転して再翻訳
- **ウィンドウリサイズ**: 端や角をドラッグしてサイズ変更
- **ピン留め**: 📌ボタンで最前面表示を切り替え（設定は保存されます）
- **自動非表示**: ピン留めOFF時、フォーカスを失うと自動的に隠れます（ドラッグ中は除く）
- **最小化**: ×ボタンでポップアップを閉じます（アプリは終了せずトレイに常駐）

### ウィンドウの挙動

- **翻訳ウィンドウ**:
  - 初期サイズ 600x700（最小 320x200）
  - ピン留めOFF時は自動非表示（500ms グレース期間あり）
  - 最小化状態から自動復元、画面外の場合は中央に再配置
- **設定ウィンドウ**:
  - 初期サイズ 600x500
  - 極小サイズ（100x100など）を自動検出して正常サイズに修正
  - 閉じてもウィンドウは破棄されず、次回即座に表示可能

### 設定

システムトレイのアイコンをクリックするか、右クリック→「設定」を選択

- **Gemini API Key**: オプション。入力するとGemini翻訳が有効化されます
  - [API Keyの取得方法](https://makersuite.google.com/app/apikey)
  - 未入力でもGoogle翻訳は使えます
- **Gemini モデル**: 自動（最新Flash）または特定のモデルを選択
- **デフォルト翻訳先言語**: 日本語、英語、中国語など
- **翻訳テスト**: 設定画面から手動テスト可能

## ホットキーのカスタマイズ

現在、ホットキーは `Ctrl+Shift+Q` に固定されています。他のアプリケーションと競合する場合:

1. 競合するアプリケーション（Pot, PowerToysなど）を終了してAfterPotを再起動
2. または、設定画面の「翻訳テスト」ボタンから手動で翻訳ウィンドウを開く

**今後の改善予定**: ホットキーカスタマイズUIを追加予定

**今後の改善予定**: ホットキーカスタマイズUIを追加予定

## 開発

### 環境構築

**前提条件**:
- [Rust](https://rustup.rs/) - Tauriに必要
- [Node.js](https://nodejs.org/) - LTS版推奨

```bash
# リポジトリをクローン
git clone https://github.com/kobayashiHawtin/afterPot.git
cd afterpot

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run tauri dev

# 詳細ログを有効化（開発時）
set VERBOSE_LOG=1
npm run tauri dev
```

### ビルド

```bash
# Windowsインストーラーをビルド
npm run build:win

# 出力先: src-tauri/target/release/bundle/nsis/
```

### 技術スタック

- **Backend**: Tauri (Rust)
  - reqwest: HTTPクライアント（タイムアウト10-15秒）
  - serde_json: JSON処理
  - selection: テキスト選択キャプチャ（Pot由来）
- **Frontend**: React + TypeScript + Vite
  - strict モード有効（型安全性強化）
  - カスタムフック活用（useRef による競合状態回避）
- **UI**: Custom CSS（TailwindCSSスタイル）
- **APIs**:
  - Google Translate Web API（無料エンドポイント、APIキー不要）
  - Google Gemini Generative Language API（要APIキー）
- **Build**:
  - Vite terser minification（console.log 除去、コード分割）
  - NSIS installer with WebView2 downloadBootstrapper（軽量化）

### 安定性と品質保証

- **エラーハンドリング**: unwrap 排除、Result/Option 安全処理
- **メモリ管理**: interval/timeout クリーンアップ、履歴・ログ上限制御（定数化）
- **競合制御**: translationId による古いリクエストの無効化、isDraggingRef によるフォーカス競合回避
- **ウィンドウ管理**:
  - 破棄防止（CloseRequested インターセプト）
  - サイズ・位置自動補正
  - グレース期間による誤 blur 無視（500ms）
- **CI/CD**: GitHub Actions（type check / build / cargo check）

## トラブルシューティング

### ホットキーが動作しない

- 他のアプリケーション（例: Pot, PowerToys）が同じショートカットを使用していないか確認
- アプリを再起動してみる
- ログに `WARNING: Failed to register global shortcut` が出ている場合は競合の可能性

### 翻訳ウィンドウが表示されない

- ログで `translate.show() success` が出ているか確認（ログ有効化: `set VERBOSE_LOG=1 && npm run tauri dev`）
- Win+Tab でウィンドウのサムネイルが見えるか確認
- 最新版では以下の対策を実装済み:
  - 最小化状態からの自動復元（`unminimize()`）
  - 画面外位置の場合は中央に再配置（`center()`）
  - 極小サイズの自動検出と修正
  - 閉じたウィンドウの破棄防止（hide処理に変換）

### 設定ウィンドウが極小サイズで表示される

- v1.2.0 で自動修正機能を実装済み（400x300未満の場合は600x500に自動リサイズ）
- それでも発生する場合はログを確認し issue で報告してください

### 翻訳が失敗する

- インターネット接続を確認
- Gemini APIキーが有効か確認（設定画面で「更新」ボタンを押してモデル一覧を取得できるか）
- エラーメッセージを確認:
  - 「タイムアウト」→ネット速度が遅い、または接続不安定
  - 「オフライン」→インターネット接続なし
  - 「API returned error 403」→APIキーが無効

### アプリが起動しない

- Windows 11であることを確認
- WebView2ランタイムが正しくインストールされているか確認
- タスクマネージャーで既に起動していないか確認

## プライバシーとセキュリティ

- 選択したテキストはGoogle翻訳およびGemini API（有効時）に送信されます
- APIキーはlocalStorageに平文で保存されます（ブラウザと同等のセキュリティレベル）
- ログには機密情報が記録されません（`VERBOSE_LOG`環境変数を設定した場合のみデバッグ情報が表示されます）
- 通信はすべてHTTPS経由
- 詳細は [PRIVACY.md](PRIVACY.md) をご覧ください

## ライセンスと帰属

MIT License - 詳細は [LICENSE](LICENSE) をご覧ください

### サードパーティライセンス

このアプリケーションは以下のオープンソースプロジェクトを使用しています:

- [Tauri](https://tauri.app/) (MIT/Apache-2.0)
- [React](https://react.dev/) (MIT)
- [TypeScript](https://www.typescriptlang.org/) (Apache-2.0)
- [Vite](https://vitejs.dev/) (MIT)
- [reqwest](https://github.com/seanmonstar/reqwest) (MIT/Apache-2.0)
- [serde](https://serde.rs/) (MIT/Apache-2.0)
- [selection](https://github.com/pot-app/Selection) (MIT) - Potプロジェクトから

### 謝辞

- [Pot](https://github.com/pot-app/pot-desktop) - テキスト選択機能の実装とインスピレーション
- [Google Translate](https://translate.google.com/) - 無料翻訳API
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI翻訳

## 既知の問題と制限事項

- ホットキーのカスタマイズ機能未実装
- コード署名未実装（Windows Defender警告が出る場合があります）
- Google無料エンドポイントの利用規約は明確ではありません（商用利用の際は公式APIの使用を推奨）
- 自動更新機能未実装
- 翻訳履歴機能なし（エラーログ・履歴は100件上限でlocalStorageに保存）

## ロードマップ

### v1.3.0（計画中）
- [ ] ホットキーカスタマイズUI
- [ ] 自動起動オプション（Windows起動時）

### 将来的に
- [ ] ランタイムスキーマバリデーション（zod導入）
- [ ] 翻訳履歴の永続化とUI
- [ ] より多くの言語対応（中国語、韓国語など）
- [ ] コード署名の実装
- [ ] 自動更新機能（Tauri Updater）
- [ ] 公式Google Cloud Translation APIのサポート
- [ ] プロキシ設定UI

## 変更履歴

### v1.2.0（開発中 - 2025-01-08）
- 🐛 ウィンドウ表示安定性の大幅向上
  - 最小化状態からの確実な復元（unminimize）
  - 画面外位置の自動中央配置
  - 極小サイズ（100x100等）の自動検出と修正（settings: 600x500, translate: 600x400）
  - ウィンドウ破棄の防止（CloseRequested → hide 変換）
- ️ 安定性・品質改善
  - unwrap 排除（安全なエラーハンドリング）
  - メモリリーク対策（interval/timeout クリーンアップ）
  - 競合状態の回避（translationId / isDraggingRef による race condition 対策）
  - ログ・履歴の上限定数化（MAX_HISTORY_ENTRIES / MAX_ERROR_LOGS = 100）
- 🔧 UX改善
  - 自動非表示機能（ピン留めOFF時のフォーカス喪失で自動hide）
  - 500ms グレース期間（起動直後の誤 blur イベント無視）
  - ドラッグ中の非表示競合回避（isDraggingRef による即座の状態チェック）
- 📝 診断・開発者体験
  - 詳細ログ追加（VERBOSE_LOG 環境変数でデバッグ情報表示）
  - show/focus/size/position の成功/失敗ログ
  - ウィンドウ最終状態のログ出力
- 🔄 CI/CD整備
  - GitHub Actions ワークフロー追加（type check / frontend build / cargo check）
  - branch protection 準備完了

### v1.1.0（2025-01-07）
- ✨ インストーラーサイズ削減（188MB → 2.5MB、WebView2 Bootstrapper採用）
- 🐛 翻訳ウィンドウが表示されない問題の初期対応
- 📝 ログ改善とデバッグ機能追加

### v1.0.0（初回リリース）
- 🎉 基本機能実装
  - グローバルホットキー（Ctrl+Shift+Q）
  - デュアル翻訳エンジン（Google / Gemini）
  - 自動言語検出
  - システムトレイ常駐

## 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

### 開発ガイドライン

1. `main`ブランチから新しいブランチを作成
2. 変更を実装し、テストを実行
3. コミットメッセージは明確に
4. プルリクエストを作成

## サポート

問題が発生した場合は、[GitHub Issues](https://github.com/kobayashiHawtin/afterPot/issues)で報告してください。

バグ報告には以下を含めてください:
- Windows バージョン
- AfterPot バージョン
- 再現手順
- エラーメッセージ（あれば）

---

**作成**: 2025
**バージョン**: 1.2.0 (開発中)
**メンテナンス**: アクティブ