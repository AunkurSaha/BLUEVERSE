from fastapi import APIRouter, HTTPException, Path

from ..schemas.events import EventDetail, EventSummary, EventTrack
from ..services.event_service import event_service


router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventSummary])
async def list_events():
    return event_service.list_events()


@router.get("/{event_id}", response_model=EventDetail)
async def get_event(event_id: str = Path(..., description="Historical event identifier")):
    event = event_service.get_event(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Historical event not found.")
    return event


@router.get("/{event_id}/track", response_model=EventTrack)
async def get_event_track(event_id: str = Path(..., description="Historical event identifier")):
    track = event_service.get_track(event_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Historical event not found.")
    return track
