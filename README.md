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

The API key is read only by the server and is never exposed to the browser.

## Development

Install dependencies with npm install.

Start the development server with npm run dev.

Open http://localhost:3000. The settings sidebar starts collapsed. Each setting has its own checkbox: enable “Maximum response tokens” to edit and send a token limit, or “Show rawFinishReason” to display the provider's completion reason beneath responses. The completion reason is stored with each response, so its visibility can be toggled for the whole conversation.

## Verification

Run npm run typecheck and npm run build.

Preview the production build with npm run preview.
