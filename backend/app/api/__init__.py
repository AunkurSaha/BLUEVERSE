from fastapi import APIRouter

from .datasets import router as datasets_router
from .events import router as events_router
from .historical_analysis import router as historical_analysis_router
from .regions import router as regions_router


api_router = APIRouter()
api_router.include_router(datasets_router)
api_router.include_router(events_router)
api_router.include_router(historical_analysis_router)
api_router.include_router(regions_router)
