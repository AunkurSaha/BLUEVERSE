import { useEffect, useRef } from 'react'
import {
  Cartesian3,
  Color,
  ConstantProperty,
  Entity,
  HeightReference,
  NearFarScalar,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from 'cesium'
import type { AlertSeverity, ArgoProfileAlertSummary } from '../../services/alertApi'

interface Props {
  viewer: Viewer | null
  summaries: ArgoProfileAlertSummary[]
  visible: boolean
  selectedProfileId: string | null
  interactive?: boolean
  onSelect: (profileId: string) => void
}

const COLORS: Record<AlertSeverity, Color> = {
  normal: Color.fromCssColorString('#67e8f9'),
  moderate: Color.fromCssColorString('#fbbf24'),
  high: Color.fromCssColorString('#f87171'),
  not_assessable: Color.fromCssColorString('#94a3b8'),
}

const AlertLayer: React.FC<Props> = ({
  viewer,
  summaries,
  visible,
  selectedProfileId,
  interactive = true,
  onSelect,
}) => {
  const entitiesRef = useRef<Map<string, Entity>>(new Map())
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    const entities = entitiesRef.current
    const wanted = new Set(
      visible
        ? summaries
            .filter((summary) => summary.observation_latitude !== null && summary.observation_longitude !== null)
            .map((summary) => summary.profile_id)
        : [],
    )

    for (const [profileId, entity] of entities) {
      if (!wanted.has(profileId)) {
        viewer.entities.remove(entity)
        entities.delete(profileId)
      }
    }

    for (const summary of summaries) {
      if (!wanted.has(summary.profile_id) || entities.has(summary.profile_id)) continue
      if (summary.observation_latitude === null || summary.observation_longitude === null) continue
      const selected = summary.profile_id === selectedProfileId
      const entity = viewer.entities.add({
        id: `alert-${summary.profile_id}`,
        position: Cartesian3.fromDegrees(summary.observation_longitude, summary.observation_latitude),
        point: {
          pixelSize: new ConstantProperty(selected ? 16 : 12),
          color: new ConstantProperty(COLORS[summary.severity]),
          outlineColor: new ConstantProperty(Color.fromCssColorString('#07111f')),
          outlineWidth: new ConstantProperty(selected ? 4 : 3),
          heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
          scaleByDistance: new ConstantProperty(new NearFarScalar(500_000, 1.35, 8_000_000, 0.75)),
          disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY),
        },
      })
      entities.set(summary.profile_id, entity)
    }
  }, [viewer, summaries, visible, selectedProfileId])

  useEffect(() => {
    for (const summary of summaries) {
      const point = entitiesRef.current.get(summary.profile_id)?.point
      if (!point) continue
      const selected = summary.profile_id === selectedProfileId
      point.color = new ConstantProperty(COLORS[summary.severity])
      point.pixelSize = new ConstantProperty(selected ? 16 : 12)
      point.outlineWidth = new ConstantProperty(selected ? 4 : 3)
    }
  }, [summaries, selectedProfileId])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !interactive) return
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
      if (viewer.isDestroyed()) return
      const entity = viewer.scene.pick(movement.position)?.id as Entity | undefined
      const profileId = entity && typeof entity.id === 'string' && entity.id.startsWith('alert-')
        ? entity.id.slice(6)
        : null
      if (profileId) onSelectRef.current(profileId)
    }, ScreenSpaceEventType.LEFT_CLICK)
    return () => handler.destroy()
  }, [viewer, interactive])

  useEffect(() => () => {
    if (!viewer || viewer.isDestroyed()) return
    for (const entity of entitiesRef.current.values()) viewer.entities.remove(entity)
    entitiesRef.current.clear()
  }, [viewer])

  return null
}

export default AlertLayer
