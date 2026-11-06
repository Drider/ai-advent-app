import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { subscribe, getRunState } from '../../../utils/benchmark/runner'

export default defineEventHandler((event) => {
  const runId = getRouterParam(event, 'runId')
  if (!runId) throw createError({ statusCode: 400, statusMessage: 'runId required' })

  const state = getRunState(runId)
  if (!state) throw createError({ statusCode: 404, statusMessage: 'Run not found' })

  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const res = event.node.res

  function send(kind: string, payload: unknown): void {
    const data = JSON.stringify({ kind, payload })
    res.write(`data: ${data}\n\n`)
  }

  // Send current progress immediately
  send('progress', state.progress)

  if (state.status !== 'running') {
    send('done', { status: state.status })
    res.end()
    return
  }

  const unsubscribe = subscribe(runId, (e) => {
    send(e.kind, e.payload)
    if (e.kind === 'done' || e.kind === 'error') {
      res.end()
    }
  })

  event.node.req.on('close', () => {
    unsubscribe?.()
  })

  // Keep connection alive with heartbeats
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 15000)

  event.node.req.on('close', () => {
    clearInterval(heartbeat)
  })
})
