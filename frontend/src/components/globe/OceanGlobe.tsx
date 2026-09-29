import React, { useEffect, useRef } from 'react'
import {
  Cartesian2,
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
  Entity,
  EntityCollection,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

import type { PreparedTemperatureSlice } from '../../lib/temperatureSlice'
import type { ArgoProfileSummary } from '../../services/argoApi'
import ArgoLayer from './ArgoLayer'
import GliderLayer from './GliderLayer'
import type { GliderPoint } from '../../services/gliderApi'
import SubsurfaceLayer from './SubsurfaceLayer'
import type { SubsurfaceFrame, SubsurfaceSample } from '../../lib/subsurfaceFrame'
import IsosurfaceLayer, { type IsosurfaceFrame, type IsosurfaceSample } from './IsosurfaceLayer'
import TransectLayer from './TransectLayer'
import type { GeoPoint, ModelDomain } from '../../lib/transect'

interface ArgoHoverState {
  profile: ArgoProfileSummary
  position: { x: number; y: number }
}

interface OceanGlobeProps {
  oceanLayer: {
    type: 'scalar'
    data: PreparedTemperatureSlice
  } | {
    type: 'vector'
    uo: PreparedTemperatureSlice
    vo: PreparedTemperatureSlice
  } | null
  argoProfiles: ArgoProfileSummary[]
  argoVisible: boolean
  selectedArgoId: string | null
  onArgoSelect: (profileId: string) => void
  getCurrentSpeed: (uoValue: number, voValue: number) => number
  gliderPoints: GliderPoint[]
  gliderVisible: boolean
  selectedGliderIndex: number | null
  onGliderSelect: (index:number) => void
  subsurfaceFrame: SubsurfaceFrame | null
  verticalExaggeration: number
  subsurfaceOpacity: number
  onSubsurfaceSample: (sample: SubsurfaceSample | null) => void
  isosurfaceFrame: IsosurfaceFrame | null
  isosurfaceOpacity: number
  onIsosurfaceSample: (sample: IsosurfaceSample | null) => void
  transectStart: GeoPoint | null
  transectEnd: GeoPoint | null
  transectDrawMode: boolean
  transectDomain: ModelDomain | null
  onTransectPoint: (point: GeoPoint) => void
  onTransectError: (message: string) => void
}

const formatTooltipTime = (value: string | null): string => {
  if (!value) return 'Time not provided'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10)
}

const OceanGlobe: React.FC<OceanGlobeProps> = ({
  oceanLayer,
  argoProfiles,
  argoVisible,
  selectedArgoId,
  onArgoSelect,
  getCurrentSpeed,
  gliderPoints, gliderVisible, selectedGliderIndex, onGliderSelect,
  subsurfaceFrame, verticalExaggeration, subsurfaceOpacity, onSubsurfaceSample,
  isosurfaceFrame, isosurfaceOpacity, onIsosurfaceSample,
  transectStart, transectEnd, transectDrawMode, transectDomain, onTransectPoint, onTransectError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const [viewerReady, setViewerReady] = React.useState(false)
  const [argoHover, setArgoHover] = React.useState<ArgoHoverState | null>(null)
  // Store vector visualization entities for cleanup
  const vectorEntitiesRef = useRef<Entity[]>([])

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
    setViewerReady(true)

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
      if (viewerRef.current === viewer) viewerRef.current = null
      setViewerReady(false)
      if (!viewer.isDestroyed()) viewer.destroy()
    }
  }, [])

  // Handle scalar layer (temperature/salinity) - existing raster imagery
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !oceanLayer || oceanLayer.type !== 'scalar') return

    const layer = oceanLayer.data
    const providerPromise = SingleTileImageryProvider.fromUrl(
      layer.imageDataUrl,
      {
        rectangle: Rectangle.fromDegrees(
          layer.extent.west,
          layer.extent.south,
          layer.extent.east,
          layer.extent.north,
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
  }, [oceanLayer])

  // Handle vector layer (currents) - draw vector arrows
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !oceanLayer || oceanLayer.type !== 'vector') {
      // Clean up any existing vector visualization
      if (viewer !== null && vectorEntitiesRef.current) {
        vectorEntitiesRef.current.forEach(entity => {
          if (!viewer.isDestroyed()) {
            viewer.entities.remove(entity)
          }
        })
        vectorEntitiesRef.current = []
      }
      return
    }

    // Create vector visualization
    const { uo, vo } = oceanLayer
    const uoSlice = uo.slice
    const voSlice = vo.slice

    // Verify slices are compatible
    if (
      uoSlice.lat_vals.length !== voSlice.lat_vals.length ||
      uoSlice.lon_vals.length !== voSlice.lon_vals.length ||
      !arrayEqual(uoSlice.lat_vals, voSlice.lat_vals) ||
      !arrayEqual(uoSlice.lon_vals, voSlice.lon_vals)
    ) {
      console.error('UO and VO slices have incompatible grids')
      return
    }

    const latCount = uoSlice.lat_vals.length
    const lonCount = uoSlice.lon_vals.length

    // Sampling factor to avoid overcrowding (adjust as needed)
    const sampleFactor = Math.max(1, Math.floor(Math.sqrt(latCount * lonCount) / 50))

    // Create entities for vectors
    const entities: Entity[] = []

    // Add vectors at sampled points
    for (let latIdx = 0; latIdx < latCount; latIdx += sampleFactor) {
      for (let lonIdx = 0; lonIdx < lonCount; lonIdx += sampleFactor) {
        const uoValue = uoSlice.slice_data[latIdx]?.[lonIdx] ?? null
        const voValue = voSlice.slice_data[latIdx]?.[lonIdx] ?? null

        // Skip if either component is missing/invalid
        if (uoValue === null || voValue === null || typeof uoValue !== 'number' || typeof voValue !== 'number') {
          continue
        }

        // Calculate magnitude and direction
        const magnitude = getCurrentSpeed(uoValue, voValue)
        // Skip very small currents to reduce clutter
        if (magnitude < 0.01) continue

        // Convert grid coordinates to geographic coordinates
        const latitude = uoSlice.lat_vals[latIdx]
        const longitude = uoSlice.lon_vals[lonIdx]

        // Calculate vector end point (scale for visibility)
        const scaleFactor = 0.1 // Adjust this to control arrow size
        const endLatitude = latitude + (voValue * scaleFactor)
        const endLongitude = longitude + (uoValue * scaleFactor)

        // Create entity with polyline
        const entity = viewer.entities.add({
          polyline: {
            positions: [
              Cartesian3.fromDegrees(longitude, latitude, 0),
              Cartesian3.fromDegrees(endLongitude, endLatitude, 0)
            ],
            width: Math.max(1, Math.min(5, magnitude * 10)), // Scale width by magnitude
            material: Color.CYAN.withAlpha(0.8) // Cyan with transparency
          }
        })
        entities.push(entity)
      }
    }

    vectorEntitiesRef.current = entities

    return () => {
      if (viewer !== null && !viewer.isDestroyed() && vectorEntitiesRef.current) {
        vectorEntitiesRef.current.forEach(entity => {
          viewer.entities.remove(entity)
        })
        vectorEntitiesRef.current = []
      }
    }
  }, [oceanLayer, getCurrentSpeed])

  // Helper to check array equality
  function arrayEqual(arr1: number[], arr2: number[]): boolean {
    if (arr1.length !== arr2.length) return false
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false
    }
    return true
  }

  return (
    <div className="relative h-full min-h-0 w-full min-w-0">
      <div ref={containerRef} className="h-full min-h-0 w-full min-w-0" />
      {viewerReady && (
        <ArgoLayer
          viewer={viewerRef.current}
          profiles={argoProfiles}
          visible={argoVisible}
          selectedProfileId={selectedArgoId}
          onSelect={onArgoSelect}
          onHover={(profile, position) =>
            setArgoHover(profile && position ? { profile, position } : null)
          }
          interactive={!transectDrawMode}
        />
      )}
      {viewerReady && <IsosurfaceLayer viewer={viewerRef.current} frame={isosurfaceFrame} opacity={isosurfaceOpacity} verticalScale={verticalExaggeration} interactive={!transectDrawMode} onSample={onIsosurfaceSample} />}
      {viewerReady && <GliderLayer viewer={viewerRef.current} points={gliderPoints} visible={gliderVisible} selected={selectedGliderIndex} onSelect={onGliderSelect} onHover={()=>{}} interactive={!transectDrawMode} />}
      {viewerReady && <TransectLayer viewer={viewerRef.current} start={transectStart} end={transectEnd} drawMode={transectDrawMode} domain={transectDomain} onPoint={onTransectPoint} onError={onTransectError} />}
      {viewerReady && (
        <SubsurfaceLayer
          viewer={viewerRef.current}
          frame={subsurfaceFrame}
          verticalExaggeration={verticalExaggeration}
          opacity={subsurfaceOpacity}
          interactive={!transectDrawMode}
          onSample={onSubsurfaceSample}
        />
      )}
      {argoHover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 max-w-[220px] rounded-md border border-cyan-300/30 bg-[#08111f]/95 px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{
            left: Math.min(argoHover.position.x + 14, Math.max(0, (containerRef.current?.clientWidth ?? 300) - 230)),
            top: Math.max(argoHover.position.y - 8, 8),
          }}
        >
          <p className="font-semibold text-cyan-200">ARGO {argoHover.profile.profile_id}</p>
          <p className="text-slate-300">{formatTooltipTime(argoHover.profile.observation_time)}</p>
          {argoHover.profile.latitude !== null && argoHover.profile.longitude !== null && (
            <p className="text-slate-400">
              {argoHover.profile.latitude.toFixed(3)}°, {argoHover.profile.longitude.toFixed(3)}°
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default OceanGlobe
