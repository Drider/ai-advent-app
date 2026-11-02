# LLM CLI

Простая интерактивная CLI-утилита для общения с языковой моделью через OpenAI-совместимый API.

## Требования

- Node.js 22.18 или новее
- npm

## Запуск

Установите зависимости:

```bash
npm install
```

Создайте в корне проекта файл `.env` и укажите настройки API:

```dotenv
LLM_MODEL=provider/model
LLM_BASE_URL=https://api.example.com/v1
LLM_API_KEY=your-api-key
```

Запустите CLI:

```bash
npm start
```

Введите вопрос после приглашения `> `. Во время ожидания ответа отображается спиннер. Для выхода введите `/exit`. Проверить типы отдельно можно командой `npm run typecheck`.
