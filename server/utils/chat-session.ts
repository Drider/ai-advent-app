import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ChatMessage } from '../../shared/types/chat'

export interface SavedChatSession {
  id: string
  savedAt: string
}

// Сохраняет завершённый диалог в отдельный JSON-файл на серверном диске.
export async function saveChatSession(
  messages: ChatMessage[],
  directory = join(process.cwd(), 'data', 'chat-sessions'),
): Promise<SavedChatSession> {
  if (messages.length === 0) {
    throw new Error('Cannot save an empty chat session')
  }

  const id = randomUUID()
  const savedAt = new Date().toISOString()
  const fileName = `${savedAt.replace(/[:.]/g, '-')}-${id}.json`

  // Создаёт папку при первом сохранении и не перезаписывает существующий архив.
  await mkdir(directory, { recursive: true })
  await writeFile(
    join(directory, fileName),
    `${JSON.stringify({ id, savedAt, messages }, null, 2)}\n`,
    { encoding: 'utf8', flag: 'wx' },
  )

  return { id, savedAt }
}
