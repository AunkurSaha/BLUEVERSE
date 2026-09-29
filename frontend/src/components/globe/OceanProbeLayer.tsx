import { Cartesian2, Cartesian3, Cartographic, Color, Math as CesiumMath, ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer } from 'cesium'
import { useEffect } from 'react'
import type { ProbeLocation } from '../../lib/oceanProbe'
import { pointInDomain, type ModelDomain } from '../../lib/transect'

interface Props {
  viewer: Viewer | null
  active: boolean
  location: ProbeLocation | null
  domain: ModelDomain | null
  onSelect: (location: ProbeLocation) => void
  onError: (message: string) => void
}

export default function OceanProbeLayer({ viewer, active, location, domain, onSelect, onError }: Props) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !location) return
    const id = 'ocean-probe-marker'
    viewer.entities.add({
      id,
      position: Cartesian3.fromDegrees(location.longitude, location.latitude),
      point: { pixelSize: 11, color: Color.CYAN, outlineColor: Color.BLACK, outlineWidth: 2 },
    })
    return () => { if (!viewer.isDestroyed()) viewer.entities.removeById(id) }
  }, [viewer, location])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !active) return
    const previousCursor = viewer.canvas.style.cursor
    viewer.canvas.style.cursor = 'crosshair'
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((event: { position: Cartesian2 }) => {
      if (viewer.isDestroyed()) return
      const cartesian = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid)
      if (!cartesian || !domain) { onError('No registered model coverage at this location.'); return }
      const cartographic = Cartographic.fromCartesian(cartesian)
      const selected = { latitude: CesiumMath.toDegrees(cartographic.latitude), longitude: CesiumMath.toDegrees(cartographic.longitude) }
      if (!pointInDomain(selected, domain)) { onError('No registered model coverage at this location.'); return }
      onSelect(selected)
    }, ScreenSpaceEventType.LEFT_CLICK)
    return () => {
      if (!handler.isDestroyed()) handler.destroy()
      if (!viewer.isDestroyed()) viewer.canvas.style.cursor = previousCursor
    }
  }, [viewer, active, domain, onSelect, onError])

  return null
}
