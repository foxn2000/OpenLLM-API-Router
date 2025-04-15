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

- Edit `model.yaml` to define available models and their provider-specific settings.
- Each model must specify the environment variable name for its API key.

### Error Handling

- Returns clear error messages for missing models, missing API keys, and upstream API errors.

## License

MIT License
