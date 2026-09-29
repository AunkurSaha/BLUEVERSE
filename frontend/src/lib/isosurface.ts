export interface IsosurfaceVolume {
  longitudes: number[]
  latitudes: number[]
  depths: number[]
  values: Array<Array<Array<number | null>>>
}

export interface IsosurfaceMesh {
  vertices: number[]
  indices: number[]
}

type Point = [number, number, number]
const tetrahedra = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]] as const
const edges = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]] as const

const interpolate = (a: Point, b: Point, av: number, bv: number, target: number): Point => {
  const fraction = av === bv ? 0.5 : (target - av) / (bv - av)
  return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction, a[2] + (b[2] - a[2]) * fraction]
}

export const validateIsosurfaceVolume = (volume: IsosurfaceVolume, target: number): void => {
  const { longitudes, latitudes, depths, values } = volume
  if (!Number.isFinite(target)) throw new Error('Isosurface target must be finite.')
  if (longitudes.length < 2 || latitudes.length < 2 || depths.length < 2) throw new Error('Isosurface volume requires at least two coordinates per axis.')
  const strictlyMonotonic = (coordinates: number[]) => coordinates.every((value, index) => Number.isFinite(value) && (index === 0 || value !== coordinates[index - 1])) && (coordinates.slice(1).every((value, index) => value > coordinates[index]) || coordinates.slice(1).every((value, index) => value < coordinates[index]))
  if (!strictlyMonotonic(longitudes) || !strictlyMonotonic(latitudes) || !strictlyMonotonic(depths)) throw new Error('Isosurface coordinates must be finite and strictly monotonic.')
  if (values.length !== depths.length || values.some((plane) => plane.length !== latitudes.length || plane.some((row) => row.length !== longitudes.length))) throw new Error('Isosurface values do not match coordinate dimensions.')
}

export const extractIsosurface = (volume: IsosurfaceVolume, target: number): IsosurfaceMesh => {
  validateIsosurfaceVolume(volume, target)
  const vertices: number[] = []
  const indices: number[] = []
  const { longitudes: xs, latitudes: ys, depths: zs, values } = volume
  const addTriangle = (a: Point, b: Point, c: Point) => {
    const base = vertices.length / 3
    vertices.push(...a, ...b, ...c)
    indices.push(base, base + 1, base + 2)
  }

  for (let z = 0; z < zs.length - 1; z += 1) for (let y = 0; y < ys.length - 1; y += 1) for (let x = 0; x < xs.length - 1; x += 1) {
    const points: Point[] = [
      [xs[x], ys[y], zs[z]], [xs[x + 1], ys[y], zs[z]], [xs[x + 1], ys[y + 1], zs[z]], [xs[x], ys[y + 1], zs[z]],
      [xs[x], ys[y], zs[z + 1]], [xs[x + 1], ys[y], zs[z + 1]], [xs[x + 1], ys[y + 1], zs[z + 1]], [xs[x], ys[y + 1], zs[z + 1]],
    ]
    const cubeValues = [values[z]?.[y]?.[x], values[z]?.[y]?.[x + 1], values[z]?.[y + 1]?.[x + 1], values[z]?.[y + 1]?.[x], values[z + 1]?.[y]?.[x], values[z + 1]?.[y]?.[x + 1], values[z + 1]?.[y + 1]?.[x + 1], values[z + 1]?.[y + 1]?.[x]]
    for (const tetrahedron of tetrahedra) {
      const tv = tetrahedron.map((index) => cubeValues[index])
      if (tv.some((value) => value === null || value === undefined || !Number.isFinite(value))) continue
      const intersections: Point[] = []
      for (const [ea, eb] of edges) {
        const av = tv[ea] as number
        const bv = tv[eb] as number
        if ((av < target && bv >= target) || (bv < target && av >= target)) intersections.push(interpolate(points[tetrahedron[ea]], points[tetrahedron[eb]], av, bv, target))
      }
      if (intersections.length === 3) addTriangle(intersections[0], intersections[1], intersections[2])
      else if (intersections.length === 4) {
        addTriangle(intersections[0], intersections[1], intersections[2])
        addTriangle(intersections[0], intersections[2], intersections[3])
      }
    }
  }
  return { vertices, indices }
}

export const canActivateIsosurfaceJob = (jobId: number, activeJobId: number): boolean => jobId === activeJobId
