import { filterAlertSummaries, summarizeAlerts } from './alerts.ts'
import type { AlertSeverity, ArgoProfileAlertSummary } from '../services/alertApi.ts'

const assertDeepEqual = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message)
}

const summary = (profile_id: string, severity: AlertSeverity, matched_pair_count: number): ArgoProfileAlertSummary => ({
  profile_id,
  platform_type: 'ARGO',
  platform_id: profile_id.split('-')[0],
  profile_number: profile_id.split('-')[1],
  observation_time: null,
  observation_latitude: 16,
  observation_longitude: 89,
  matched_pair_count,
  normal_count: severity === 'normal' ? matched_pair_count : 0,
  moderate_count: severity === 'moderate' ? matched_pair_count : 0,
  high_count: severity === 'high' ? matched_pair_count : 0,
  maximum_absolute_residual: severity === 'not_assessable' ? null : 1,
  residual_at_maximum: severity === 'not_assessable' ? null : 1,
  depth_of_maximum_residual: severity === 'not_assessable' ? null : 10,
  bias: null,
  rmse: null,
  mae: null,
  severity,
  collocation_status: severity === 'not_assessable' ? 'no_vertical_overlap' : 'eligible',
  not_assessable_reason: severity === 'not_assessable' ? 'No vertical overlap' : null,
})

const summaries = [
  summary('1-1', 'normal', 5),
  summary('2-2', 'moderate', 4),
  summary('3-3', 'high', 3),
  summary('4-4', 'not_assessable', 0),
]

assertDeepEqual(filterAlertSummaries(summaries, 'all').map((item) => item.profile_id), ['1-1', '2-2', '3-3', '4-4'], 'all filter')
assertDeepEqual(filterAlertSummaries(summaries, 'moderate_plus').map((item) => item.profile_id), ['2-2', '3-3'], 'moderate+ filter')
assertDeepEqual(filterAlertSummaries(summaries, 'high').map((item) => item.profile_id), ['3-3'], 'high filter')
assertDeepEqual(summarizeAlerts(summaries), {
  profilesChecked: 4,
  normal: 1,
  moderate: 1,
  high: 1,
  notAssessable: 1,
  totalMatchedLevels: 12,
}, 'dashboard summary')

console.log('alert filtering tests passed')
