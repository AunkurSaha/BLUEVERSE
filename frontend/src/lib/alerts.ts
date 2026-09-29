import type { AlertFilter, ArgoProfileAlertSummary } from '../services/alertApi'

export interface AlertDashboardSummary {
  profilesChecked: number
  normal: number
  moderate: number
  high: number
  notAssessable: number
  totalMatchedLevels: number
}

export const filterAlertSummaries = (
  summaries: ArgoProfileAlertSummary[],
  filter: AlertFilter,
): ArgoProfileAlertSummary[] => {
  if (filter === 'high') return summaries.filter((summary) => summary.severity === 'high')
  if (filter === 'moderate_plus') {
    return summaries.filter((summary) => summary.severity === 'moderate' || summary.severity === 'high')
  }
  return summaries
}

export const summarizeAlerts = (summaries: ArgoProfileAlertSummary[]): AlertDashboardSummary => ({
  profilesChecked: summaries.length,
  normal: summaries.filter((summary) => summary.severity === 'normal').length,
  moderate: summaries.filter((summary) => summary.severity === 'moderate').length,
  high: summaries.filter((summary) => summary.severity === 'high').length,
  notAssessable: summaries.filter((summary) => summary.severity === 'not_assessable').length,
  totalMatchedLevels: summaries.reduce((total, summary) => total + summary.matched_pair_count, 0),
})
