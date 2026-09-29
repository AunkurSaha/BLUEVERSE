from fastapi import APIRouter, HTTPException, Query, Path
from typing import List, Optional
import logging

from backend.app.services.argo_service import ArgoService
from backend.app.services.collocation_service import CollocationService
from backend.app.services.glider_service import GliderService
from backend.app.schemas.argo import ArgoProfileSummary, ArgoProfileDetail
from backend.app.schemas.collocation import ArgoModelCollocation
from backend.app.schemas.glider import (
    GliderMissionSummary,
    GliderMissionDetail,
    GliderTrajectoryPoint,
    GliderProfileSummary,
    GliderProfileDetail,
    GliderCurtainResponse
)

router = APIRouter(prefix="/api/observations", tags=["observations"])

# Initialize services
argo_service = ArgoService()
collocation_service = CollocationService()
glider_service = GliderService()

logger = logging.getLogger(__name__)


@router.get("/argo", response_model=List[ArgoProfileSummary])
def list_argo_profiles(
    min_lat: Optional[float] = Query(None, description="Minimum latitude"),
    max_lat: Optional[float] = Query(None, description="Maximum latitude"),
    min_lon: Optional[float] = Query(None, description="Minimum longitude"),
    max_lon: Optional[float] = Query(None, description="Maximum longitude"),
    start_time: Optional[str] = Query(None, description="Start time (ISO 8601)"),
    end_time: Optional[str] = Query(None, description="End time (ISO 8601)")
):
    """
    Get summaries of all discoverable primary ARGO profiles.
    Supports filtering by geographic bounding box and time range.
    """
    profiles = argo_service.get_argo_profiles()

    # Apply filters
    filtered = []
    for profile in profiles:
        # Latitude filter
        if min_lat is not None and profile["latitude"] is not None and profile["latitude"] < min_lat:
            continue
        if max_lat is not None and profile["latitude"] is not None and profile["latitude"] > max_lat:
            continue
        # Longitude filter
        if min_lon is not None and profile["longitude"] is not None and profile["longitude"] < min_lon:
            continue
        if max_lon is not None and profile["longitude"] is not None and profile["longitude"] > max_lon:
            continue
        # Time filter
        if start_time is not None and profile["observation_time"] is not None:
            if profile["observation_time"] < start_time:
                continue
        if end_time is not None and profile["observation_time"] is not None:
            if profile["observation_time"] > end_time:
                continue
        filtered.append(profile)

    return filtered


@router.get("/argo/{profile_id}", response_model=ArgoProfileDetail)
def get_argo_profile(profile_id: str):
    """
    Get a specific ARGO profile by its ID (platform_number-cycle_number).
    """
    profile_data = argo_service.get_argo_profile(profile_id)
    if profile_data is None:
        raise HTTPException(status_code=404, detail=f"ARGO profile not found: {profile_id}")
    # Merge summary and levels into a flat structure for the detail endpoint
    merged = {**profile_data["summary"], "levels": profile_data["levels"]}
    return merged


@router.get("/argo/{profile_id}/collocation", response_model=ArgoModelCollocation)
def get_argo_collocation(profile_id: str):
    """
    Get collocation of a specific ARGO profile with the model.
    """
    result = collocation_service.collocate_profile(profile_id)
    # If the result indicates an error (like not_found), we should raise an HTTPException
    if result.get("status") == "not_found":
        raise HTTPException(status_code=404, detail=result.get("error", "ARGO profile not found"))
    # For other statuses, we return the result as is (they will be serialized by the response_model)
    return result


# GLIDER ENDPOINTS


@router.get("/gliders", response_model=List[GliderMissionSummary])
def list_glider_missions():
    """
    Get summaries of all discoverable Glider missions.
    """
    try:
        # For now, we only have one hardcoded mission
        return glider_service.list_missions()
    except Exception as e:
        logger.error(f"Error listing glider missions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/gliders/{mission_id}", response_model=GliderMissionDetail)
def get_glider_mission(
    mission_id: str = Path(..., description="Glider mission identifier")
):
    """
    Get detailed information for a specific Glider mission.
    """
    try:
        # Validate mission_id
        return glider_service.mission_detail(mission_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Glider mission not found: {mission_id}")
    except Exception as e:
        logger.error(f"Error getting glider mission {mission_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/gliders/{mission_id}/trajectory", response_model=List[GliderTrajectoryPoint])
def get_glider_trajectory(
    mission_id: str = Path(..., description="Glider mission identifier")
):
    """
    Get the trajectory points for a Glider mission.
    """
    try:
        # Validate mission_id
        return glider_service.trajectory(mission_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Glider mission not found: {mission_id}")
    except Exception as e:
        logger.error(f"Error getting glider trajectory for mission {mission_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/gliders/{mission_id}/profiles/{profile_index}", response_model=GliderProfileDetail)
def get_glider_profile(
    mission_id: str = Path(..., description="Glider mission identifier"),
    profile_index: int = Path(..., ge=0, description="Profile index")
):
    """
    Get detailed data for a specific profile in a Glider mission.
    """
    try:
        # Validate mission_id
        return glider_service.profile_detail(mission_id, profile_index)
    except (ValueError, IndexError) as e:
        # Handle invalid profile index
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting glider profile for mission {mission_id}, profile {profile_index}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/gliders/{mission_id}/profiles/{profile_index}/summary", response_model=GliderProfileSummary)
def get_glider_profile_summary(
    mission_id: str = Path(..., description="Glider mission identifier"),
    profile_index: int = Path(..., ge=0, description="Profile index")
):
    """
    Get summary information for a specific profile in a Glider mission.
    """
    try:
        # Validate mission_id
        return glider_service.profile_summary(mission_id, profile_index)
    except (ValueError, IndexError) as e:
        # Handle invalid profile index
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting glider profile summary for mission {mission_id}, profile {profile_index}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/gliders/{mission_id}/curtain", response_model=GliderCurtainResponse)
def get_glider_curtain(
    mission_id: str = Path(..., description="Glider mission identifier"),
    variable: str = Query(..., description="Variable to extract (temperature, salinity, chlorophyll_a)"),
    depth_bin_m: Optional[float] = Query(None, description="Depth bin size in meters (optional)")
):
    """
    Get curtain data for a Glider mission.
    """
    try:
        # Validate mission_id
        return glider_service.curtain(mission_id, variable, depth_bin_m or 10.0)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting glider curtain for mission {mission_id}, variable {variable}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
