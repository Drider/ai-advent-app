// Polza использует reasoning.effort; один reasoning_effort не отключает рассуждения.
export function createPolzaReasoningFetch(
  baseURL: string,
  fetchImpl: typeof fetch = fetch,
): typeof fetch | undefined {
  const hostname = new URL(baseURL).hostname
  if (hostname !== 'polza.ai' && !hostname.endsWith('.polza.ai')) {
    return undefined
  }

  return (input, init) => {
    if (typeof init?.body !== 'string') {
      return fetchImpl(input, init)
    }

    let body: unknown
    try {
      body = JSON.parse(init.body)
    } catch {
      return fetchImpl(input, init)
    }
    if (!body || typeof body !== 'object' || !('reasoning_effort' in body)) {
      return fetchImpl(input, init)
    }

    const effort = body.reasoning_effort
    if (effort !== 'none' && effort !== 'low' && effort !== 'high' && effort !== 'max') {
      return fetchImpl(input, init)
    }

    return fetchImpl(input, {
      ...init,
      body: JSON.stringify({ ...body, reasoning: { effort } }),
    })
  }
}
