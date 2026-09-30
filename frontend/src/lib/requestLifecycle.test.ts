import { isAbortError, RequestTimeoutError, runWithTimeout } from './requestLifecycle.ts'

const assert = (value: boolean, message: string) => { if (!value) throw new Error(message) }

const success = await runWithTimeout(async () => 'loaded', 50)
assert(success === 'loaded', 'successful request resolves before timeout')

let timedOut = false
try {
  await runWithTimeout(
    (signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })),
    5,
  )
} catch (error) {
  timedOut = error instanceof RequestTimeoutError
}
assert(timedOut, 'request timeout has a distinct terminal state')

const parent = new AbortController()
const cancelled = runWithTimeout(
  (signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })),
  100,
  parent.signal,
)
parent.abort()
let aborted = false
try { await cancelled } catch (error) { aborted = isAbortError(error) }
assert(aborted, 'parent cancellation aborts the pending request')

let activeGeneration = 1
let visibleResult = ''
const settle = (generation: number, value: string) => {
  if (generation === activeGeneration) visibleResult = value
}
settle(1, 'point A')
activeGeneration = 2
settle(2, 'point B')
settle(1, 'late point A')
assert(visibleResult === 'point B', 'newer probe result wins over a stale response')

console.log('request lifecycle tests passed')
