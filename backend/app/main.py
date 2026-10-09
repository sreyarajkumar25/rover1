"""FastAPI application initialization, middleware wiring, routers, and healthcheck."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.compare import router as compare_router
from backend.app.api.runs import router as runs_router
from backend.app.api.strategies import router as strategies_router
from backend.app.api.ws import router as ws_router
from backend.app.config import settings
from backend.app.middleware.errors import register_error_handlers
from backend.app.middleware.logging import RequestLoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup initialization
    yield
    # Graceful shutdown cleanup


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="High-performance simulation engine and mission control telemetry API for autonomous planetary rovers.",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging and error handling middleware
app.add_middleware(RequestLoggingMiddleware)
register_error_handlers(app)

# Register API routes
app.include_router(runs_router)
app.include_router(compare_router)
app.include_router(strategies_router)
app.include_router(ws_router)


@app.get("/health", tags=["Health"])
def healthcheck():
    """Service health and readiness check."""
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
