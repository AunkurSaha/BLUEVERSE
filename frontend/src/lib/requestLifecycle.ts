export const PROBE_TIMEOUT_MS = 30_000
export const HISTORICAL_AVAILABILITY_TIMEOUT_MS = 15_000

export class RequestTimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message)
    this.name = 'RequestTimeoutError'
  }
}

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'

export const runWithTimeout = async <T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<T> => {
  const controller = new AbortController()
  const abortFromParent = () => controller.abort(parentSignal?.reason)
  let timedOut = false

  if (parentSignal?.aborted) abortFromParent()
  else parentSignal?.addEventListener('abort', abortFromParent, { once: true })

  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    return await task(controller.signal)
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError()
    throw error
  } finally {
    clearTimeout(timeout)
    parentSignal?.removeEventListener('abort', abortFromParent)
  }
}
