import { Cartesian2, Cartesian3, Color, LabelStyle, Math as CesiumMath, VerticalOrigin, Viewer } from 'cesium'
import { useEffect } from 'react'
import { isValidCameraPreset, isValidRegionBounds } from '../../lib/regions'
import type { GeographicExtent } from '../../lib/temperatureSlice'
import type { RegionSummary } from '../../services/regionApi'

interface Props {
  viewer: Viewer | null
  region: RegionSummary | null
  modelBounds: GeographicExtent | null
}

const boundaryPositions = (bounds: GeographicExtent): Cartesian3[] => {
  const { west, south, east, north } = bounds
  return Cartesian3.fromDegreesArray([
    west, south,
    east, south,
    east, north,
    west, north,
    west, south,
  ])
}

export default function StudyRegionLayer({ viewer, region, modelBounds }: Props) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !region || !isValidRegionBounds(region.bounds) || !isValidCameraPreset(region)) return

    const boundaryId = 'study-region-boundary'
    const labelId = 'study-region-label'
    const outlineColor = region.data_status === 'DATA_BACKED' ? Color.CYAN.withAlpha(0.85) : Color.LIGHTSLATEGRAY.withAlpha(0.9)

    viewer.entities.removeById(boundaryId)
    viewer.entities.removeById(labelId)
    viewer.entities.add({
      id: boundaryId,
      name: 'Study region extent',
      polyline: {
        positions: boundaryPositions(region.bounds),
        width: 2,
        material: outlineColor,
        clampToGround: true,
      },
    })
    viewer.entities.add({
      id: labelId,
      name: 'Study region extent',
      position: Cartesian3.fromDegrees((region.bounds.west + region.bounds.east) / 2, region.bounds.north),
      label: {
        text: 'Study region extent',
        font: '12px sans-serif',
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK.withAlpha(0.9),
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(region.camera.longitude, region.camera.latitude, region.camera.height),
      orientation: {
        heading: CesiumMath.toRadians(region.camera.heading),
        pitch: CesiumMath.toRadians(region.camera.pitch),
        roll: 0,
      },
      duration: 1.4,
    })

    return () => {
      if (viewer.isDestroyed()) return
      viewer.entities.removeById(boundaryId)
      viewer.entities.removeById(labelId)
    }
  }, [viewer, region])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !modelBounds || !isValidRegionBounds(modelBounds)) return

    const boundaryId = 'model-dataset-boundary'
    const labelId = 'model-dataset-label'
    viewer.entities.removeById(boundaryId)
    viewer.entities.removeById(labelId)
    viewer.entities.add({
      id: boundaryId,
      name: 'Model dataset extent',
      polyline: {
        positions: boundaryPositions(modelBounds),
        width: 1,
        material: Color.AQUAMARINE.withAlpha(0.9),
        clampToGround: true,
      },
    })
    viewer.entities.add({
      id: labelId,
      name: 'Model dataset extent',
      position: Cartesian3.fromDegrees((modelBounds.west + modelBounds.east) / 2, modelBounds.south),
      label: {
        text: 'Model dataset extent',
        font: '12px sans-serif',
        fillColor: Color.AQUAMARINE,
        outlineColor: Color.BLACK.withAlpha(0.9),
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.TOP,
        pixelOffset: new Cartesian2(0, 6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })

    return () => {
      if (viewer.isDestroyed()) return
      viewer.entities.removeById(boundaryId)
      viewer.entities.removeById(labelId)
    }
  }, [viewer, modelBounds])

  return null
}
