import React, { useEffect, useRef } from 'react'
import {
  Cartesian3,
  Color,
  ImageryLayer,
  Math as CesiumMath,
  TileMapServiceImageryProvider,
  Viewer,
  buildModuleUrl,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

const OceanGlobe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)

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
      viewer.destroy()
    }
  }, [])

  return <div ref={containerRef} className="h-full min-h-0 w-full min-w-0" />
}

export default OceanGlobe
