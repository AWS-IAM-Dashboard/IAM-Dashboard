# Multi-stage build for Cybersecurity Dashboard
FROM node:20-alpine AS frontend-builder

# Set working directory
WORKDIR /app/frontend

# Copy package files
COPY package*.json ./

# Install dependencies deterministically (including dev dependencies for build)
RUN npm ci

# Copy source code and config files
COPY src/ ./src/
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./

# Build the frontend
RUN npm run build

# Python Flask backend stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Create non-root user up front so subsequent COPYs can set ownership at copy
# time rather than rewriting /app recursively later (avoids a large chown layer)
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy requirements first for better caching
COPY --chown=appuser:appuser requirements.txt requirements-postgres.txt ./

# Install system dependencies, Python packages, then remove build tools in a
# single layer so compiler toolchain never bloats the final image.
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -o Acquire::Retries=3 -o Acquire::ForceIPv4=true && \
        apt-get install -y --no-install-recommends \
            ca-certificates \
            curl \
            build-essential \
            gcc \
            g++ \
        && grep -Ev '^\s*(#|$)' requirements.txt \
           | grep -Ev '^\s*(pytest([-_][A-Za-z0-9]+)*|black|flake8)\s*([<>=!~].*)?$' \
           > /tmp/requirements-prod.txt \
        && pip install --no-cache-dir -r /tmp/requirements-prod.txt -r requirements-postgres.txt \
        && rm /tmp/requirements-prod.txt \
        && apt-get purge -y --auto-remove build-essential gcc g++ \
        && rm -rf /var/lib/apt/lists/*

# Copy Flask application with ownership set at copy time
COPY --chown=appuser:appuser backend/ ./backend/
COPY --chown=appuser:appuser config/ ./config/

# Copy built frontend from previous stage with ownership set at copy time
COPY --from=frontend-builder --chown=appuser:appuser /app/frontend/build ./static

# Ensure writable runtime directories exist and are owned by appuser
RUN mkdir -p logs data/uploads && chown appuser:appuser logs data/uploads

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Run the application
CMD ["python", "backend/app.py"]
