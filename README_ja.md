# OpenAI互換マルチプロバイダプロキシサーバー

## 概要

このプロジェクトは、OpenAI API互換のプロキシサーバーです。OpenAI、Anthropic、Google Gemini、Cerebras、Sambanova、Groqなど、複数のAIプロバイダに対応しています。  
OpenAI形式のAPIリクエストを受け付け、設定に基づいて適切なプロバイダへルーティングします。

## 特徴

- **OpenAI API互換**: OpenAI形式のリクエストを受け付け、各プロバイダ用に変換して送信します。
- **マルチプロバイダ対応**: `model.yaml`の設定により、OpenAI、Anthropic、Google Geminiなどを簡単に切り替え可能です。
- **環境変数によるAPIキー管理**: APIキーは環境変数で安全に管理します。
- **CORS設定**: 環境変数`ALLOWED_ORIGINS`で許可するオリジンを制御できます。
- **ストリーミング対応**: 標準レスポンスとストリーミングレスポンスの両方に対応しています。
- **エラーハンドリング**: 設定ミスや上流APIのエラーに対して分かりやすいエラーメッセージを返します。

## はじめに

### 前提条件

- Node.js（v16以上推奨）
- npm

### インストール

1. このリポジトリをクローンします。
2. 依存パッケージをインストールします:

   ```bash
   npm install
   ```

3. `.env.example`をコピーして`.env`を作成し、必要な環境変数（APIキー等）を設定します。
4. `model.yaml`を編集して利用可能なモデルやプロバイダを設定します。

### サーバーの起動

```bash
node server.js
```

`PORT`環境変数で指定したポート（デフォルト: 3001）でサーバーが起動します。

### APIの使い方

以下のエンドポイントにPOSTリクエストを送信します:

```
/v1/chat/completions
```

リクエストボディはOpenAI形式のJSONです。  
`model`フィールドには`model.yaml`の`models.available`で定義したキー名を指定してください。

#### リクエスト例

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ]
}
```

### CORSについて

- `.env`ファイルの`ALLOWED_ORIGINS`にカンマ区切りで許可するオリジンを指定できます。
- 未設定の場合は全てのオリジンを許可します（開発用。本番環境では必ず設定してください）。

### モデル設定

`model.yaml`を編集して利用可能なモデルやプロバイダ固有の設定を行います。  
`models.available`の各エントリには以下を指定します。

- `name`: プロバイダで必要なモデル名（例: "gpt-3.5-turbo"）
- `baseUrl`: プロバイダのAPIエンドポイント
- `apiKeyEnvName`: APIキーを格納する環境変数名
- `isGoogleAI`, `anthropicVersion`, `defaultParams` など: プロバイダ固有のオプション

#### `model.yaml`の例

```yaml
models:
  available:
    gpt-3.5-turbo:
      name: gpt-3.5-turbo
      baseUrl: https://api.openai.com/v1/chat/completions
      apiKeyEnvName: OPENAI_API_KEY
      defaultParams:
        max_tokens: 2048
        temperature: 1.0
    claude-3-opus:
      name: claude-3-opus-20240229
      baseUrl: https://api.anthropic.com/v1/messages
      apiKeyEnvName: ANTHROPIC_API_KEY
      anthropicVersion: "2023-06-01"
      defaultParams:
        max_tokens: 2048
        temperature: 1.0
    gemini-pro:
      name: gemini-pro
      baseUrl: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
      apiKeyEnvName: GOOGLE_API_KEY
      isGoogleAI: true
      defaultParams:
        maxOutputTokens: 2048
        temperature: 1.0
```

- 必要に応じてモデルを追加・削除できます。
- `.env`ファイルに対応するAPIキー（例: `OPENAI_API_KEY=...`）を必ず設定してください。

#### 各フィールドの説明

- `name`: プロバイダ用のモデル名
- `baseUrl`: モデルのAPIエンドポイント
- `apiKeyEnvName`: APIキーの環境変数名
- `defaultParams`: デフォルトパラメータ（例: `max_tokens`, `temperature`）
- `isGoogleAI`, `anthropicVersion`: プロバイダ固有のオプション

### エラーハンドリング

- 存在しないモデルやAPIキー未設定、上流APIのエラー時には分かりやすいエラーメッセージを返します。

## ライセンス

本プロジェクトはMITライセンスで提供されています。  
詳細は[LICENSE](./LICENSE)ファイルを参照してください。