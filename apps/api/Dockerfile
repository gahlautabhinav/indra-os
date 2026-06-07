FROM python:3.11-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

FROM base AS development
COPY pyproject.toml .
RUN pip install -e ".[dev]"
COPY . .
CMD ["uvicorn", "indra.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS builder
COPY pyproject.toml .
RUN pip install --no-cache-dir .
COPY . .

FROM base AS production
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /app /app
EXPOSE 8000
CMD ["uvicorn", "indra.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
