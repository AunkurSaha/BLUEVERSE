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
import type { ArgoProfileSummary } from '../../services/argoApi'

interface ArgoLayerProps {
  viewer: Viewer | null
  profiles: ArgoProfileSummary[]
  visible: boolean
  selectedProfileId: string | null
  onSelect: (profileId: string) => void
  onHover: (profile: ArgoProfileSummary | null, position: { x: number; y: number } | null) => void
  interactive?: boolean
}

const MARKER_COLOR = Color.fromCssColorString('#22d3ee')
const MARKER_OUTLINE = Color.fromCssColorString('#062a33')
const SELECTED_COLOR = Color.fromCssColorString('#f59e0b')

/**
 * Renders ARGO profile markers as Cesium point entities inside the existing
 * viewer. The viewer is never recreated; entities are added/removed only
 * when the inputs change.
 */
const ArgoLayer: React.FC<ArgoLayerProps> = ({
  viewer,
  profiles,
  visible,
  selectedProfileId,
  onSelect,
  onHover,
  interactive = true,
}) => {
  const entitiesRef = useRef<Map<string, Entity>>(new Map())
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null)
  const profilesByIdRef = useRef<Map<string, ArgoProfileSummary>>(new Map())
  const selectedRef = useRef<string | null>(selectedProfileId)
  const onSelectRef = useRef(onSelect)
  const onHoverRef = useRef(onHover)

  selectedRef.current = selectedProfileId
  onSelectRef.current = onSelect
  onHoverRef.current = onHover

  // Sync entities with the profile list.
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    const entities = entitiesRef.current
    profilesByIdRef.current = new Map(profiles.map((p) => [p.profile_id, p]))

    const wanted = new Set(
      visible
        ? profiles
            .filter((p) => p.latitude !== null && p.longitude !== null)
            .map((p) => p.profile_id)
        : [],
    )

    // Remove entities no longer needed.
    for (const [id, entity] of entities) {
      if (!wanted.has(id)) {
        viewer.entities.remove(entity)
        entities.delete(id)
      }
    }

    // Add missing entities.
    for (const profile of profiles) {
      if (!wanted.has(profile.profile_id) || entities.has(profile.profile_id)) continue
      if (profile.latitude === null || profile.longitude === null) continue
      const entity = viewer.entities.add({
        id: `argo-${profile.profile_id}`,
        position: Cartesian3.fromDegrees(profile.longitude, profile.latitude),
        point: {
          pixelSize: new ConstantProperty(9),
          color: new ConstantProperty(MARKER_COLOR),
          outlineColor: new ConstantProperty(MARKER_OUTLINE),
          outlineWidth: new ConstantProperty(2),
          heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
          scaleByDistance: new ConstantProperty(
            new NearFarScalar(500_000, 1.4, 8_000_000, 0.7),
          ),
          disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY),
        },
      })
      entities.set(profile.profile_id, entity)
    }
  }, [viewer, profiles, visible])

  // Reflect selection state on marker styling.
  useEffect(() => {
    for (const [id, entity] of entitiesRef.current) {
      const point = entity.point
      if (!point) continue
      const isSelected = id === selectedProfileId
      point.color = new ConstantProperty(isSelected ? SELECTED_COLOR : MARKER_COLOR)
      point.pixelSize = new ConstantProperty(isSelected ? 12 : 9)
      point.outlineWidth = new ConstantProperty(isSelected ? 3 : 2)
    }
  }, [selectedProfileId, profiles, visible])

  // Hover + click interaction.
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !interactive) return
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    handlerRef.current = handler

    handler.setInputAction((movement: ScreenSpaceEventHandler.MotionEvent) => {
      if (viewer.isDestroyed()) return
      const picked = viewer.scene.pick(movement.endPosition)
      const entity = picked?.id as Entity | undefined
      const profileId =
        entity && typeof entity.id === 'string' && entity.id.startsWith('argo-')
          ? entity.id.slice(5)
          : null
      const profile = profileId ? profilesByIdRef.current.get(profileId) ?? null : null
      viewer.canvas.style.cursor = profile ? 'pointer' : ''
      onHoverRef.current(
        profile,
        profile ? { x: movement.endPosition.x, y: movement.endPosition.y } : null,
      )
    }, ScreenSpaceEventType.MOUSE_MOVE)

    handler.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
      if (viewer.isDestroyed()) return
      const picked = viewer.scene.pick(movement.position)
      const entity = picked?.id as Entity | undefined
      const profileId =
        entity && typeof entity.id === 'string' && entity.id.startsWith('argo-')
          ? entity.id.slice(5)
          : null
      if (profileId) {
        onSelectRef.current(profileId)
      }
    }, ScreenSpaceEventType.LEFT_CLICK)

    return () => {
      handler.destroy()
      handlerRef.current = null
    }
  }, [viewer, interactive])

  // Remove all entities on unmount.
  useEffect(() => {
    return () => {
      if (!viewer || viewer.isDestroyed()) return
      for (const entity of entitiesRef.current.values()) {
        viewer.entities.remove(entity)
      }
      entitiesRef.current.clear()
    }
  }, [viewer])

  return null
}

export default ArgoLayer
