from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class DatasetMetadata(BaseModel):
    dataset_id: str
    file_path: str
    dimensions: Dict[str, int]
    variables: List[str]
    time_coordinate: Optional[str]
    vertical_coordinate: Optional[str]
    latitude_coordinate: Optional[str]
    longitude_coordinate: Optional[str]
    global_attributes: Dict[str, Any]

    class Config:
        from_attributes = True

class SliceResponse(BaseModel):
    slice_data: List[List[Optional[float]]]
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
