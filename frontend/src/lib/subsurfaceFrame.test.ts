import {
  SUBSURFACE_LAYER_COUNTS,
  canActivateSubsurfaceFrame,
  displayHeightForDepth,
  selectRepresentativeDepthIndexes,
  sharedFrameColorScale,
  sliceCacheKey,
  supportsSubsurfaceVariable,
} from './subsurfaceFrame.ts'

const fail = (message: string): never => { throw new Error(message) }
const assert = (condition: boolean, message: string): void => { if (!condition) fail(message) }
const equal = (actual: unknown, expected: unknown, label: string): void => {
  if (!Object.is(actual, expected)) fail(`${label}: expected ${String(expected)}, got ${String(actual)}`)
}

const selectable = Array.from({ length: 47 }, (_, index) => index)
for (const count of SUBSURFACE_LAYER_COUNTS) {
  const selected = selectRepresentativeDepthIndexes(selectable, count)
  equal(selected.length, count, `${count} layer count`)
  assert(selected.every((index) => selectable.includes(index)), `${count} sampling uses only selectable indexes`)
  equal(selected[0], 0, `${count} sampling includes shallowest source level`)
  equal(selected[selected.length - 1], 46, `${count} sampling includes deepest source level`)
}

equal(displayHeightForDepth(4833.291015625, 10), -48332.91015625, 'display height preserves real depth')
equal(displayHeightForDepth(100, 1), -100, 'one-times vertical scale')
equal(sliceCacheKey('dataset', 'thetao', 3, 14), 'dataset-thetao-3-14', 'cache key identity')

const sharedScale = sharedFrameColorScale([
  { tmin: 10, tmax: 20 },
  { tmin: 8, tmax: 18 },
] as Parameters<typeof sharedFrameColorScale>[0])
equal(sharedScale.min, 8, 'shared frame scale minimum')
equal(sharedScale.max, 20, 'shared frame scale maximum')

assert(supportsSubsurfaceVariable('thetao'), 'temperature supports 3D')
assert(!supportsSubsurfaceVariable('so'), 'salinity is gated from 3D')
assert(!supportsSubsurfaceVariable('currents'), 'currents are gated from 3D')
assert(canActivateSubsurfaceFrame(4, 4, false), 'current complete frame activates')
assert(!canActivateSubsurfaceFrame(3, 4, false), 'stale frame is rejected')
assert(!canActivateSubsurfaceFrame(4, 4, true), 'aborted frame is rejected')

console.log('subsurface frame tests passed')
