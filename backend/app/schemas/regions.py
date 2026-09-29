from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class RegionDataStatus(str, Enum):
    DATA_BACKED = "DATA_BACKED"
    NAVIGATION_ONLY = "NAVIGATION_ONLY"
    UNAVAILABLE = "UNAVAILABLE"


class RegionBounds(BaseModel):
    west: float
    south: float
    east: float
    north: float


class RegionCamera(BaseModel):
    longitude: float
    latitude: float
    height: float
    heading: float
    pitch: float


class RegionDataset(BaseModel):
    id: str
    label: str
    variable: str
    bounds: Optional[RegionBounds] = None
    time_coverage: Optional[str] = None
    depth_coverage: Optional[str] = None


class RegionSummary(BaseModel):
    id: str
    name: str
    short_name: str
    description: str
    bounds: RegionBounds
    camera: RegionCamera
    data_status: RegionDataStatus


class RegionDetail(RegionSummary):
    model_datasets: List[RegionDataset]
    observation_sources: List[str]
    supported_variables: List[str]
    analysis_capabilities: List[str]
    time_coverage: Optional[str] = None
    notes: List[str]
