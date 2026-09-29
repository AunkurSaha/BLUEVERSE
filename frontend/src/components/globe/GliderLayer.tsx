import { Cartesian3, Color, ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer } from 'cesium'
import { useEffect, useRef } from 'react'
import type { GliderPoint } from '../../services/gliderApi'

interface Props { viewer: Viewer | null; points: GliderPoint[]; visible: boolean; selected: number | null; onSelect: (index: number) => void; onHover: (point: GliderPoint | null, position?: { x: number; y: number }) => void; interactive?: boolean }

/** Owns only Glider entities and its effect-local input handler, never the Viewer. */
export default function GliderLayer({ viewer, points, visible, selected, onSelect, onHover, interactive = true }: Props) {
  const selectRef = useRef(onSelect)
  const hoverRef = useRef(onHover)
  selectRef.current = onSelect
  hoverRef.current = onHover

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !visible || points.length === 0) return
    const ids = ['glider-track', ...points.map((point) => `glider-${point.profile_index}`)]
    viewer.entities.add({ id: ids[0], polyline: { positions: points.map((point) => Cartesian3.fromDegrees(point.longitude, point.latitude, 0)), width: 2, material: Color.ORANGE.withAlpha(0.9) } })
    points.forEach((point) => viewer.entities.add({ id: `glider-${point.profile_index}`, position: Cartesian3.fromDegrees(point.longitude, point.latitude, 0), point: { pixelSize: point.profile_index === selected ? 10 : 4, color: point.profile_index === selected ? Color.YELLOW : Color.ORANGE, outlineColor: Color.BLACK, outlineWidth: 1 } }))
    return () => {
      if (viewer.isDestroyed()) return
      ids.forEach((id) => viewer.entities.removeById(id))
    }
  }, [viewer, points, visible, selected])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !interactive) return
    // This handler is intentionally effect-local. StrictMode cleanup destroys it,
    // and no later effect ever reuses or destroys that instance again.
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
      if (viewer.isDestroyed()) return
      const entity = viewer.scene.pick(movement.position)?.id
      const id = typeof entity?.id === 'string' ? entity.id : ''
      if (id.startsWith('glider-')) selectRef.current(Number(id.slice(7)))
    }, ScreenSpaceEventType.LEFT_CLICK)
    handler.setInputAction((movement: ScreenSpaceEventHandler.MotionEvent) => {
      if (viewer.isDestroyed()) return
      const entity = viewer.scene.pick(movement.endPosition)?.id
      const id = typeof entity?.id === 'string' ? entity.id : ''
      const point = id.startsWith('glider-') ? points.find((item) => item.profile_index === Number(id.slice(7))) ?? null : null
      hoverRef.current(point, point ? { x: movement.endPosition.x, y: movement.endPosition.y } : undefined)
    }, ScreenSpaceEventType.MOUSE_MOVE)
    return () => { if (!handler.isDestroyed()) handler.destroy() }
  }, [viewer, points, interactive])

  return null
}
