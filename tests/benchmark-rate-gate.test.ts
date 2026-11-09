import { afterEach, describe, expect, it, vi } from 'vitest'
import { RateGate } from '../server/utils/benchmark/pool'

afterEach(() => vi.useRealTimers())

describe('benchmark request rate gate', () => {
  it('counts every request start in a rolling minute', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-09T00:00:00Z'))
    const gate = new RateGate(2)

    await gate.acquire()
    await gate.acquire()
    let thirdStarted = false
    const third = gate.acquire().then(() => { thirdStarted = true })

    await vi.advanceTimersByTimeAsync(59_999)
    expect(thirdStarted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await third
    expect(thirdStarted).toBe(true)
  })

  it('extends the pause when a later Retry-After is longer', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-09T00:00:00Z'))
    const gate = new RateGate()
    gate.pause(2_000)
    let started = false
    const request = gate.acquire().then(() => { started = true })

    await vi.advanceTimersByTimeAsync(1_000)
    gate.pause(3_000)
    await vi.advanceTimersByTimeAsync(2_999)
    expect(started).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await request
    expect(started).toBe(true)
  })
})
