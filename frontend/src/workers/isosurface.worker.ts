import { extractIsosurface, type IsosurfaceVolume } from '../lib/isosurface.ts'

interface Request { jobId: number; volume: IsosurfaceVolume; target: number }
const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null
  postMessage: (message: unknown) => void
}
workerScope.onmessage = (event: MessageEvent<Request>) => {
  const { jobId, volume, target } = event.data
  try {
    const mesh = extractIsosurface(volume, target)
    workerScope.postMessage({ jobId, mesh })
  } catch (error) {
    workerScope.postMessage({ jobId, error: error instanceof Error ? error.message : 'Mesh generation failed.' })
  }
}
