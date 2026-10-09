"""Request logging middleware for FastAPI."""

import logging
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("mission_control.access")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000.0, 2)
        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)"
        )
        return response
