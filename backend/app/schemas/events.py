from typing import Literal

from pydantic import BaseModel, Field


class EventBounds(BaseModel):
    west: float = Field(ge=-180, le=180)
    south: float = Field(ge=-90, le=90)
    east: float = Field(ge=-180, le=180)
    north: float = Field(ge=-90, le=90)


class EventUnits(BaseModel):
    latitude: str
    longitude: str
    wind: str
    pressure: str


class EventSummary(BaseModel):
    id: str
    name: str
    event_type: Literal["tropical_cyclone"]
    basin: str
    region_id: str
    start_time: str
    end_time: str
    source: str
    source_event_id: str
    agency: str
    status: Literal["historical"]
    supported_analysis: list[str]
    provenance: str


class HistoricalOceanData(BaseModel):
    status: Literal["AVAILABLE", "UNAVAILABLE"]
    variables: list[str]
    dataset_ids: list[str]


class EventDetail(EventSummary):
    track_point_count: int = Field(ge=1)
    track_bounds: EventBounds
    duration_hours: float = Field(ge=0)
    maximum_wind: float | None
    minimum_pressure: float | None
    units: EventUnits
    source_series: str
    source_url: str
    retrieval_date: str
    historical_ocean_data: HistoricalOceanData


class EventTrackPoint(BaseModel):
    time: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    wind: float | None
    pressure: float | None
    status: str | None
    agency: str


class EventTrack(BaseModel):
    event_id: str
    source: str
    source_event_id: str
    agency: str
    source_series: str
    source_url: str
    source_file: str
    source_sha256: str
    retrieval_date: str
    units: EventUnits
    status_field: str
    point_count: int = Field(ge=1)
    bounds: EventBounds
    duration_hours: float = Field(ge=0)
    maximum_wind: float | None
    minimum_pressure: float | None
    points: list[EventTrackPoint]
