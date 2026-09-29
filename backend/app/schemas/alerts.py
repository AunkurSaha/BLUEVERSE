from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AlertSeverity(str, Enum):
    normal = "normal"
    moderate = "moderate"
    high = "high"
    not_assessable = "not_assessable"


class AlertThresholds(BaseModel):
    normal_max_c: float = 0.5
    moderate_max_c: float = 1.0
    label: str = "Prototype model-observation deviation thresholds"


class ArgoPairAlert(BaseModel):
    alert_id: str
    platform_type: str = "ARGO"
    platform_id: str
    profile_number: str
    variable: str = "sea_water_potential_temperature"
    units: str = "degrees_C"
    observation_time: str
    model_time: str
    time_offset_hours: float
    observation_latitude: float
    observation_longitude: float
    model_latitude: float
    model_longitude: float
    horizontal_distance_km: float
    observation_pressure_dbar: float
    observation_depth_m: float
    model_depth_m: float
    vertical_difference_m: float
    observation_value: float
    model_value: float
    residual: float
    absolute_residual: float
    severity: AlertSeverity
    qc_status: str
    collocation_status: str
    provenance: Dict[str, Any]


class ArgoProfileAlertSummary(BaseModel):
    profile_id: str
    platform_type: str = "ARGO"
    platform_id: str
    profile_number: str
    observation_time: Optional[str] = None
    observation_latitude: Optional[float] = None
    observation_longitude: Optional[float] = None
    matched_pair_count: int
    normal_count: int
    moderate_count: int
    high_count: int
    maximum_absolute_residual: Optional[float] = None
    residual_at_maximum: Optional[float] = None
    depth_of_maximum_residual: Optional[float] = None
    bias: Optional[float] = None
    rmse: Optional[float] = None
    mae: Optional[float] = None
    severity: AlertSeverity
    collocation_status: str
    not_assessable_reason: Optional[str] = None


class ArgoProfileAlertDetail(BaseModel):
    summary: ArgoProfileAlertSummary
    alerts: List[ArgoPairAlert] = Field(default_factory=list)
    thresholds: AlertThresholds
    provenance: Dict[str, Any]


class ArgoAlertListResponse(BaseModel):
    thresholds: AlertThresholds
    summaries: List[ArgoProfileAlertSummary] = Field(default_factory=list)
