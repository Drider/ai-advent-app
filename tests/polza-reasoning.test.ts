import { describe, expect, it } from 'vitest'
import { createPolzaReasoningFetch } from '../server/utils/polza-reasoning'

describe('createPolzaReasoningFetch', () => {
  it.each(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])('sends Polza reasoning.effort=%s', async (effort) => {
    let sentBody: unknown
    const fakeFetch: typeof fetch = async (_input, init) => {
      sentBody = JSON.parse(String(init?.body))
      return new Response('{}')
    }
    const polzaFetch = createPolzaReasoningFetch('https://polza.ai/api/v1', fakeFetch)

    await polzaFetch?.('https://polza.ai/api/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ model: 'deepseek/deepseek-v4.1-flash', reasoning_effort: effort }),
    })

    expect(sentBody).toEqual({
      model: 'deepseek/deepseek-v4.1-flash',
      reasoning_effort: effort,
      reasoning: { effort },
    })
  })

  it('does not modify requests to other providers', () => {
    expect(createPolzaReasoningFetch('https://api.openai.com/v1')).toBeUndefined()
  })

  it('recognizes Polza subdomains', () => {
    expect(createPolzaReasoningFetch('https://api.polza.ai/v1')).toBeTypeOf('function')
  })
})
