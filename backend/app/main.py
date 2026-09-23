from fastapi import FastAPI
from .api import api_router

app = FastAPI(title="Oceanographic Data API")

app.include_router(api_router, prefix="/api")
