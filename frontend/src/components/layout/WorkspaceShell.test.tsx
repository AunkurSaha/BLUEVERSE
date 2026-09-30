import { renderToStaticMarkup } from 'react-dom/server'

import AppHeader from './AppHeader'
import BottomTimeline from './BottomTimeline'
import RightInspector from './RightInspector'

const noop = () => undefined
const assertMatch = (value: string, pattern: RegExp) => {
  if (!pattern.test(value)) throw new Error(`Expected rendered markup to match ${pattern}`)
}
const assertNoMatch = (value: string, pattern: RegExp) => {
  if (pattern.test(value)) throw new Error(`Expected rendered markup not to match ${pattern}`)
}

const header = renderToStaticMarkup(
  <AppHeader
    backendStatus="online"
    selectedDataset="SYNTHETIC FIXTURE"
    regionName="Bay of Bengal"
    variable="thetao"
    actualTime="2020-05-18T00:00:00Z"
    actualDepth={0.494}
    depthUnits="m"
    analysisContext="current"
    historicalMode="daily"
    historicalEventName={null}
    drawerOpen={false}
    onDrawerToggle={noop}
    onWorkflowOpen={noop}
  />,
)
assertMatch(header, /Bay of Bengal \/ Temperature/)
assertMatch(header, /Details/)
assertNoMatch(header, /Close details/)

const historicalHeader = renderToStaticMarkup(
  <AppHeader
    backendStatus="online"
    selectedDataset="SYNTHETIC FIXTURE"
    regionName="Bay of Bengal"
    variable="thetao"
    actualTime={null}
    actualDepth={null}
    depthUnits={null}
    analysisContext="historical-event"
    historicalMode="difference"
    historicalEventName="Cyclone Amphan"
    drawerOpen
    onDrawerToggle={noop}
    onWorkflowOpen={noop}
  />,
)
assertMatch(historicalHeader, /Cyclone Amphan \/ Historical Ocean/)
assertMatch(historicalHeader, /Difference/)
assertMatch(historicalHeader, /Close details/)

const controller = renderToStaticMarkup(
  <BottomTimeline
    oceanLayer={null}
    sliceSelection={null}
    timeLevels={3}
    timeValues={['2020-05-17T00:00:00Z', '2020-05-18T00:00:00Z', '2020-05-19T00:00:00Z']}
    timeUnits="days since 1950-01-01"
    selectedTimeIndex={1}
    onTimeChange={noop}
    depthLevels={2}
    depthValues={[0.494, 5.078]}
    depthUnits="m"
    selectedDepthIndex={0}
    isLoading={false}
    error={null}
    onDepthChange={noop}
    isPlaying={false}
    onPlayToggle={noop}
  />,
)
assertMatch(controller, /TIME/)
assertMatch(controller, /DEPTH/)
assertMatch(controller, /Frame 2 \/ 3/)
assertMatch(controller, /Level 1 \/ 2/)

const derivedController = renderToStaticMarkup(<BottomTimeline oceanLayer={null} sliceSelection={null} timeLevels={12} timeValues={null} timeUnits={null} selectedTimeIndex={0} onTimeChange={noop} depthLevels={31} depthValues={[0.494]} depthUnits="m" selectedDepthIndex={0} isLoading={false} error={null} onDepthChange={noop} isPlaying onPlayToggle={noop} timeControlEnabled={false} timeContextLabel="After Phase Mean · 22–24 May 2020" />)
assertMatch(derivedController, /button[^>]*disabled=""[^>]*aria-label="Play time animation"/)
assertNoMatch(derivedController, /Pause/)
assertMatch(derivedController, /Derived field/)
assertMatch(derivedController, /After Phase Mean · 22–24 May 2020/)

const inspector = renderToStaticMarkup(
  <RightInspector
    dataset={null}
    metadata={null}
    oceanLayer={null}
    sliceSelection={null}
    isLoading={false}
    error={null}
    sliceLoading={false}
    sliceError={null}
    colorScale={null}
    scaleLoading={false}
    previousTimeMean={null}
    subsurfaceSample={null}
    isosurfaceSample={null}
    onClose={noop}
  />,
)
assertMatch(inspector, /INSPECT/)
assertMatch(inspector, /Choose a data-backed region/)
assertMatch(inspector, /Close inspector/)

console.log('Workspace shell rendering tests passed')
