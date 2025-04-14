require('dotenv').config(); // 環境変数を .env ファイルから読み込む
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001; // ポート番号 (環境変数 PORT があればそれを使う)

// CORS設定
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
if (allowedOrigins.length === 0) {
    console.warn('警告: ALLOWED_ORIGINS 環境変数が設定されていません。全てのオリジンからのアクセスを許可します。本番環境では必ず設定してください。');
}

app.use(cors({
    origin: function (origin, callback) {
        // 環境変数が設定されていない場合は全てのオリジンを許可 (開発用)
        if (allowedOrigins.length === 0) {
            return callback(null, true);
        }
        // リクエスト元オリジンがない場合 (curlなど) または許可リストに含まれる場合
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error(`CORSエラー: オリジン ${origin} からのアクセスは許可されていません。`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 許可するHTTPメソッド
    allowedHeaders: ['Content-Type', 'Authorization'], // 許可するリクエストヘッダー
}));

// JSONリクエストボディをパースするためのミドルウェア
app.use(express.json());

// Cerebras APIのエンドポイントURL (仮。実際のURLに置き換える必要があります)
// 注意: Cerebrasのドキュメントを確認し、正しいAPIエンドポイントURLを設定してください。
const CEREBRAS_API_BASE_URL = process.env.CEREBRAS_API_BASE_URL || 'https://api.cerebras.ai'; // 例: 必要に応じて変更

// OpenAI互換エンドポイント
app.post('/v1/chat/completions', async (req, res) => {
    const cerebrasApiKey = process.env.CEREBRAS_API_KEY;

    if (!cerebrasApiKey || cerebrasApiKey === 'YOUR_CEREBRAS_API_KEY_HERE') {
        console.error('エラー: CEREBRAS_API_KEY 環境変数が設定されていません。');
        return res.status(500).json({ error: 'サーバー設定エラー: APIキーが設定されていません。' });
    }

    // フロントエンドからのAuthorizationヘッダーは削除または無視
    const headers = { ...req.headers };
    delete headers.authorization; // フロントエンドからのキーは使わない
    delete headers.host; // hostヘッダーも転送しない方が良い場合がある
    delete headers['content-length']; // Content-Lengthはaxiosが自動計算するので削除

    // Cerebras APIキーを付与
    headers['Authorization'] = `Bearer ${cerebrasApiKey}`;
    // Content-Typeは通常 application/json
    headers['Content-Type'] = 'application/json';

    // Cerebras APIのエンドポイントURLを構築
    // 注意: Cerebras APIがOpenAIと同じパス構造 (/v1/chat/completions) を持つか確認が必要です。
    // もし異なる場合は、ここのURL構築ロジックを調整してください。
    const cerebrasApiUrl = `${CEREBRAS_API_BASE_URL}/v1/chat/completions`;

    console.log(`リクエスト転送中: ${req.method} ${cerebrasApiUrl}`);
    console.log('リクエストボディ:', JSON.stringify(req.body, null, 2));
    // console.log('転送ヘッダー:', JSON.stringify(headers, null, 2)); // デバッグ用にヘッダーを表示（APIキーが含まれるため注意）

    try {
        const response = await axios({
            method: 'post',
            url: cerebrasApiUrl,
            data: req.body, // フロントエンドからのリクエストボディをそのまま使用
            headers: headers,
            responseType: req.body.stream ? 'stream' : 'json' // ストリーミング対応
        });

        // ストリーミングの場合
        if (req.body.stream) {
            res.setHeader('Content-Type', response.headers['content-type'] || 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            response.data.pipe(res); // レスポンスストリームをクライアントにパイプ
        } else {
            // 通常のJSONレスポンスの場合
            res.status(response.status).json(response.data);
        }
        console.log(`レスポンスステータス: ${response.status}`);

    } catch (error) {
        console.error('Cerebras APIへのリクエスト中にエラーが発生しました:', error.message);
        if (error.response) {
            // Cerebras APIからのエラーレスポンスがある場合
            console.error('Cerebras APIエラーレスポンス:', error.response.status, error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // リクエストは送信されたが、レスポンスがない場合
            console.error('Cerebras APIからのレスポンスがありませんでした。');
            res.status(504).json({ error: 'Gateway Timeout: 上流サーバーからの応答がありません。' });
        } else {
            // リクエスト設定時のエラーなど
            console.error('リクエスト設定エラー:', error.message);
            res.status(500).json({ error: 'Internal Server Error: リクエスト処理中にエラーが発生しました。' });
        }
    }
});

// その他のOpenAIエンドポイントも必要に応じて同様に追加...
// 例: app.get('/v1/models', async (req, res) => { ... });

// ルートパスへの簡単な応答 (サーバーが動作しているか確認用)
app.get('/', (req, res) => {
    res.send('OpenAI to Cerebras Proxy is running!');
});

// サーバー起動
app.listen(port, () => {
    console.log(`プロキシサーバーが http://localhost:${port} で起動しました`);
    if (allowedOrigins.length > 0) {
        console.log(`許可されたオリジン: ${allowedOrigins.join(', ')}`);
    }
});
