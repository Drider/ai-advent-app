function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class RateGate {
  private pauseUntil = 0
  private starts: number[] = []

  constructor(private readonly requestsPerMinute = 0) {}

  async wait(): Promise<void> {
    while (Date.now() < this.pauseUntil) {
      await sleep(this.pauseUntil - Date.now())
    }
  }

  async acquire(): Promise<void> {
    while (true) {
      await this.wait()
      const now = Date.now()
      if (now < this.pauseUntil) continue
      if (this.requestsPerMinute === 0) return
      this.starts = this.starts.filter(start => start > now - 60_000)
      const oldest = this.starts[0]
      if (this.starts.length < this.requestsPerMinute) {
        this.starts.push(now)
        return
      }
      await sleep(Math.max(1, oldest! + 60_000 - now))
    }
  }

  pause(delayMs: number): void {
    this.pauseUntil = Math.max(this.pauseUntil, Date.now() + delayMs)
  }
}

export interface PoolJob<T> {
  key: string
  run: (inflightAtStart: number) => Promise<T>
}

export async function runPool<T>(
  jobs: PoolJob<T>[],
  concurrency: number,
  gate: RateGate,
  onResult: (key: string, result: T) => void,
  onError: (key: string, err: unknown) => void,
  shouldStop: () => boolean,
): Promise<void> {
  let inflight = 0
  let jobIndex = 0

  async function runNext(): Promise<void> {
    while (jobIndex < jobs.length && !shouldStop()) {
      await gate.wait()
      if (shouldStop()) break

      const job = jobs[jobIndex++]
      if (!job) break
      inflight++
      const capturedInflight = inflight - 1

      runJob(job, capturedInflight).finally(() => {
        inflight--
        runNext().catch(() => {})
      })

      if (inflight >= concurrency) return
    }
  }

  async function runJob(job: PoolJob<T>, inflightAtStart: number): Promise<void> {
    try {
      const result = await job.run(inflightAtStart)
      onResult(job.key, result)
    } catch (err) {
      onError(job.key, err)
    }
  }

  // Kick off initial workers up to concurrency
  const starters: Promise<void>[] = []
  for (let i = 0; i < concurrency; i++) {
    starters.push(runNext())
  }
  await Promise.all(starters)

  // Wait for all inflight to finish
  while (inflight > 0) {
    await sleep(100)
  }
}
