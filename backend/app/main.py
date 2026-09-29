from fastapi import FastAPI
from .api import api_router
from .api.observations import router as observations_router

app = FastAPI(title="Oceanographic Data API")

@app.get("/health")
async def health():
    return {"status": "ok"}

app.include_router(api_router, prefix="/api")
app.include_router(observations_router, prefix="")
