FROM python:3.12-slim
WORKDIR /app
ENV PYTHONPATH=/app
COPY pyproject.toml /app/pyproject.toml
RUN pip install --no-cache-dir fastapi uvicorn[standard] sqlalchemy alembic pydantic pydantic-settings python-jose[cryptography] passlib[bcrypt] email-validator
COPY alembic.ini /app/alembic.ini
COPY alembic /app/alembic
COPY app /app/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
