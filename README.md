# LLM Chat

Minimal Nuxt chat for an OpenAI-compatible language model. Responses stream into the browser through the Vercel AI SDK.

## Requirements

- Node.js 22.18 or newer
- npm

## Configuration

Create a .env file in the project root with these values:

    LLM_BASE_URL=https://api.example.com/v1
    LLM_API_KEY=your-api-key
    LLM_MODEL_DEFAULT=deepseek/deepseek-v4.1-flash
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

Open http://localhost:3000. The settings sidebar starts collapsed. `LLM_MODEL_DEFAULT` sets the initially selected model and the model restored when settings are reset; if omitted, it defaults to `deepseek/deepseek-v4.1-flash`. The model ID can be changed in the sidebar and is sent with each request. Use the link icon beside the field to open the [Polza model list](https://polza.ai/dashboard/models). Reasoning is enabled at `high` by default, matching DeepSeek V4.1 Flash; disable “Рассуждения модели” to send `none`, or choose `low`, `high`, or `max` while it is enabled. For Polza, the server sends the provider-specific `reasoning.effort` field in addition to the OpenAI-compatible setting. The selected model must support reasoning for the setting to have an effect. Temperature is disabled by default; enable “Температура” to send a value from `0` to `2` (the default field value is `1`). Other settings are independent: enable “Maximum response tokens” to edit and send a token limit, enable “Stop sequence” to stop generation at a specific sequence, enable “Показывать разбивку токенов” to display the available token categories below responses, or enable “Show rawFinishReason” to display the provider's completion reason. Missing token categories appear as `—`. These display settings can be toggled for the whole conversation.

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

## Benchmarks and reports

Open `/benchmark` for LLM reasoning. Open `/benchmark/temperature` to compare temperature 0, 0.7, and 1.2 on one exact-answer task and one generation task, five calls per combination (30 calls total). Choose the original basic question set or the new set with a code puzzle and a constrained naming task; the new set is selected by default. Select `upstage/solar-mini4` (the default), DeepSeek V4.1 Flash, or enter another model ID. Reasoning is fixed to `none` so temperature can be compared independently. The page saves the chosen question set, every prompt, raw answer, temperature, repeat number, timing, and token usage in `data/temperature-runs/`; previous runs are available in the History tab. The benchmark does not start until you press its Run button. To add a benchmark, add its name and route to `shared/benchmarks.ts` and create a page in `pages/benchmark/` using `BenchmarkShell`.

Solar Mini 4 is suitable for this benchmark: [Polza lists `temperature` as a supported parameter](https://polza.ai/models/upstage/solar-mini4), and [Upstage accepts values from 0 to 2](https://console.upstage.ai/api/chat). Upstage documents `none` as a reasoning-off value for Solar Mini 4. The benchmark records reasoning token counts so unexpected reasoning can be spotted in the results.

Reports are Markdown files in `data/experiments/`. Each published report needs a benchmark ID at the top of the file:

```md
---
benchmark: reasoning
---

# Report title
```

Use an ID from `shared/benchmarks.ts`. The benchmark label appears on the shared report list and the report page. Files with `handoff` in their name are not published.
