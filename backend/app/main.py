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


@app.middleware("http")
async def normalize_vercel_rewrites(request: Request, call_next):
    """Normalize request path when routed through Vercel serverless rewrites."""
    # 1. Check explicit __path__ query param (passed by vercel.json rewrite)
    target_path = request.query_params.get("__path__")
    
    # 2. Check Vercel routing header if scope path is the entrypoint file
    if not target_path:
        matched_header = request.headers.get("x-matched-path")
        if matched_header and request.scope.get("path") in ("/api/index.py", "/api/index", "/api"):
            target_path = matched_header.split("?")[0]

    if target_path:
        # Normalize trailing slashes
        if len(target_path) > 1 and target_path.endswith("/"):
            target_path = target_path.rstrip("/")
        request.scope["path"] = target_path

    return await call_next(request)


# -----------------------------------------------------------------------------
# Frontend Static Files & SPA Catch-All Route
# -----------------------------------------------------------------------------
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse


def _find_frontend_dist() -> Path:
    candidates = [
        Path(__file__).resolve().parents[2] / "frontend" / "dist",
        Path(__file__).resolve().parents[1] / "frontend" / "dist",
        Path("/var/task/frontend/dist"),
        Path.cwd() / "frontend" / "dist",
    ]
    for c in candidates:
        if c.is_dir() and (c / "index.html").is_file():
            return c.resolve()
    return (Path(__file__).resolve().parents[2] / "frontend" / "dist").resolve()


frontend_dist = _find_frontend_dist()

if frontend_dist.is_dir():
    assets_dir = frontend_dist / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # 1. Do not catch unhandled /api calls as SPA routes
        if full_path.startswith("api/") or full_path == "api":
            return JSONResponse(status_code=404, content={"error": "not_found", "message": "API route not found."})

        # 2. Prevent /assets requests from ever falling back to index.html
        if full_path.startswith("assets/"):
            target_file = (frontend_dist / full_path).resolve()
            if target_file.is_file() and str(target_file).startswith(str(frontend_dist)):
                return FileResponse(target_file)
            return JSONResponse(status_code=404, content={"error": "asset_not_found", "message": f"Asset '{full_path}' not found."})

        # 3. Check for specific root static files (e.g. favicon.svg, robots.txt)
        target_file = (frontend_dist / full_path).resolve()
        if full_path and target_file.is_file() and str(target_file).startswith(str(frontend_dist)):
            return FileResponse(target_file)

        # 4. Fallback to index.html for SPA client-side routes (/records, /benchmark, etc.)
        index_file = frontend_dist / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)

        return JSONResponse(status_code=404, content={"error": "frontend_not_built", "message": "Frontend build index.html not found."})

