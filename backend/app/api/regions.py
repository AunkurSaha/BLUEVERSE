from fastapi import APIRouter, HTTPException, Path

from ..schemas.regions import RegionDetail, RegionSummary
from ..services.region_service import region_service


router = APIRouter(prefix="/regions", tags=["regions"])


@router.get("", response_model=list[RegionSummary])
async def list_regions():
    return region_service.list_regions()


@router.get("/{region_id}", response_model=RegionDetail)
async def get_region(region_id: str = Path(..., description="Study region identifier")):
    region = region_service.get_region(region_id)
    if region is None:
        raise HTTPException(status_code=404, detail="Region not found.")
    return region
