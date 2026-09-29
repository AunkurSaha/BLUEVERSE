from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class CollocationPair(BaseModel):
    model_depth_m: float
    observation_depth_m: float
    vertical_gap_m: float
    pressure_dbar: float
    observation_potential_temperature_c: float
    model_thetao_c: float
    residual_c: float


class ArgoModelCollocation(BaseModel):
    profile_id: str
    status: str
    observation_time: Optional[datetime] = None
    model_time: Optional[datetime] = None
    time_difference_hours: Optional[float] = None
    observation_latitude: Optional[float] = None
    observation_longitude: Optional[float] = None
    model_latitude: Optional[float] = None
    model_longitude: Optional[float] = None
    spatial_distance_km: Optional[float] = None
    matched_pair_count: int = 0
    bias_c: Optional[float] = None
    rmse_c: Optional[float] = None
    mae_c: Optional[float] = None
    residual_min_c: Optional[float] = None
    residual_max_c: Optional[float] = None
    pairs: List[CollocationPair] = []
    method: str
    provenance: dict