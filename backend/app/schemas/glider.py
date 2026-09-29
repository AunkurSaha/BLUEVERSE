"""Typed public responses for the Spray glider observation API."""
from typing import Any, Optional
from pydantic import BaseModel

class GliderTrajectoryPoint(BaseModel):
    profile_index: int
    profile_time: str
    latitude: float
    longitude: float
    along_track_distance_km: float
    total_observation_count: int
    usable_observation_count: int

class GliderProfileSummary(BaseModel):
    profile_index: int
    profile_time: str
    latitude: float
    longitude: float
    total_observation_count: int
    usable_observation_count: int
    depth_min_m: Optional[float]
    depth_max_m: Optional[float]

class GliderProfileLevel(BaseModel):
    observation_index: int
    pressure_dbar: Optional[float]
    depth_m: Optional[float]
    temperature: Optional[float]
    salinity: Optional[float]
    chlorophyll_a: Optional[float]
    temperature_qc: Optional[int]
    salinity_qc: Optional[int]
    chlorophyll_a_qc: Optional[int]

class GliderProfileDetail(GliderProfileSummary):
    rejected_observation_count: int
    levels: list[GliderProfileLevel]
    variable_units: dict[str, Optional[str]]
    qc_policy: str
    provenance: dict[str, Any]

class GliderMissionSummary(BaseModel):
    mission_id: str
    deployment_id: str
    trajectory_id: str
    profile_count: int
    observation_count: int
    start_time: str
    end_time: str
    min_latitude: float
    max_latitude: float
    min_longitude: float
    max_longitude: float
    min_depth_m: Optional[float]
    max_depth_m: Optional[float]
    available_variables: list[str]
    source: str
    feature_type: str

class GliderMissionDetail(GliderMissionSummary):
    institution: Optional[str]
    coordinate_policy: dict[str, str]
    qc_flags: dict[str, dict[str, int]]
    variable_metadata: dict[str, dict[str, Optional[str]]]
    provenance: dict[str, Any]

class GliderCurtainResponse(BaseModel):
    variable: str
    profile_indices: list[int]
    profile_times: list[str]
    profile_coordinates: list[tuple[float, float]]
    along_track_distance_km: list[float]
    depth_bin_edges_m: list[float]
    depth_bin_centers_m: list[float]
    values: list[list[Optional[float]]]
    units: Optional[str]
    qc_policy: str
    aggregation_method: str
    finite_cell_count: int
    null_cell_count: int
    provenance: dict[str, Any]
