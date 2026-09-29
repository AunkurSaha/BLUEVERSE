import React from 'react'
import type { ProfileChartData } from '../../lib/argoChart'

interface ProfileChartProps {
  data: ProfileChartData
  showModel: boolean
  ariaLabel: string
}

const WIDTH = 320
const HEIGHT = 280
const MARGIN = { top: 12, right: 12, bottom: 32, left: 44 }

const OBSERVATION_COLOR = '#22d3ee'
const MODEL_COLOR = '#f59e0b'

const ProfileChart: React.FC<ProfileChartProps> = ({ data, showModel, ariaLabel }) => {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom

  const x = (temperature: number): number =>
    MARGIN.left +
    ((temperature - data.tempMin) / (data.tempMax - data.tempMin || 1)) * plotWidth
  // Depth increases downward on the axis.
  const y = (depth: number): number =>
    MARGIN.top + ((depth - data.depthMin) / (data.depthMax - data.depthMin || 1)) * plotHeight

  const toPath = (points: Array<{ temperature: number; depth: number }>): string =>
    points
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.temperature).toFixed(2)},${y(point.depth).toFixed(2)}`)
      .join(' ')

  const tempTicks = 4
  const depthTicks = 5

  const summary = `Depth versus temperature chart. Observation potential temperature ranges from ${data.tempMin.toFixed(2)} to ${data.tempMax.toFixed(2)} degrees Celsius over ${data.depthMin.toFixed(1)} to ${data.depthMax.toFixed(1)} metres. ${data.usableLevelCount} of ${data.totalLevelCount} levels usable.`

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full"
      >
        <desc>{summary}</desc>
        {/* Axes */}
        <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={HEIGHT - MARGIN.bottom} stroke="#334155" strokeWidth={1} />
        <line x1={MARGIN.left} y1={HEIGHT - MARGIN.bottom} x2={WIDTH - MARGIN.right} y2={HEIGHT - MARGIN.bottom} stroke="#334155" strokeWidth={1} />
        {/* Temperature ticks (X) */}
        {Array.from({ length: tempTicks + 1 }, (_, i) => {
          const value = data.tempMin + ((data.tempMax - data.tempMin) * i) / tempTicks
          return (
            <text
              key={`t-${i}`}
              x={x(value)}
              y={HEIGHT - MARGIN.bottom + 14}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize={9}
            >
              {value.toFixed(1)}
            </text>
          )
        })}
        {/* Depth ticks (Y, downward) */}
        {Array.from({ length: depthTicks + 1 }, (_, i) => {
          const value = data.depthMin + ((data.depthMax - data.depthMin) * i) / depthTicks
          return (
            <text
              key={`d-${i}`}
              x={MARGIN.left - 6}
              y={y(value) + 3}
              textAnchor="end"
              className="fill-slate-400"
              fontSize={9}
            >
              {value.toFixed(0)}
            </text>
          )
        })}
        <text x={MARGIN.left + plotWidth / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-slate-300" fontSize={10}>
          Temperature (°C)
        </text>
        <text
          x={10}
          y={MARGIN.top + plotHeight / 2}
          textAnchor="middle"
          className="fill-slate-300"
          fontSize={10}
          transform={`rotate(-90 10 ${MARGIN.top + plotHeight / 2})`}
        >
          Depth (m)
        </text>
        {/* Observation segments (never connected across null gaps) */}
        {data.observation.map((segment, index) => (
          <path
            key={`obs-${index}`}
            d={toPath(segment.points)}
            fill="none"
            stroke={OBSERVATION_COLOR}
            strokeWidth={1.5}
          />
        ))}
        {data.observation.flatMap((segment, si) =>
          segment.points.map((point, pi) => (
            <circle
              key={`obs-pt-${si}-${pi}`}
              cx={x(point.temperature)}
              cy={y(point.depth)}
              r={1.6}
              fill={OBSERVATION_COLOR}
            />
          )),
        )}
        {/* Matched model thetao at matched depths */}
        {showModel &&
          data.model.map((segment, index) => (
            <React.Fragment key={`mod-${index}`}>
              <path d={toPath(segment.points)} fill="none" stroke={MODEL_COLOR} strokeWidth={1.5} strokeDasharray="4 3" />
              {segment.points.map((point, pi) => (
                <circle key={`mod-pt-${pi}`} cx={x(point.temperature)} cy={y(point.depth)} r={2.4} fill="none" stroke={MODEL_COLOR} strokeWidth={1.4} />
              ))}
            </React.Fragment>
          ))}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-4" style={{ backgroundColor: OBSERVATION_COLOR }} aria-hidden="true" />
          ARGO potential temperature
        </span>
        {showModel && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-0 w-4 border-t-2 border-dashed"
              style={{ borderColor: MODEL_COLOR }}
              aria-hidden="true"
            />
            Model θo (matched pairs)
          </span>
        )}
      </div>
    </div>
  )
}

export default ProfileChart
