import { createApp, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import sessionRoute from '../server/api/sessions.post'
import { saveChatSession } from '../server/utils/chat-session'

vi.mock('../server/utils/chat-session', () => ({
  saveChatSession: vi.fn(),
}))

const saveSessionMock = vi.mocked(saveChatSession)

// Вызывает серверный маршрут через H3 без открытия сетевого порта.
async function postSession(body: unknown): Promise<Response> {
  const app = createApp()
  app.use('/api/sessions', sessionRoute)

  return toWebHandler(app)(new Request('http://localhost/api/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

beforeEach(() => {
  // Сбрасывает вызовы файлового хранилища между запросами.
  saveSessionMock.mockReset()
})

describe('POST /api/sessions', () => {
  // Пустой диалог не должен попадать в файловое хранилище.
  it('rejects an empty message list', async () => {
    const response = await postSession({ messages: [] })

    expect(response.status).toBe(400)
    expect(saveSessionMock).not.toHaveBeenCalled()
  })

  // После успешной записи маршрут возвращает идентификатор новой записи.
  it('saves valid UI messages and responds with 201', async () => {
    const messages = [{ id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'Привет' }] }]
    const savedSession = { id: 'session-1', savedAt: '2026-11-04T12:00:00.000Z' }
    saveSessionMock.mockResolvedValue(savedSession)

    const response = await postSession({ messages })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(savedSession)
    expect(saveSessionMock).toHaveBeenCalledWith(messages)
  })

  // Ошибка записи возвращается клиенту, чтобы он сохранил текущий диалог.
  it('returns an error when the file cannot be written', async () => {
    saveSessionMock.mockRejectedValue(new Error('Disk is full'))

    const response = await postSession({
      messages: [{ id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'Привет' }] }],
    })

    expect(response.status).toBe(500)
  })
})
