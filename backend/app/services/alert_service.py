from __future__ import annotations

import math
from typing import Any, Dict, Iterable, Optional

from ..schemas.alerts import (
    AlertSeverity,
    AlertThresholds,
    ArgoPairAlert,
    ArgoProfileAlertDetail,
    ArgoProfileAlertSummary,
)
from .argo_service import ArgoService
from .collocation_service import ACCEPTED_QC, CollocationService


DEFAULT_ALERT_THRESHOLDS = AlertThresholds()

NOT_ASSESSABLE_REASONS = {
    "no_vertical_overlap": "No vertical overlap",
    "no_valid_pairs": "Insufficient valid QC data",
    "outside_time_tolerance": "No model time within the collocation tolerance",
    "outside_spatial_tolerance": "No model coverage within the spatial tolerance",
    "error": "Collocation unavailable",
    "not_found": "ARGO profile not found",
}


def classify_absolute_residual(
    absolute_residual_c: float,
    thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS,
) -> AlertSeverity:
    if not math.isfinite(absolute_residual_c) or absolute_residual_c < 0:
        raise ValueError("Absolute residual must be a finite non-negative value.")
    if absolute_residual_c < thresholds.normal_max_c:
        return AlertSeverity.normal
    if absolute_residual_c < thresholds.moderate_max_c:
        return AlertSeverity.moderate
    return AlertSeverity.high


def overall_profile_severity(alerts: Iterable[ArgoPairAlert]) -> AlertSeverity:
    severities = {alert.severity for alert in alerts}
    if AlertSeverity.high in severities:
        return AlertSeverity.high
    if AlertSeverity.moderate in severities:
        return AlertSeverity.moderate
    if AlertSeverity.normal in severities:
        return AlertSeverity.normal
    return AlertSeverity.not_assessable


class AlertService:
    """Derive traceable deviation alerts from validated ARGO collocations."""

    def __init__(
        self,
        collocation_service: Optional[CollocationService] = None,
        argo_service: Optional[ArgoService] = None,
        thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS,
    ):
        if thresholds.normal_max_c < 0 or thresholds.moderate_max_c <= thresholds.normal_max_c:
            raise ValueError("Alert thresholds must satisfy 0 <= normal_max_c < moderate_max_c.")
        self.collocation_service = collocation_service or CollocationService()
        self.argo_service = argo_service or self.collocation_service.argo_service
        self.thresholds = thresholds
        self._detail_cache: Dict[str, ArgoProfileAlertDetail] = {}

    @staticmethod
    def _profile_parts(profile_id: str) -> tuple[str, str]:
        platform_id, separator, profile_number = profile_id.rpartition("-")
        if not separator:
            return profile_id, ""
        return platform_id, profile_number

    def _not_assessable_detail(
        self,
        profile_id: str,
        collocation: Dict[str, Any],
        profile_summary: Optional[Dict[str, Any]],
    ) -> ArgoProfileAlertDetail:
        platform_id, profile_number = self._profile_parts(profile_id)
        status = str(collocation.get("status", "error"))
        reason = NOT_ASSESSABLE_REASONS.get(status, "No valid matched pairs")
        summary = ArgoProfileAlertSummary(
            profile_id=profile_id,
            platform_id=platform_id,
            profile_number=profile_number,
            observation_time=collocation.get("observation_time") or (profile_summary or {}).get("observation_time"),
            observation_latitude=collocation.get("observation_latitude") if collocation.get("observation_latitude") is not None else (profile_summary or {}).get("latitude"),
            observation_longitude=collocation.get("observation_longitude") if collocation.get("observation_longitude") is not None else (profile_summary or {}).get("longitude"),
            matched_pair_count=0,
            normal_count=0,
            moderate_count=0,
            high_count=0,
            severity=AlertSeverity.not_assessable,
            collocation_status=status,
            not_assessable_reason=reason,
        )
        return ArgoProfileAlertDetail(
            summary=summary,
            thresholds=self.thresholds,
            provenance={
                "source": "existing ARGO/model collocation result",
                "collocation_method": collocation.get("method"),
                "collocation_provenance": collocation.get("provenance", {}),
                "residual_definition": "observation - model",
                "accepted_qc": sorted(ACCEPTED_QC),
            },
        )

    def profile_alert(self, profile_id: str) -> ArgoProfileAlertDetail:
        cached = self._detail_cache.get(profile_id)
        if cached is not None:
            return cached

        profile = self.argo_service.get_argo_profile(profile_id)
        profile_summary = profile.get("summary") if profile else None
        collocation = self.collocation_service.collocate_profile(profile_id)
        pairs = collocation.get("pairs", [])
        if collocation.get("status") != "eligible" or not pairs:
            detail = self._not_assessable_detail(profile_id, collocation, profile_summary)
            self._detail_cache[profile_id] = detail
            return detail

        platform_id, profile_number = self._profile_parts(profile_id)
        shared = {
            "platform_id": platform_id,
            "profile_number": profile_number,
            "observation_time": str(collocation["observation_time"]),
            "model_time": str(collocation["model_time"]),
            "time_offset_hours": float(collocation["time_difference_hours"]),
            "observation_latitude": float(collocation["observation_latitude"]),
            "observation_longitude": float(collocation["observation_longitude"]),
            "model_latitude": float(collocation["model_latitude"]),
            "model_longitude": float(collocation["model_longitude"]),
            "horizontal_distance_km": float(collocation["spatial_distance_km"]),
            "qc_status": f"Accepted by collocation policy (QC {', '.join(map(str, sorted(ACCEPTED_QC)))})",
            "collocation_status": str(collocation["status"]),
        }
        provenance = {
            "source": "existing ARGO/model collocation result",
            "collocation_method": collocation.get("method"),
            "collocation_provenance": collocation.get("provenance", {}),
            "residual_definition": "observation - model",
            "accepted_qc": sorted(ACCEPTED_QC),
        }
        alerts = []
        for index, pair in enumerate(pairs):
            residual = float(pair["observation_potential_temperature_c"] - pair["model_thetao_c"])
            absolute_residual = abs(residual)
            alerts.append(ArgoPairAlert(
                alert_id=f"argo:{profile_id}:temperature:{index}",
                observation_pressure_dbar=float(pair["pressure_dbar"]),
                observation_depth_m=float(pair["observation_depth_m"]),
                model_depth_m=float(pair["model_depth_m"]),
                vertical_difference_m=float(pair["vertical_gap_m"]),
                observation_value=float(pair["observation_potential_temperature_c"]),
                model_value=float(pair["model_thetao_c"]),
                residual=residual,
                absolute_residual=absolute_residual,
                severity=classify_absolute_residual(absolute_residual, self.thresholds),
                provenance=provenance,
                **shared,
            ))

        residuals = [alert.residual for alert in alerts]
        maximum = max(alerts, key=lambda alert: alert.absolute_residual)
        severity = overall_profile_severity(alerts)
        summary = ArgoProfileAlertSummary(
            profile_id=profile_id,
            platform_id=platform_id,
            profile_number=profile_number,
            observation_time=shared["observation_time"],
            observation_latitude=shared["observation_latitude"],
            observation_longitude=shared["observation_longitude"],
            matched_pair_count=len(alerts),
            normal_count=sum(alert.severity == AlertSeverity.normal for alert in alerts),
            moderate_count=sum(alert.severity == AlertSeverity.moderate for alert in alerts),
            high_count=sum(alert.severity == AlertSeverity.high for alert in alerts),
            maximum_absolute_residual=maximum.absolute_residual,
            residual_at_maximum=maximum.residual,
            depth_of_maximum_residual=maximum.observation_depth_m,
            bias=sum(residuals) / len(residuals),
            rmse=math.sqrt(sum(value * value for value in residuals) / len(residuals)),
            mae=sum(abs(value) for value in residuals) / len(residuals),
            severity=severity,
            collocation_status=str(collocation["status"]),
        )
        detail = ArgoProfileAlertDetail(
            summary=summary,
            alerts=alerts,
            thresholds=self.thresholds,
            provenance=provenance,
        )
        self._detail_cache[profile_id] = detail
        return detail

    def list_profile_alerts(
        self,
        severity: Optional[AlertSeverity] = None,
        platform_id: Optional[str] = None,
    ) -> list[ArgoProfileAlertSummary]:
        summaries = []
        for profile in self.argo_service.get_argo_profiles():
            if platform_id is not None and profile.get("platform_number") != platform_id:
                continue
            summary = self.profile_alert(profile["profile_id"]).summary
            if severity is not None and summary.severity != severity:
                continue
            summaries.append(summary)
        return summaries
