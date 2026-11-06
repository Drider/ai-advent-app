function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class RateGate {
  private gated: Promise<void> | null = null

  async wait(): Promise<void> {
    if (this.gated) await this.gated
  }

  pause(delayMs: number): void {
    if (this.gated) return
    this.gated = sleep(delayMs).then(() => {
      this.gated = null
    })
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
