# Polza AI CLI

Небольшой интерактивный CLI для вопросов к языковой модели через Polza.ai и OpenAI SDK.

## Требования

- Node.js 22.18 или новее
- npm

## Запуск

Установите зависимости:

```bash
npm install
```

Создайте в корне проекта файл `.env`:

```dotenv
POLZA_MODEL=provider/model
POLZA_BASE_URL=https://polza.ai/api/v1
POLZA_API_KEY=your-api-key
```

Укажите ID модели из [каталога Polza.ai](https://polza.ai/models) и свой API-ключ. Файл `.env` не нужно добавлять в Git.

Запустите CLI:

```bash
npm start
```

Введите вопрос после приглашения `> `. Во время ожидания ответа отображается спиннер. Для выхода введите `/exit`. Проверить типы отдельно можно командой `npm run typecheck`.
