from pydantic import BaseModel
from typing import List, Optional, Any, Dict, Literal


class DatasetCatalogEntry(BaseModel):
    """A registry entry suitable for choosing a data source in the UI."""

    id: str
    dataset_kind: Literal["model_grid", "historical_model_grid", "observation_trajectory"]
    description: Optional[str] = None

class DatasetProvenance(BaseModel):
    provider: Optional[str]
    product_id: Optional[str]
    model_source: Optional[str]
    institution: Optional[str]

    class Config:
        from_attributes = True

class DatasetMetadata(BaseModel):
    dataset_id: str
    provenance: DatasetProvenance
    dimensions: Dict[str, int]
    variables: List[str]
    time_coordinate: Optional[str]
    vertical_coordinate: Optional[str]
    latitude_coordinate: Optional[str]
    longitude_coordinate: Optional[str]
    # Additional fields for depth exploration
    depth_coordinate_name: Optional[str] = None
    depth_units: Optional[str] = None
    depth_values: Optional[List[float]] = None
    selectable_depth_indices: Optional[List[int]] = None
    # Additional fields for time exploration
    time_coordinate_name: Optional[str] = None
    time_units: Optional[str] = None
    time_values: Optional[List[str]] = None
    global_attributes: Dict[str, Any]

    class Config:
        from_attributes = True

class SliceResponse(BaseModel):
    slice_data: List[List[Optional[float]]]
    dimension_order: List[str]
    time_coord_name: str
    depth_coord_name: str
    lat_coord_name: str
    lon_coord_name: str
    actual_time: Any
    actual_depth: Any
    lat_vals: List[float]
    lon_vals: List[float]
    var_standard_name: str
    var_long_name: str
    var_units: str
    depth_units: str
    lat_units: str
    lon_units: str
    finite_count: int
    total_count: int
    missing_count: int
    tmin: Optional[float]
    tmax: Optional[float]
    tmean: Optional[float]
    var_name: str

    class Config:
        from_attributes = True


class ProfileGridMatch(BaseModel):
    latitude: float
    longitude: float
    latitude_index: int
    longitude_index: int


class ScalarProfileLevel(BaseModel):
    depth: float
    value: Optional[float]


class ScalarProfileResponse(BaseModel):
    dataset_id: str
    variable: str
    actual_time: str
    matched: ProfileGridMatch
    depth_units: str
    units: str
    levels: List[ScalarProfileLevel]


class CurrentProfileLevel(BaseModel):
    depth: float
    u: Optional[float]
    v: Optional[float]
    speed: Optional[float]
    direction_toward_degrees: Optional[float]


class CurrentProfileResponse(BaseModel):
    u_dataset_id: str
    v_dataset_id: str
    actual_time: str
    matched: ProfileGridMatch
    depth_units: str
    units: str
    levels: List[CurrentProfileLevel]
