import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import analysis, ecg, experiments, health, history, model, upload
from app.core.config import settings
from app.core.errors import AppError
from app.core.logging_config import setup_logging

from contextlib import asynccontextmanager
from app.services.inference_service import get_inference_service

setup_logging(settings.log_level)
logger = logging.getLogger(__name__)

for target_dir in (settings.mitbih_dir, settings.uploads_dir, settings.models_dir):
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        service = get_inference_service()
        if settings.frozen_model_path.is_file():
            service.load_model()
            logger.info("Frozen ML model loaded successfully on startup.")
        else:
            logger.info("Model file not found on startup at %s. Model will be loaded/materialized on request.", settings.frozen_model_path)
    except Exception as exc:
        logger.error("Failed to load ML model during application startup: %s", exc, exc_info=True)
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"], allow_headers=["*"],
)

for r in (health, upload, ecg, analysis, history, model, experiments):
    app.include_router(r.router, prefix="/api")
    # Also register without prefix so serverless function routes match /api/... and /... identically
    app.include_router(r.router)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.code, "message": exc.message})


@app.exception_handler(Exception)
async def unhandled_handler(_: Request, exc: Exception):
    logger.exception("Unhandled error")  # full trace stays in server logs only
    return JSONResponse(status_code=500, content={"error": "internal_error",
                                                  "message": "An internal error occurred."})


# -----------------------------------------------------------------------------
# Frontend Static Files & SPA Catch-All Route
# -----------------------------------------------------------------------------
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Locate frontend/dist relative to project root
_project_root = Path(__file__).resolve().parents[2]
frontend_dist = (_project_root / "frontend" / "dist").resolve()

if frontend_dist.is_dir():
    assets_dir = frontend_dist / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Do not catch unhandled /api calls as SPA routes
        if full_path.startswith("api/") or full_path == "api":
            return JSONResponse(status_code=404, content={"error": "not_found", "message": "API route not found."})
        target_file = (frontend_dist / full_path).resolve()
        if full_path and target_file.is_file() and str(target_file).startswith(str(frontend_dist)):
            return FileResponse(target_file)
        index_file = frontend_dist / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"error": "frontend_not_built", "message": "Frontend build index.html not found."})

