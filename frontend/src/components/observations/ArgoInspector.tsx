import React from 'react'
import type { ArgoProfileDetail, ArgoModelCollocation } from '../../services/argoApi'
import {
  buildProfileChartData,
  describeCollocationStatus,
  formatCelsius,
  formatDepthMeters,
  formatHours,
  formatKilometers,
  formatObservationTime,
  formatOptionalText,
} from '../../lib/argoChart'
import ProfileChart from './ProfileChart'

interface ArgoInspectorProps {
  profile: ArgoProfileDetail | null
  profileLoading: boolean
  profileError: string | null
  collocation: ArgoModelCollocation | null
  collocationLoading: boolean
  collocationError: string | null
  onClose: () => void
}

const DataRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <React.Fragment>
    <dt className="text-slate-400">{label}</dt>
    <dd className="min-w-0 break-words text-right font-medium text-slate-100">{value}</dd>
  </React.Fragment>
)

const SectionTitle: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h4 id={id} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-200/80">
    {children}
  </h4>
)

const ArgoInspector: React.FC<ArgoInspectorProps> = ({
  profile,
  profileLoading,
  profileError,
  collocation,
  collocationLoading,
  collocationError,
  onClose,
}) => {
  const chartData = React.useMemo(
    () => (profile ? buildProfileChartData(profile, collocation) : null),
    [profile, collocation],
  )
  const collocationEligible = collocation?.status === 'eligible'

  return (
    <aside
      aria-labelledby="argo-inspector-title"
      className="scientific-scroll w-full shrink-0 border border-white/10 bg-[#08111f] lg:h-full lg:min-h-0 lg:w-[340px] lg:border-y-0 lg:border-r-0 lg:overflow-y-auto"
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="argo-inspector-title"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-200/80"
            >
              ARGO observation
            </h3>
            <p className="mt-1 truncate text-sm font-semibold text-white">
              {profile?.profile_id ?? 'Loading profile…'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close observation inspector"
            className="rounded-md border border-white/10 bg-[#0b1524] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-300/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            Close
          </button>
        </div>

        {profileLoading && (
          <p role="status" className="rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-slate-300">
            Loading ARGO profile.
          </p>
        )}

        {profileError && (
          <p role="alert" className="rounded-md border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {profileError}
          </p>
        )}

        {profile && !profileLoading && (
          <>
            <section aria-labelledby="argo-profile-title" className="space-y-2">
              <SectionTitle id="argo-profile-title">ARGO profile</SectionTitle>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                <DataRow label="Platform" value={profile.platform_number} />
                <DataRow label="Cycle" value={profile.cycle_number} />
                <DataRow label="Observation time" value={formatObservationTime(profile.observation_time)} />
                <DataRow
                  label="Position"
                  value={
                    profile.latitude !== null && profile.longitude !== null
                      ? `${profile.latitude.toFixed(4)}°, ${profile.longitude.toFixed(4)}°`
                      : 'Not provided'
                  }
                />
                <DataRow label="Data mode" value={formatOptionalText(profile.data_mode)} />
                <DataRow label="Direction" value={formatOptionalText(profile.direction)} />
              </dl>
            </section>

            <section aria-labelledby="argo-provenance-title" className="space-y-2">
              <SectionTitle id="argo-provenance-title">Data provenance</SectionTitle>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                <DataRow label="Pressure source" value={profile.pressure_source} />
                <DataRow label="Temperature source" value={profile.temperature_source} />
                <DataRow label="Salinity source" value={profile.salinity_source} />
                <DataRow label="Provider" value={profile.provider} />
                <DataRow label="Format" value={profile.source_format} />
              </dl>
            </section>

            <section aria-labelledby="argo-coverage-title" className="space-y-2">
              <SectionTitle id="argo-coverage-title">Vertical coverage</SectionTitle>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                <DataRow label="Minimum depth" value={formatDepthMeters(profile.depth_min_m)} />
                <DataRow label="Maximum depth" value={formatDepthMeters(profile.depth_max_m)} />
                <DataRow
                  label="Usable levels"
                  value={`${profile.usable_level_count} of ${profile.level_count}`}
                />
              </dl>
              {profile.usable_level_count === 0 && (
                <p role="status" className="rounded-md border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
                  No usable levels: every level is missing data or failed quality control.
                </p>
              )}
            </section>

            <section aria-labelledby="argo-profile-chart-title" className="space-y-2">
              <SectionTitle id="argo-profile-chart-title">Depth vs potential temperature</SectionTitle>
              {chartData && chartData.observation.length > 0 ? (
                <ProfileChart
                  data={chartData}
                  showModel={collocationEligible}
                  ariaLabel={`Depth versus potential temperature for ARGO profile ${profile.profile_id}`}
                />
              ) : (
                <p className="rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-xs text-slate-300">
                  No plottable potential temperature levels for this profile.
                </p>
              )}
            </section>

            <section aria-labelledby="argo-collocation-title" className="space-y-2">
              <SectionTitle id="argo-collocation-title">Model vs ARGO comparison</SectionTitle>

              {collocationLoading && (
                <p role="status" className="rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-slate-300">
                  Loading model collocation.
                </p>
              )}

              {collocationError && (
                <p role="alert" className="rounded-md border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {collocationError}
                </p>
              )}

              {collocation && !collocationLoading && !collocationEligible && (
                <p role="status" className="rounded-md border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
                  {describeCollocationStatus(collocation.status)}
                </p>
              )}

              {collocation && collocationEligible && (
                <>
                  <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                    <DataRow label="Matched pairs" value={collocation.matched_pair_count} />
                    <DataRow label="Bias (Model − Observation)" value={formatCelsius(collocation.bias_c)} />
                    <DataRow label="RMSE" value={formatCelsius(collocation.rmse_c)} />
                    <DataRow label="MAE" value={formatCelsius(collocation.mae_c)} />
                    <DataRow label="Observation time" value={formatObservationTime(collocation.observation_time)} />
                    <DataRow label="Nearest model time" value={formatObservationTime(collocation.model_time)} />
                    <DataRow label="Time difference" value={formatHours(collocation.time_difference_hours)} />
                    <DataRow label="Spatial distance" value={formatKilometers(collocation.spatial_distance_km)} />
                    <DataRow
                      label="Model grid position"
                      value={
                        collocation.model_latitude !== null && collocation.model_longitude !== null
                          ? `${collocation.model_latitude.toFixed(4)}°, ${collocation.model_longitude.toFixed(4)}°`
                          : 'Not available'
                      }
                    />
                    <DataRow label="Method" value={collocation.method} />
                  </dl>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Bias is the mean of (model − observation) over matched pairs. Residuals range
                    from {formatCelsius(collocation.residual_min_c)} to {formatCelsius(collocation.residual_max_c)}.
                  </p>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </aside>
  )
}

export default ArgoInspector
