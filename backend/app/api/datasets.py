from fastapi import APIRouter, HTTPException, Path, Query
from typing import List, Optional, Dict, Any
from ..services.netcdf_service import NetCDFService
from ..services.dataset_registry import dataset_registry
from ..schemas.dataset import DatasetMetadata, SliceResponse

router = APIRouter()
service = NetCDFService()

@router.get("/health")
async def health():
    return {"status": "ok"}

@router.get("/datasets", response_model=List[str])
async def list_datasets():
    """Return a list of registered dataset IDs."""
    return dataset_registry.list_ids()

@router.get("/datasets/{dataset_id}/metadata", response_model=DatasetMetadata)
async def get_dataset_metadata(dataset_id: str = Path(..., description="The dataset ID")):
    """Get metadata for a dataset."""
    try:
        return service.get_dataset_metadata(dataset_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unable to read dataset metadata.")

@router.get("/datasets/{dataset_id}/slice", response_model=SliceResponse)
async def get_slice(
    dataset_id: str = Path(..., description="The dataset ID"),
    variable: str = Query(..., description="Variable name to slice"),
    time_index: int = Query(0, ge=0, description="Time index"),
    depth_index: int = Query(0, ge=0, description="Depth index")
):
    """Get a slice of data and metadata for a variable at given time and depth indices."""
    try:
        return service.get_slice(dataset_id, variable, time_index, depth_index)
    except ValueError as e:
        if "not registered" in str(e):
            raise HTTPException(status_code=404, detail="Dataset not found.")
        raise HTTPException(status_code=400, detail="Unable to read the requested slice.")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unable to read the requested slice.")
