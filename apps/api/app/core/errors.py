import logging
from dataclasses import dataclass

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


@dataclass
class AppError(Exception):
    code: str
    message: str
    status_code: int = 400
    details: dict | None = None


def app_error_response(err: AppError, request_id: str | None = None) -> JSONResponse:
    details = {**(err.details or {})}
    if request_id:
        details.setdefault("request_id", request_id)

    response = JSONResponse(
        status_code=err.status_code,
        content={
            "error": {
                "code": err.code,
                "message": err.message,
                "details": details,
            }
        },
    )
    if request_id:
        response.headers["X-Request-ID"] = request_id
    return response


def log_app_error(request: Request, exc: AppError) -> None:
    request_id = getattr(request.state, "request_id", None)
    logger.warning(
        "app_error",
        extra={
            "request_id": request_id,
            "error_code": exc.code,
            "status_code": exc.status_code,
            "error_message": exc.message,
            "details": exc.details or {},
            "method": request.method,
            "path": request.url.path,
            "query": str(request.url.query),
            "client_ip": request.client.host if request.client else None,
        },
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    log_app_error(request, exc)
    return app_error_response(exc, request_id=request_id)
