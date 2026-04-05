FROM python:3.11-slim

# Install SQLCipher and build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlcipher-dev \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt requirements-prod.txt ./
RUN pip install --no-cache-dir -r requirements-prod.txt

COPY . .

RUN mkdir -p /app/data

EXPOSE 8000

# Single worker — SQLite doesn't support concurrent writes from multiple processes
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
