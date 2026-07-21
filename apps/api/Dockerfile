FROM python:3.12-slim@sha256:57cd7c3a7a273101a6485ba99423ee568157882804b1124b4dd04266317710de
WORKDIR /app
ENV PYTHONPATH=/app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --requirement /app/requirements.txt
COPY alembic.ini /app/alembic.ini
COPY alembic /app/alembic
COPY app /app/app
CMD ["sh", "-c", "alembic upgrade heads && exec uvicorn app.main:app --host 0.0.0.0 --port 8080"]
