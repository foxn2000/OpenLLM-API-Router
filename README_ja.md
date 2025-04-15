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

- `model.yaml`を編集して利用可能なモデルやプロバイダ固有の設定を行います。
- 各モデルにはAPIキーの環境変数名を指定してください。

### エラーハンドリング

- 存在しないモデルやAPIキー未設定、上流APIのエラー時には分かりやすいエラーメッセージを返します。

## ライセンス

MIT License
