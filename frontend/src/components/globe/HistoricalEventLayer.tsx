import { useEffect, useRef } from 'react'
import {
  Cartesian3,
  Color,
  ConstantProperty,
  CustomDataSource,
  Entity,
  HeightReference,
  NearFarScalar,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from 'cesium'
import { createIdempotentCleanup, historicalEventEntityId, parseHistoricalEventEntityId } from '../../lib/historicalEvents'
import type { HistoricalEventTrack } from '../../services/eventApi'

interface Props {
  viewer: Viewer | null
  track: HistoricalEventTrack | null
  visible: boolean
  selectedPointIndex: number
  interactive?: boolean
  onSelect: (index: number) => void
}

export default function HistoricalEventLayer({ viewer, track, visible, selectedPointIndex, interactive = true, onSelect }: Props) {
  const sourceRef = useRef<CustomDataSource | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !track || !visible) return

    const source = new CustomDataSource(`historical-event-${track.event_id}`)
    sourceRef.current = source
    const positions = track.points.map((point) => Cartesian3.fromDegrees(point.longitude, point.latitude, 2500))
    source.entities.add({
      id: `historical-event-${track.event_id}-track`,
      name: `${track.event_id} best track`,
      polyline: { positions, width: 2.5, material: Color.fromCssColorString('#fbbf24').withAlpha(0.9) },
    })
    track.points.forEach((point, index) => {
      const endpoint = index === 0 || index === track.points.length - 1
      source.entities.add({
        id: historicalEventEntityId(track.event_id, index),
        name: `Historical track point ${index + 1}`,
        position: positions[index],
        point: {
          pixelSize: new ConstantProperty(endpoint ? 9 : 6),
          color: new ConstantProperty(endpoint ? Color.WHITE : Color.fromCssColorString('#fbbf24')),
          outlineColor: new ConstantProperty(Color.fromCssColorString('#07111f')),
          outlineWidth: new ConstantProperty(2),
          heightReference: new ConstantProperty(HeightReference.NONE),
          scaleByDistance: new ConstantProperty(new NearFarScalar(500_000, 1.25, 8_000_000, 0.8)),
          disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY),
        },
      })
    })
    let disposed = false
    void viewer.dataSources.add(source).then(() => {
      if (disposed && !viewer.isDestroyed() && viewer.dataSources.contains(source)) {
        viewer.dataSources.remove(source, true)
      }
    })
    viewer.camera.flyTo({
      destination: Rectangle.fromDegrees(track.bounds.west, track.bounds.south, track.bounds.east, track.bounds.north),
      duration: 1.2,
    })

    const handler = interactive ? new ScreenSpaceEventHandler(viewer.scene.canvas) : null
    handler?.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
      if (viewer.isDestroyed()) return
      const entity = viewer.scene.pick(movement.position)?.id as Entity | undefined
      const index = parseHistoricalEventEntityId(track.event_id, entity?.id)
      if (index !== null && index < track.points.length) onSelectRef.current(index)
    }, ScreenSpaceEventType.LEFT_CLICK)

    return createIdempotentCleanup(() => {
      disposed = true
      handler?.destroy()
      if (!viewer.isDestroyed() && viewer.dataSources.contains(source)) viewer.dataSources.remove(source, true)
      if (sourceRef.current === source) sourceRef.current = null
    })
  }, [viewer, track, visible, interactive])

  useEffect(() => {
    const source = sourceRef.current
    if (!source || !track) return
    track.points.forEach((_, index) => {
      const entity = source.entities.getById(historicalEventEntityId(track.event_id, index))
      if (!entity?.point) return
      const selected = index === selectedPointIndex
      const endpoint = index === 0 || index === track.points.length - 1
      entity.point.pixelSize = new ConstantProperty(selected ? 14 : endpoint ? 9 : 6)
      entity.point.color = new ConstantProperty(selected ? Color.fromCssColorString('#fb7185') : endpoint ? Color.WHITE : Color.fromCssColorString('#fbbf24'))
      entity.point.outlineWidth = new ConstantProperty(selected ? 3 : 2)
    })
  }, [track, selectedPointIndex])

  return null
}
