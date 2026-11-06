# LLM Chat

Minimal Nuxt chat for an OpenAI-compatible language model. Responses stream into the browser through the Vercel AI SDK.

## Requirements

- Node.js 22.18 or newer
- npm

## Configuration

Create a .env file in the project root with these values:

    LLM_MODEL=deepseek/deepseek-v4.1-flash
    LLM_BASE_URL=https://api.example.com/v1
    LLM_API_KEY=your-api-key
    LLM_LOG_LEVEL=basic

The API key is read only by the server and is never exposed to the browser.

`LLM_LOG_LEVEL` controls JSON logs in `data/runs/`:

- `off` disables run logging;
- `basic` stores each question, answer, token usage (including available input, cache, text, and reasoning categories), and request timing;
- `detailed` also stores the model request context and response metadata;
- `raw` additionally stores every raw provider chunk returned by the LLM API.

One run is one conversation. The server creates `run-<ISO date time>.json` after the first completed response and updates the same file after each subsequent response.

## Development

Install dependencies with npm install.

Start the development server with npm run dev.

Open http://localhost:3000. The settings sidebar starts collapsed. Reasoning is enabled at `high` by default, matching DeepSeek V4.1 Flash; disable “Рассуждения модели” to send `none`, or choose `low`, `high`, or `max` while it is enabled. For Polza, the server sends the provider-specific `reasoning.effort` field in addition to the OpenAI-compatible setting. The selected model must support reasoning for the setting to have an effect. Other settings are independent: enable “Maximum response tokens” to edit and send a token limit, enable “Stop sequence” to stop generation at a specific sequence, enable “Показывать разбивку токенов” to display the available token categories below responses, or enable “Show rawFinishReason” to display the provider's completion reason. Missing token categories appear as `—`. These display settings can be toggled for the whole conversation.

Enable “Структурированный ответ” to send a strict JSON Schema through the OpenAI-compatible `response_format` API. The schema root must be an object, every declared property must be required, and objects must set `additionalProperties: false`. The default editor value is:

    {
      "type": "object",
      "properties": {
        "answer": { "type": "string" }
      },
      "required": ["answer"],
      "additionalProperties": false
    }

The server validates the schema and limits it to 32 KB before sending the request to the model. The schema is included in detailed run logs.

## Verification

Run npm run typecheck and npm run build.

Preview the production build with npm run preview.
