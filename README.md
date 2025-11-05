# AfterPot

<div align="center">

**Windows 11 常駐翻訳アプリ**

選択したテキストを瞬時に翻訳 - Google翻訳とGemini AIを活用

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/afterpot/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2011-lightgrey.svg)]()

</div>

## 特徴

- 🚀 **グローバルホットキー**: `Ctrl+Shift+Q` でどこからでも翻訳
- 🔄 **自動言語検出**: 日本語⇔英語を自動で判定
- 🤖 **デュアル翻訳エンジン**: Google翻訳とGemini AIを同時表示
- 🎨 **クリーンなUI**: コンパクトなポップアップインターフェース
- 📌 **常時表示対応**: ピン留めで最前面表示（デフォルトOFF）
- 🔒 **プライバシー重視**: ログの機密情報リダクション機能
- 💾 **オフライン対応**: WebView2同梱の単一インストーラー
- 🆓 **Google翻訳は無料**: APIキー不要（Geminiはオプション）

## インストール

### 要件
- Windows 11
- 管理者権限（初回インストール時のみ）

### 手順

1. [Releases](https://github.com/yourusername/afterpot/releases/latest)から最新の`AfterPot_1.0.0_x64-setup.exe`をダウンロード
2. インストーラーを実行（WebView2ランタイムも自動インストールされます）
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
- **最小化**: ×ボタンでポップアップを閉じます（アプリは終了せずトレイに常駐）

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
git clone https://github.com/yourusername/afterpot.git
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
- **UI**: Custom CSS（TailwindCSSスタイル）
- **APIs**:
  - Google Translate Web API（無料エンドポイント、APIキー不要）
  - Google Gemini Generative Language API（要APIキー）

## トラブルシューティング

### ホットキーが動作しない

- 他のアプリケーション（例: Pot, PowerToys）が同じショートカットを使用していないか確認
- アプリを再起動してみる
- ログに `WARNING: Failed to register global shortcut` が出ている場合は競合の可能性

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
- 翻訳履歴機能なし
- 単一インスタンス制御未実装（複数起動可能）

## ロードマップ

### 近日中
- [ ] ホットキーカスタマイズUI
- [ ] 自動起動オプション（Windows起動時）
- [ ] 単一インスタンス制御

### 将来的に
- [ ] 翻訳履歴機能
- [ ] より多くの言語対応（中国語、韓国語など）
- [ ] コード署名の実装
- [ ] 自動更新機能（Tauri Updater）
- [ ] 公式Google Cloud Translation APIのサポート
- [ ] プロキシ設定UI

## 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

### 開発ガイドライン

1. `main`ブランチから新しいブランチを作成
2. 変更を実装し、テストを実行
3. コミットメッセージは明確に
4. プルリクエストを作成

## サポート

問題が発生した場合は、[GitHub Issues](https://github.com/yourusername/afterpot/issues)で報告してください。

バグ報告には以下を含めてください:
- Windows バージョン
- AfterPot バージョン
- 再現手順
- エラーメッセージ（あれば）

---

**作成**: 2025
**バージョン**: 1.0.0
**メンテナンス**: アクティブ