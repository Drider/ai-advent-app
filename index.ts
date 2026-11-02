import OpenAI from 'openai';
import { createInterface } from 'node:readline';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Заполните ${name} в файле .env`);
  }

  return value;
}

const apiKey = getRequiredEnv('LLM_API_KEY');
const baseURL = getRequiredEnv('LLM_BASE_URL');
const model = getRequiredEnv('LLM_MODEL');

const client = new OpenAI({
  apiKey,
  baseURL,
});

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const spinnerFrames = ['|', '/', '—', '\\'];

async function getAnswer(question: string) {
  let frame = 0;
  const spinner = setInterval(() => {
    process.stdout.write(`\r${spinnerFrames[frame++ % spinnerFrames.length]} Думаю...`);
  }, 120);

  try {
    return await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: question }],
    });
  } finally {
    clearInterval(spinner);
    process.stdout.write('\r\x1b[2K');
  }
}

console.log('Задайте вопрос модели. Для выхода введите /exit.');
process.stdout.write('> ');

for await (const line of readline) {
  const question = line.trim();

  if (question === '/exit') {
    break;
  }

  if (!question) {
    process.stdout.write('> ');
    continue;
  }

  try {
    const completion = await getAnswer(question);
    console.log(completion.choices[0].message.content ?? 'Модель не вернула текстовый ответ.');
  } catch (error) {
    console.error(`Ошибка запроса: ${error instanceof Error ? error.message : String(error)}`);
  }

  process.stdout.write('> ');
}

readline.close();
