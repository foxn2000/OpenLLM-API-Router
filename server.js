require('dotenv').config(); // 環境変数を .env ファイルから読み込む
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const yaml = require('js-yaml');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

// APIキー認証ミドルウェア
const authenticateApiKey = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'APIキーが必要です。Authorization: Bearer <API_KEY> の形式で指定してください。' });
    }

    const [bearer, token] = authHeader.split(' ');
    
    if (bearer !== 'Bearer' || !token) {
        return res.status(401).json({ error: '不正な認証形式です。Authorization: Bearer <API_KEY> の形式で指定してください。' });
    }

    if (token !== process.env.ROUTER_API_KEY) {
        return res.status(401).json({ error: '無効なAPIキーです。' });
    }

    next();
};

// IPアドレス制限のミドルウェア
const ipWhitelistMiddleware = (req, res, next) => {
    // IPアドレス制限が有効かどうかを確認
    if (process.env.ENABLE_IP_WHITELIST !== 'true') {
        return next();
    }

    // 許可されたIPアドレスのリストを取得
    const allowedIPs = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim()) : [];
    if (allowedIPs.length === 0) {
        console.warn('警告: ALLOWED_IPS が設定されていません。全てのIPアドレスからのアクセスを拒否します。');
        return res.status(403).json({ error: 'IPアドレス制限が有効ですが、許可されたIPアドレスが設定されていません。' });
    }

    // クライアントのIPアドレスを取得（X-Forwarded-For ヘッダーを使用しない）
    const clientIP = req.socket.remoteAddress;

    // IPアドレスが許可リストに含まれているか確認
    if (!allowedIPs.includes(clientIP)) {
        console.warn(`アクセス拒否: 許可されていないIPアドレス ${clientIP} からのアクセスです。`);
        return res.status(403).json({ error: '許可されていないIPアドレスからのアクセスです。' });
    }

    next();
};

// Express アプリケーションの設定
const app = express();

let modelConfig;
try {
    modelConfig = yaml.load(fs.readFileSync('model.yaml', 'utf8'));
    console.log('model.yaml を読み込みました。');
} catch (e) {
    console.error('model.yaml の読み込みまたはパースに失敗しました:', e);
    process.exit(1);
}

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

// APIキー認証を/v1エンドポイントに適用
app.use('/v1', authenticateApiKey);

// IPアドレス制限を適用
app.use(ipWhitelistMiddleware);

// IPアドレスごとのレートリミッター設定
const dailyLimit = process.env.DAILY_RATE_LIMIT || 1000; // デフォルト値: 1日1000リクエスト
const limiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24時間
    max: dailyLimit, // IPアドレスごとの最大リクエスト数
    standardHeaders: true, // RateLimit-*ヘッダーを含める
    message: {
        error: 'IPアドレスごとのレートリミットを超過しました。24時間後に再度お試しください。'
    },
    trustProxy: false // プロキシを信頼しない
});

// サーバー全体のレートリミッター設定
const globalDailyLimit = process.env.GLOBAL_DAILY_RATE_LIMIT || 10000; // デフォルト値: 1日10000リクエスト
const globalLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24時間
    max: globalDailyLimit, // サーバー全体の最大リクエスト数
    standardHeaders: true, // RateLimit-*ヘッダーを含める
    message: {
        error: 'サーバーの1日のリクエスト上限に達しました。明日までお待ちください。'
    },
    keyGenerator: () => 'global', // すべてのリクエストで同じキーを使用することで、グローバルカウンターとして機能
    trustProxy: false // プロキシを信頼しない
});

// レートリミッターを/v1/chat/completionsエンドポイントに適用
// グローバルリミッターを先に適用し、その後IPアドレスごとのリミッターを適用
app.use('/v1/chat/completions', globalLimiter, limiter);


// マルチプロバイダ対応エンドポイント
app.post('/v1/chat/completions', async (req, res) => {
    try {
        // model.yamlのdefaultは無視し、リクエストのmodelでavailableのキー名でモデルを特定
        const requestedKey = req.body.model;
        const modelInfo = modelConfig.models.available[requestedKey];
        if (!modelInfo) {
            return res.status(400).json({ error: '指定されたモデルキーが設定ファイルに存在しません。' });
        }

        // APIキー取得
        const apiKey = process.env[modelInfo.apiKeyEnvName];
        if (!apiKey || apiKey === `YOUR_${modelInfo.apiKeyEnvName}_HERE`) {
            return res.status(500).json({ error: `APIキー(${modelInfo.apiKeyEnvName})が設定されていません。` });
        }

        // ヘッダー構築
        const headers = { ...req.headers };
        delete headers.authorization;
        delete headers.host;
        delete headers['content-length'];
        headers['Content-Type'] = 'application/json';

        // プロバイダごとの分岐
        let url = modelInfo.baseUrl;
        let data = { ...req.body, model: modelInfo.name };
        let responseType = req.body.stream ? 'stream' : 'json';

        // Anthropic
        if (url.includes('anthropic.com')) {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = modelInfo.anthropicVersion || '2023-06-01';
            delete headers['Authorization'];
            // OpenAI形式→Anthropic形式変換
            data = {
                model: modelInfo.name,
                max_tokens: req.body.max_tokens || (modelInfo.defaultParams ? modelInfo.defaultParams.max_tokens : undefined),
                temperature: req.body.temperature || (modelInfo.defaultParams ? modelInfo.defaultParams.temperature : undefined),
                messages: req.body.messages,
                stream: !!req.body.stream,
            };
            if (req.body.system) {
                data.system = req.body.system;
            }
        }
        // Google Gemini
        else if (modelInfo.isGoogleAI) {
            url += `?key=${apiKey}`;
            // OpenAI形式→Google Gemini形式変換
            const contents = (req.body.messages || []).map(msg => {
                if (msg.role === 'system') {
                    return { role: 'user', parts: [{ text: msg.content }] };
                }
                return { role: msg.role, parts: [{ text: msg.content }] };
            });
            data = {
                contents,
                generationConfig: {
                    temperature: req.body.temperature || (modelInfo.defaultParams ? modelInfo.defaultParams.temperature : undefined),
                    maxOutputTokens: req.body.max_tokens || (modelInfo.defaultParams ? modelInfo.defaultParams.maxOutputTokens : undefined),
                }
            };
            delete headers['Authorization'];
        }
        // OpenAI互換 (Cerebras, OpenAI, Sambanova, Groq)
        else {
            headers['Authorization'] = `Bearer ${apiKey}`;
            data = { ...req.body, model: modelInfo.name };
        }

        // リクエスト送信
        const response = await axios({
            method: 'post',
            url,
            data,
            headers,
            responseType
        });

        // ストリーミング
        if (req.body.stream) {
            res.setHeader('Content-Type', response.headers['content-type'] || 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            response.data.pipe(res);
        } else {
            res.status(response.status).json(response.data);
        }
    } catch (error) {
        console.error('APIリクエスト中にエラーが発生:', error.message);
        if (error.response) {
            // error.response.data が循環参照を含む場合に備え、JSON化できない場合はテキスト化
            let safeData = error.response.data;
            if (typeof safeData !== 'object') {
                // そのまま返す
            } else {
                try {
                    JSON.stringify(safeData);
                } catch (e) {
                    safeData = { error: 'APIエラー: レスポンスデータをJSON化できません', status: error.response.status };
                }
            }
            res.status(error.response.status).json(safeData);
        } else if (error.request) {
            res.status(504).json({ error: 'Gateway Timeout: 上流サーバーからの応答がありません。' });
        } else {
            res.status(500).json({ error: 'Internal Server Error: リクエスト処理中にエラーが発生しました。' });
        }
    }
});

/**
 * OpenAI API互換: モデル一覧取得エンドポイント
 * model.yamlのavailableキー一覧をOpenAI API形式で返す
 */
app.get('/v1/models', (req, res) => {
    const available = modelConfig.models && modelConfig.models.available ? modelConfig.models.available : {};
    const now = Math.floor(Date.now() / 1000);
    const data = Object.keys(available).map(key => ({
        id: key,
        object: "model",
        created: now,
        owned_by: "proxy"
    }));
    res.json({
        object: "list",
        data
    });
});

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
