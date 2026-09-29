import { Cartesian2, Cartesian3, Cartographic, Color, Math as CesiumMath, ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer } from 'cesium'
import { useEffect } from 'react'
import { pointInDomain, type GeoPoint, type ModelDomain } from '../../lib/transect'

interface Props { viewer: Viewer | null; start: GeoPoint | null; end: GeoPoint | null; drawMode: boolean; domain: ModelDomain | null; onPoint: (point: GeoPoint) => void; onError: (message: string) => void }

export default function TransectLayer({ viewer, start, end, drawMode, domain, onPoint, onError }: Props) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    const ids: string[] = []
    if (start) { viewer.entities.add({ id: 'transect-start', position: Cartesian3.fromDegrees(start.longitude, start.latitude), point: { pixelSize: 9, color: Color.LIME, outlineColor: Color.BLACK, outlineWidth: 1 } }); ids.push('transect-start') }
    if (end) { viewer.entities.add({ id: 'transect-end', position: Cartesian3.fromDegrees(end.longitude, end.latitude), point: { pixelSize: 9, color: Color.YELLOW, outlineColor: Color.BLACK, outlineWidth: 1 } }); ids.push('transect-end') }
    if (start && end) { viewer.entities.add({ id: 'transect-line', polyline: { positions: Cartesian3.fromDegreesArray([start.longitude, start.latitude, end.longitude, end.latitude]), width: 3, material: Color.LIME.withAlpha(0.9), clampToGround: true } }); ids.push('transect-line') }
    return () => { if (!viewer.isDestroyed()) ids.forEach((id) => viewer.entities.removeById(id)) }
  }, [viewer, start, end])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !drawMode) return
    const previousCursor = viewer.canvas.style.cursor
    viewer.canvas.style.cursor = 'crosshair'
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((event: { position: Cartesian2 }) => {
      if (viewer.isDestroyed()) return
      const position = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid)
      if (!position || !domain) { onError('Selected point is outside the model domain.'); return }
      const coordinate = Cartographic.fromCartesian(position)
      const point = { latitude: CesiumMath.toDegrees(coordinate.latitude), longitude: CesiumMath.toDegrees(coordinate.longitude) }
      if (!pointInDomain(point, domain)) { onError('Selected point is outside the model domain.'); return }
      onPoint(point)
    }, ScreenSpaceEventType.LEFT_CLICK)
    return () => { if (!handler.isDestroyed()) handler.destroy(); if (!viewer.isDestroyed()) viewer.canvas.style.cursor = previousCursor }
  }, [viewer, drawMode, domain, onPoint, onError])
  return null
}
