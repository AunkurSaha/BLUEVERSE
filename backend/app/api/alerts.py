from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from backend.app.schemas.alerts import (
    AlertSeverity,
    ArgoAlertListResponse,
    ArgoProfileAlertDetail,
)
from backend.app.services.alert_service import AlertService
from backend.app.api.observations import argo_service, collocation_service


router = APIRouter(prefix="/api/alerts", tags=["alerts"])
alert_service = AlertService(
    collocation_service=collocation_service,
    argo_service=argo_service,
)


@router.get("/argo", response_model=ArgoAlertListResponse)
def list_argo_alerts(
    severity: Optional[AlertSeverity] = Query(None),
    platform_id: Optional[str] = Query(None),
):
    return ArgoAlertListResponse(
        thresholds=alert_service.thresholds,
        summaries=alert_service.list_profile_alerts(severity=severity, platform_id=platform_id),
    )


@router.get("/argo/{platform_id}/{profile_number}", response_model=ArgoProfileAlertDetail)
def get_argo_alert(platform_id: str, profile_number: str):
    detail = alert_service.profile_alert(f"{platform_id}-{profile_number}")
    if detail.summary.collocation_status == "not_found":
        raise HTTPException(status_code=404, detail="ARGO profile not found")
    return detail
