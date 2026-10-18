FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TESSERACT_LANG=eng+spa \
    CUENTRA_DATA_FILE=/app/backend/data/runtime_state.json

RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 appuser

WORKDIR /app
COPY backend/pyproject.toml backend/README.md ./backend/
COPY backend/app ./backend/app
COPY backend/data ./backend/data
RUN pip install ./backend \
    && mkdir -p /app/backend/data \
    && chown -R appuser:appuser /app/backend/data

USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
