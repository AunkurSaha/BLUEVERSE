import { canActivateIsosurfaceJob, extractIsosurface, validateIsosurfaceVolume } from './isosurface.ts'
const assert = (value: boolean, message: string) => { if (!value) throw new Error(message) }
const volume = { longitudes: [80, 81], latitudes: [10, 11], depths: [5, 50], values: [[[10, 10], [10, 10]], [[30, 30], [30, 30]]] }
const mesh = extractIsosurface(volume, 20)
assert(mesh.indices.length > 0 && mesh.indices.length % 3 === 0, 'real crossing creates triangles')
assert(mesh.vertices.filter((_, index) => index % 3 === 2).every((depth) => depth === 27.5), 'nonuniform real depth interpolation')
assert(extractIsosurface(volume, 40).indices.length === 0, 'no crossing creates empty mesh')
const missing = structuredClone(volume); missing.values[0][0][0] = null as never
assert(extractIsosurface(missing, 20).indices.length < mesh.indices.length, 'missing tetrahedra are skipped')
assert(canActivateIsosurfaceJob(2, 2) && !canActivateIsosurfaceJob(1, 2), 'stale jobs rejected')
let dimensionError = false
try { validateIsosurfaceVolume({ ...volume, values: volume.values.slice(0, 1) }, 20) } catch { dimensionError = true }
assert(dimensionError, 'coordinate and value dimensions must agree')
console.log('isosurface tests passed')
