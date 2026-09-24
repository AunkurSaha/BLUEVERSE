import React, { useEffect, useRef } from 'react'
import {
  Cartesian3,
  Color,
  ImageryLayer,
  Math as CesiumMath,
  Rectangle,
  SingleTileImageryProvider,
  TileMapServiceImageryProvider,
  TextureMagnificationFilter,
  TextureMinificationFilter,
  Viewer,
  buildModuleUrl,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

import type { PreparedTemperatureSlice } from '../../lib/temperatureSlice'

interface OceanGlobeProps {
  temperatureLayer: PreparedTemperatureSlice | null
}

const OceanGlobe: React.FC<OceanGlobeProps> = ({ temperatureLayer }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const viewer = new Viewer(container, {
      animation: false,
      baseLayerPicker: false,
      baseLayer: ImageryLayer.fromProviderAsync(
        TileMapServiceImageryProvider.fromUrl(
          buildModuleUrl('Assets/Textures/NaturalEarthII'),
        ),
      ),
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      scene3DOnly: true,
      selectionIndicator: false,
      timeline: false,
    })
    viewerRef.current = viewer

    viewer.scene.globe.baseColor = Color.fromCssColorString('#0a1f2e')
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(89, 16.5, 3_000_000),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-90),
        roll: 0,
      },
    })

    return () => {
      viewerRef.current = null
      viewer.destroy()
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !temperatureLayer) return

    const providerPromise = SingleTileImageryProvider.fromUrl(
      temperatureLayer.imageDataUrl,
      {
        rectangle: Rectangle.fromDegrees(
          temperatureLayer.extent.west,
          temperatureLayer.extent.south,
          temperatureLayer.extent.east,
          temperatureLayer.extent.north,
        ),
      },
    )
    const imageryLayer = ImageryLayer.fromProviderAsync(providerPromise)
    imageryLayer.alpha = 1
    imageryLayer.magnificationFilter = TextureMagnificationFilter.NEAREST
    imageryLayer.minificationFilter = TextureMinificationFilter.NEAREST
    viewer.imageryLayers.add(imageryLayer)

    return () => {
      if (viewer.isDestroyed()) return
      if (viewer.imageryLayers.contains(imageryLayer)) {
        viewer.imageryLayers.remove(imageryLayer, true)
      }
    }
  }, [temperatureLayer])

  return <div ref={containerRef} className="h-full min-h-0 w-full min-w-0" />
}

export default OceanGlobe
