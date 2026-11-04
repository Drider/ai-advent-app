import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { ChatMessage } from '../shared/types/chat'
import { saveChatSession } from '../server/utils/chat-session'

const temporaryDirectories: string[] = []

// Создаёт отдельную временную папку для каждого проверяемого архива.
async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ai-app-chat-session-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  // Удаляет только папки, созданные текущими тестами.
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, {
    recursive: true,
    force: true,
  })))
})

describe('saveChatSession', () => {
  // Сохраняет весь диалог вместе с метаданными ответа модели.
  it('writes all messages and metadata into a JSON file', async () => {
    const directory = await createTemporaryDirectory()
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'Привет' }] },
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Здравствуйте' }],
        metadata: { durationMs: 1250, usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 } },
      },
    ]

    const result = await saveChatSession(messages, directory)
    const files = await readdir(directory)
    const archive = JSON.parse(await readFile(join(directory, files[0]!), 'utf8'))

    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/\.json$/)
    expect(archive).toEqual({ ...result, messages })
  })

  // Каждая новая сессия получает собственный файл без перезаписи прежнего.
  it('creates a separate file for each saved session', async () => {
    const directory = await createTemporaryDirectory()
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'Привет' }] },
    ]

    await saveChatSession(messages, directory)
    await saveChatSession(messages, directory)

    expect(await readdir(directory)).toHaveLength(2)
  })

  // Пустой диалог не создаёт архив даже при прямом вызове хранилища.
  it('rejects an empty session without creating a file', async () => {
    const directory = await createTemporaryDirectory()

    await expect(saveChatSession([], directory)).rejects.toThrow('Cannot save an empty chat session')
    expect(await readdir(directory)).toEqual([])
  })
})
