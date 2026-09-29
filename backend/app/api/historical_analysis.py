from typing import Literal

from fastapi import APIRouter, HTTPException, Path, Query

from ..services.historical_analysis_service import historical_analysis_service


router = APIRouter()


def _bad_request(error: ValueError) -> HTTPException:
    if "not registered" in str(error) or "unavailable" in str(error):
        return HTTPException(status_code=404, detail=str(error))
    return HTTPException(status_code=400, detail=str(error))


@router.get("/events/{event_id}/ocean/config")
async def historical_ocean_configuration(event_id: str = Path(...)):
    try:
        return historical_analysis_service.configuration(event_id)
    except ValueError as error:
        raise _bad_request(error) from error


@router.get("/events/{event_id}/ocean/phase-mean")
async def historical_phase_mean(
    event_id: str = Path(...),
    variable: Literal["thetao", "so", "currents"] = Query(...),
    phase: Literal["before", "during", "after"] = Query(...),
    depth_index: int = Query(..., ge=0),
):
    try:
        return historical_analysis_service.phase_mean(event_id, variable, phase, depth_index)
    except ValueError as error:
        raise _bad_request(error) from error


@router.get("/events/{event_id}/ocean/difference")
async def historical_difference(
    event_id: str = Path(...),
    variable: Literal["thetao", "so"] = Query(...),
    comparison: Literal["during-before", "after-before"] = Query(...),
    depth_index: int = Query(..., ge=0),
):
    try:
        return historical_analysis_service.difference(event_id, variable, comparison, depth_index)
    except ValueError as error:
        raise _bad_request(error) from error


@router.get("/events/{event_id}/ocean/probe")
async def historical_probe(
    event_id: str = Path(...),
    requested_event_time: str = Query(...),
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    try:
        return historical_analysis_service.probe(event_id, requested_event_time, latitude, longitude)
    except ValueError as error:
        raise _bad_request(error) from error
