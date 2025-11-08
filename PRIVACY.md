# プライバシーポリシー / Privacy Policy

**最終更新日**: 2025年11月5日
**バージョン**: 1.0.0

## 日本語

### データ収集と利用

AfterPot（以下「本アプリ」）は、以下のデータを収集・使用します:

#### 1. 選択テキスト
- **収集内容**: ユーザーが選択し、翻訳を実行したテキスト
- **送信先**:
  - Google Translate Web API（無料エンドポイント）
  - Google Gemini API（APIキーを設定した場合のみ）
- **目的**: 翻訳サービスの提供
- **保存期間**: 本アプリ内には保存されません。セッション終了時に破棄されます
- **注意**: 選択したテキストには機密情報や個人情報が含まれる可能性があります。重要な情報の翻訳時は慎重に行ってください

#### 2. APIキー
- **収集内容**: Gemini APIキー（ユーザーが任意に入力）
- **保存場所**: ブラウザのlocalStorage（平文）
- **目的**: Gemini翻訳サービスへの認証
- **セキュリティ**:
  - ローカルストレージに平文で保存されます
  - 外部への送信はGemini APIへの認証時のみ
  - アプリをアンインストールすると削除されます

#### 3. アプリ設定
- **収集内容**:
  - 選択されたGeminiモデル名
  - デフォルト翻訳先言語
  - ウィンドウの「常に最前面」設定
- **保存場所**: ブラウザのlocalStorage
- **目的**: ユーザー体験の向上
- **第三者への共有**: なし

### ログとデバッグ情報

- **通常モード**: 選択テキストやAPIキーはログに記録されません
- **詳細ログモード** (`VERBOSE_LOG`環境変数を設定した場合):
  - デバッグ目的でテキストの一部（最大50文字）がコンソールログに出力される可能性があります
  - 本番環境では使用しないでください

### 第三者サービスとの通信

本アプリは以下の外部サービスと通信します:

#### Google Translate Web API
- **URL**: `https://translate.google.com/translate_a/single`
- **送信データ**: 選択テキスト、言語コード
- **利用規約**: [Google Terms of Service](https://policies.google.com/terms)
- **プライバシーポリシー**: [Google Privacy Policy](https://policies.google.com/privacy)
- **注意**: 無料エンドポイントの利用規約は明確ではありません。商用利用の場合は公式Google Cloud Translation APIの使用を推奨します

#### Google Gemini API
- **URL**: `https://generativelanguage.googleapis.com/v1beta/`
- **送信データ**: 選択テキスト、APIキー、翻訳プロンプト
- **利用規約**: [Google Generative AI Terms](https://ai.google.dev/terms)
- **プライバシーポリシー**: [Google Privacy Policy](https://policies.google.com/privacy)
- **データ使用**: Googleは送信されたデータをモデル改善に使用する可能性があります（詳細はGoogle AIの規約を参照）

### データの保護

- **通信**: すべての通信はHTTPS経由で暗号化されます
- **ローカル保存**: APIキーは暗号化されずにlocalStorageに保存されます
- **第三者共有**: 本アプリは収集したデータを上記以外の第三者と共有しません

### ユーザーの権利

- **アクセス権**: localStorage内のデータはブラウザの開発者ツールで確認できます
- **削除権**: アプリをアンインストールすることで、すべてのローカルデータを削除できます
- **データポータビリティ**: localStorageのデータはJavaScriptでエクスポート可能です

### 子供のプライバシー

本アプリは13歳未満の子供を対象としていません。13歳未満のユーザーから意図的にデータを収集することはありません。

### プライバシーポリシーの変更

本プライバシーポリシーは随時更新される可能性があります。重要な変更がある場合は、新しいバージョンのリリースノートでお知らせします。

### お問い合わせ

プライバシーに関するご質問は、[GitHub Issues](https://github.com/kobayashiHawtin/afterPot/issues)でお問い合わせください。

---

## English

### Data Collection and Use

AfterPot ("the App") collects and uses the following data:

#### 1. Selected Text
- **What we collect**: Text selected and submitted for translation by the user
- **Where it's sent**:
  - Google Translate Web API (free endpoint)
  - Google Gemini API (only if API key is configured)
- **Purpose**: Provide translation services
- **Retention**: Not stored within the app; discarded at session end
- **Caution**: Selected text may contain sensitive or personal information. Exercise caution when translating important information

#### 2. API Keys
- **What we collect**: Gemini API Key (optional, user-provided)
- **Storage**: Browser's localStorage (plaintext)
- **Purpose**: Authentication for Gemini translation service
- **Security**:
  - Stored in plaintext in local storage
  - Only sent to Gemini API for authentication
  - Deleted when app is uninstalled

#### 3. App Settings
- **What we collect**:
  - Selected Gemini model name
  - Default target language
  - "Always on top" window setting
- **Storage**: Browser's localStorage
- **Purpose**: Enhance user experience
- **Third-party sharing**: None

### Logs and Debug Information

- **Normal mode**: Selected text and API keys are NOT logged
- **Verbose log mode** (when `VERBOSE_LOG` environment variable is set):
  - A portion of text (up to 50 characters) may be output to console logs for debugging purposes
  - Not recommended for production use

### Third-party Service Communication

The App communicates with the following external services:

#### Google Translate Web API
- **URL**: `https://translate.google.com/translate_a/single`
- **Data sent**: Selected text, language codes
- **Terms of Service**: [Google Terms of Service](https://policies.google.com/terms)
- **Privacy Policy**: [Google Privacy Policy](https://policies.google.com/privacy)
- **Notice**: The terms of use for the free endpoint are not clearly defined. Official Google Cloud Translation API is recommended for commercial use

#### Google Gemini API
- **URL**: `https://generativelanguage.googleapis.com/v1beta/`
- **Data sent**: Selected text, API key, translation prompt
- **Terms of Service**: [Google Generative AI Terms](https://ai.google.dev/terms)
- **Privacy Policy**: [Google Privacy Policy](https://policies.google.com/privacy)
- **Data usage**: Google may use submitted data to improve models (see Google AI terms for details)

### Data Protection

- **Communication**: All communication is encrypted via HTTPS
- **Local storage**: API keys are stored unencrypted in localStorage
- **Third-party sharing**: The App does not share collected data with third parties other than those mentioned above

### Your Rights

- **Access**: You can view localStorage data via browser developer tools
- **Deletion**: Uninstalling the app deletes all local data
- **Data portability**: localStorage data can be exported via JavaScript

### Children's Privacy

The App is not intended for children under 13. We do not knowingly collect data from users under 13.

### Changes to This Privacy Policy

This Privacy Policy may be updated from time to time. Significant changes will be announced in release notes for new versions.

### Contact

For privacy-related questions, please contact us via [GitHub Issues](https://github.com/kobayashiHawtin/afterPot/issues).
