import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { appendRunLogEntry, type RunLogEntry } from '../server/utils/run-logger'

const temporaryDirectories: string[] = []

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ai-app-run-log-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, {
    recursive: true,
    force: true,
  })))
})

function createEntry(level: RunLogEntry['level']): RunLogEntry {
  return {
    runId: '2026-11-04T12:00:00.000Z',
    level,
    question: 'Сколько будет два плюс два?',
    answer: 'Четыре.',
    startedAt: '2026-11-04T12:00:01.000Z',
    completedAt: '2026-11-04T12:00:02.250Z',
    durationMs: 1250,
    usage: {
      inputTokens: 10,
      inputTokenDetails: { noCacheTokens: 8, cacheReadTokens: 2, cacheWriteTokens: 0 },
      outputTokens: 3,
      outputTokenDetails: { textTokens: 2, reasoningTokens: 1 },
      totalTokens: 13,
    },
    request: {
      model: 'test-model',
      messages: [{ role: 'user', content: 'Сколько будет два плюс два?' }],
      maxOutputTokens: 100,
    },
    response: {
      finishReason: 'stop',
      rawFinishReason: 'stop',
      id: 'response-1',
      modelId: 'test-model',
    },
    rawResponse: [{ choices: [{ delta: { content: 'Четыре.' } }] }],
  }
}

describe('appendRunLogEntry', () => {
  it('writes a basic run log with an ISO timestamp in its filename', async () => {
    const directory = await createTemporaryDirectory()

    await appendRunLogEntry(createEntry('basic'), directory)

    const files = await readdir(directory)
    const log = JSON.parse(await readFile(join(directory, files[0]!), 'utf8'))

    expect(files).toEqual(['run-2026-11-04T12:00:00.000Z.json'])
    expect(log).toMatchObject({
      runId: '2026-11-04T12:00:00.000Z',
      level: 'basic',
      requests: [{
        question: 'Сколько будет два плюс два?',
        answer: 'Четыре.',
        usage: createEntry('basic').usage,
        durationMs: 1250,
      }],
    })
    expect(log.requests[0].request).toBeUndefined()
    expect(log.requests[0].rawResponse).toBeUndefined()
  })

  it('keeps detailed request data and raw provider chunks at their levels', async () => {
    const directory = await createTemporaryDirectory()

    await appendRunLogEntry(createEntry('raw'), directory)

    const files = await readdir(directory)
    const log = JSON.parse(await readFile(join(directory, files[0]!), 'utf8'))

    expect(log.level).toBe('raw')
    expect(log.requests[0].request).toEqual(createEntry('raw').request)
    expect(log.requests[0].response).toEqual(createEntry('raw').response)
    expect(log.requests[0].rawResponse).toEqual(createEntry('raw').rawResponse)
  })

  it('appends multiple requests to the same run file', async () => {
    const directory = await createTemporaryDirectory()
    const first = createEntry('basic')
    const second = { ...createEntry('basic'), question: 'А три плюс три?', answer: 'Шесть.' }

    await appendRunLogEntry(first, directory)
    await appendRunLogEntry(second, directory)

    const files = await readdir(directory)
    const log = JSON.parse(await readFile(join(directory, files[0]!), 'utf8'))
    expect(files).toHaveLength(1)
    expect(log.requests).toHaveLength(2)
  })

  it('does not write a file when logging is disabled', async () => {
    const directory = await createTemporaryDirectory()

    await appendRunLogEntry(createEntry('off'), directory)

    expect(await readdir(directory)).toEqual([])
  })
})
