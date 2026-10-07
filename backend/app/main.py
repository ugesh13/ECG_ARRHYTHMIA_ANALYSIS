import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import analysis, ecg, health, history, upload
from app.core.config import settings
from app.core.errors import AppError
from app.core.logging_config import setup_logging

from contextlib import asynccontextmanager
from app.services.inference_service import get_inference_service

setup_logging(settings.log_level)
logger = logging.getLogger(__name__)

settings.mitbih_dir.mkdir(parents=True, exist_ok=True)
settings.uploads_dir.mkdir(parents=True, exist_ok=True)
settings.models_dir.mkdir(parents=True, exist_ok=True)


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

for r in (health, upload, ecg, analysis, history):
    app.include_router(r.router, prefix="/api")


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.code, "message": exc.message})


@app.exception_handler(Exception)
async def unhandled_handler(_: Request, exc: Exception):
    logger.exception("Unhandled error")  # full trace stays in server logs only
    return JSONResponse(status_code=500, content={"error": "internal_error",
                                                  "message": "An internal error occurred."})
