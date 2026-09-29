import { useEffect } from 'react'
import { BoundingSphere, Cartesian2, Cartesian3, Cartographic, Color, ComponentDatatype, Geometry, GeometryAttribute, GeometryAttributes, GeometryInstance, GeometryPipeline, Math as CesiumMath, Material, MaterialAppearance, Primitive, PrimitiveType, ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer } from 'cesium'
import type { IsosurfaceMesh } from '../../lib/isosurface'

export interface IsosurfaceFrame { mesh: IsosurfaceMesh; actualTime: string; target: number; units: string }
export interface IsosurfaceSample { target: number; actualTime: string; latitude: number; longitude: number; realDepth: number; units: string }
interface Props { viewer: Viewer | null; frame: IsosurfaceFrame | null; opacity: number; verticalScale: number; interactive?: boolean; onSample: (sample: IsosurfaceSample | null) => void }

const IsosurfaceLayer: React.FC<Props> = ({ viewer, frame, opacity, verticalScale, interactive = true, onSample }) => {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !frame || frame.mesh.indices.length === 0) return
    const translucency = viewer.scene.globe.translucency
    const previousEnabled = translucency.enabled
    const previousFrontAlpha = translucency.frontFaceAlpha
    const previousBackAlpha = translucency.backFaceAlpha
    translucency.enabled = true
    translucency.frontFaceAlpha = 0.18
    translucency.backFaceAlpha = 0.18
    const positions: number[] = []
    for (let index = 0; index < frame.mesh.vertices.length; index += 3) {
      const point = Cartesian3.fromDegrees(frame.mesh.vertices[index], frame.mesh.vertices[index + 1], -frame.mesh.vertices[index + 2] * verticalScale)
      positions.push(point.x, point.y, point.z)
    }
    const attributes = new GeometryAttributes()
    attributes.position = new GeometryAttribute({ componentDatatype: ComponentDatatype.DOUBLE, componentsPerAttribute: 3, values: new Float64Array(positions) })
    let geometry = new Geometry({
      attributes,
      indices: new Uint32Array(frame.mesh.indices),
      primitiveType: PrimitiveType.TRIANGLES,
      boundingSphere: BoundingSphere.fromVertices(positions),
    })
    geometry = GeometryPipeline.computeNormal(geometry)
    const primitive = viewer.scene.primitives.add(new Primitive({
      geometryInstances: new GeometryInstance({ geometry, id: { kind: 'temperature-isosurface', frame } }),
      appearance: new MaterialAppearance({ material: Material.fromType('Color', { color: Color.fromCssColorString('#f59e0b').withAlpha(opacity) }), translucent: opacity < 1, closed: false, faceForward: true }),
      asynchronous: true,
    }))
    const handler = interactive ? new ScreenSpaceEventHandler(viewer.scene.canvas) : null
    handler?.setInputAction((event: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(event.position)
      if (picked?.id?.kind !== 'temperature-isosurface' || !viewer.scene.pickPositionSupported) { onSample(null); return }
      const position = viewer.scene.pickPosition(event.position)
      if (!position) { onSample(null); return }
      const coordinate = Cartographic.fromCartesian(position)
      onSample({ target: frame.target, actualTime: frame.actualTime, latitude: CesiumMath.toDegrees(coordinate.latitude), longitude: CesiumMath.toDegrees(coordinate.longitude), realDepth: -coordinate.height / verticalScale, units: frame.units })
    }, ScreenSpaceEventType.LEFT_CLICK)
    return () => {
      if (handler && !handler.isDestroyed()) handler.destroy()
      if (!viewer.isDestroyed()) {
        if (viewer.scene.primitives.contains(primitive)) viewer.scene.primitives.remove(primitive)
        translucency.enabled = previousEnabled
        translucency.frontFaceAlpha = previousFrontAlpha
        translucency.backFaceAlpha = previousBackAlpha
      }
    }
  }, [viewer, frame, opacity, verticalScale, interactive, onSample])
  return null
}
export default IsosurfaceLayer
