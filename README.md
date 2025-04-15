# OpenAI-Compatible Multi-Provider Proxy Server

[日本語READMEはこちら](./README_ja.md)

## Overview

This project is a proxy server compatible with the OpenAI API, supporting multiple AI providers such as OpenAI, Anthropic, Google Gemini, Cerebras, Sambanova, and Groq.  
It allows you to send OpenAI-style API requests and have them routed to the appropriate provider based on your configuration.

## Features

- **OpenAI API compatibility**: Accepts requests in OpenAI format and converts them for each provider.
- **Multi-provider support**: Easily switch between OpenAI, Anthropic, Google Gemini, and more via `model.yaml`.
- **Environment variable-based API key management**: Securely manage API keys using environment variables.
- **CORS configuration**: Restrict or allow origins via the `ALLOWED_ORIGINS` environment variable.
- **Streaming support**: Handles both standard and streaming responses.
- **Error handling**: Provides clear error messages for configuration and upstream API issues.

## Getting Started

### Prerequisites

- Node.js (v16 or later recommended)
- npm

### Installation

1. Clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and set the required environment variables (API keys, etc.).
4. Edit `model.yaml` to configure available models and providers.

### Running the Server

```bash
node server.js
```

The server will start on the port specified by the `PORT` environment variable (default: 3001).

### API Usage

Send POST requests to:

```
/v1/chat/completions
```

with a JSON body in OpenAI format.  
The `model` field should match a key in `model.yaml` under `models.available`.

#### Example Request

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ]
}
```

### CORS

- Set `ALLOWED_ORIGINS` in your `.env` file to a comma-separated list of allowed origins.
- If not set, all origins are allowed (development only; not recommended for production).

### Model Configuration

Edit `model.yaml` to define available models and their provider-specific settings.  
Each model entry under `models.available` should specify:

- `name`: The model name as required by the provider (e.g., "gpt-3.5-turbo").
- `baseUrl`: The API endpoint for the provider.
- `apiKeyEnvName`: The environment variable name where the API key is stored.
- `isGoogleAI`, `anthropicVersion`, `defaultParams`, etc.: Provider-specific options.

#### Example `model.yaml`

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

- You can add or remove models as needed.
- Make sure to set the corresponding API key in your `.env` file, e.g., `OPENAI_API_KEY=...`.

#### Field Descriptions

- `name`: Model name for the provider.
- `baseUrl`: API endpoint for the model.
- `apiKeyEnvName`: Name of the environment variable for the API key.
- `defaultParams`: Default parameters (e.g., `max_tokens`, `temperature`).
- `isGoogleAI`, `anthropicVersion`: Provider-specific options.

### Error Handling

- Returns clear error messages for missing models, missing API keys, and upstream API errors.

## License

This project is licensed under the MIT License.  
See the [LICENSE](./LICENSE) file for details.

MIT License

Copyright (c) [year] [your name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
