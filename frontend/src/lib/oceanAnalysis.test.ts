import { displayDepth, greatCircleKilometres, hasTemperatureCrossing, isosurfaceCacheKey, sampleTransect, selectIsosurfaceDepthIndexes, targetWithinVolumeRange, transectCacheKey } from './oceanAnalysis.ts'

const fail = (message: string): never => { throw new Error(message) }
const assert = (condition: boolean, message: string): void => { if (!condition) fail(message) }
const depths = Array.from({ length: 47 }, (_, index) => index)
for (const quality of ['low', 'medium', 'high'] as const) {
  const selected = selectIsosurfaceDepthIndexes(depths, quality)
  assert(selected.every((index) => depths.includes(index)), `${quality} uses only selectable source levels`)
}
assert(selectIsosurfaceDepthIndexes(depths, 'low').length === 8, 'low quality count')
assert(selectIsosurfaceDepthIndexes(depths, 'medium').length === 20, 'medium quality count')
assert(selectIsosurfaceDepthIndexes(depths, 'high').length === 47, 'high quality count')
assert(hasTemperatureCrossing([null, 20, 24], 22), 'valid crossing')
assert(!hasTemperatureCrossing([null, null, 24], 22), 'missing data is not fabricated')
assert(displayDepth(100, 10) === -1000, 'vertical display conversion')
assert(greatCircleKilometres([0, 0], [0, 1]) > 111 && greatCircleKilometres([0, 0], [0, 1]) < 112, 'geodesic distance')
assert(sampleTransect([10, 80], [10, 81], 50).length === 50, 'bounded transect samples')
assert(isosurfaceCacheKey('d', 1, 22, 'low', [0, 4]) === 'd-thetao-1-22-low-0,4', 'isosurface cache key')
assert(transectCacheKey('d', 1, [10, 80], [11, 81], 100).includes('nearest_grid_point'), 'transect method cache key')
assert(targetWithinVolumeRange([{ tmin: 18, tmax: 28 }] as never, 22), 'target range')
console.log('ocean analysis tests passed')
