import { useEffect } from 'react'
import { Cartesian2, Cartographic, Color, Entity, ImageMaterialProperty, Math as CesiumMath, Rectangle, ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer } from 'cesium'

import {
  displayHeightForDepth,
  type SubsurfaceFrame, type SubsurfaceSample,
} from '../../lib/subsurfaceFrame'

interface SubsurfaceLayerProps {
  viewer: Viewer | null
  frame: SubsurfaceFrame | null
  verticalExaggeration: number
  opacity: number
  interactive?: boolean
  onSample: (sample: SubsurfaceSample | null) => void
}

const SubsurfaceLayer: React.FC<SubsurfaceLayerProps> = ({
  viewer,
  frame,
  verticalExaggeration,
  opacity,
  interactive = true,
  onSample,
}) => {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !frame) return

    const entities: Entity[] = []
    const entityLayers = new Map<Entity, (typeof frame.layers)[number]>()
    const translucency = viewer.scene.globe.translucency
    const previousEnabled = translucency.enabled
    const previousFrontAlpha = translucency.frontFaceAlpha
    const previousBackAlpha = translucency.backFaceAlpha
    translucency.enabled = true
    translucency.frontFaceAlpha = 0.18
    translucency.backFaceAlpha = 0.18

    for (const layer of frame.layers) {
      const { extent } = layer.prepared
      const entity = viewer.entities.add({
        rectangle: {
          coordinates: Rectangle.fromDegrees(extent.west, extent.south, extent.east, extent.north),
          height: displayHeightForDepth(layer.realDepth, verticalExaggeration),
          material: new ImageMaterialProperty({
            image: layer.prepared.imageDataUrl,
            transparent: true,
            color: Color.WHITE.withAlpha(opacity),
          }),
        },
      })
      entities.push(entity)
      entityLayers.set(entity, layer)
    }

    const handler = interactive ? new ScreenSpaceEventHandler(viewer.scene.canvas) : null
    handler?.setInputAction((event: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(event.position)
      const layer = picked?.id instanceof Entity ? entityLayers.get(picked.id) : undefined
      const position = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid)
      if (!layer || !position) {
        onSample(null)
        return
      }
      const cartographic = Cartographic.fromCartesian(position)
      const latitude = CesiumMath.toDegrees(cartographic.latitude)
      const longitude = CesiumMath.toDegrees(cartographic.longitude)
      const nearestIndex = (values: number[], target: number): number => values.reduce(
        (best, value, index) => Math.abs(value - target) < Math.abs(values[best] - target) ? index : best,
        0,
      )
      const slice = layer.prepared.slice
      const latitudeIndex = nearestIndex(slice.lat_vals, latitude)
      const longitudeIndex = nearestIndex(slice.lon_vals, longitude)
      onSample({
        variable: slice.var_name,
        actualTime: slice.actual_time,
        realDepth: layer.realDepth,
        depthUnits: layer.depthUnits,
        latitude: slice.lat_vals[latitudeIndex],
        longitude: slice.lon_vals[longitudeIndex],
        value: slice.slice_data[latitudeIndex]?.[longitudeIndex] ?? null,
        units: slice.var_units,
      })
    }, ScreenSpaceEventType.LEFT_CLICK)

    return () => {
      if (handler && !handler.isDestroyed()) handler.destroy()
      if (!viewer.isDestroyed()) {
        for (const entity of entities) viewer.entities.remove(entity)
        translucency.enabled = previousEnabled
        translucency.frontFaceAlpha = previousFrontAlpha
        translucency.backFaceAlpha = previousBackAlpha
      }
    }
  }, [viewer, frame, verticalExaggeration, opacity, interactive, onSample])

  return null
}

export default SubsurfaceLayer
