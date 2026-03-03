from dataclasses import dataclass
from fastapi import Request
from fastapi.responses import JSONResponse


@dataclass
class AppError(Exception):
    code: str
    message: str
    status_code: int = 400
    details: dict | None = None


def app_error_response(err: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=err.status_code,
        content={
            "error": {
                "code": err.code,
                "message": err.message,
                "details": err.details or {},
            }
        },
    )


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return app_error_response(exc)
