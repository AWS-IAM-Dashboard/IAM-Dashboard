# Multi-stage build for Cybersecurity Dashboard
FROM node:20-alpine AS frontend-builder

# Set working directory
WORKDIR /app/frontend

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install

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

# Install system dependencies (robust, noninteractive)
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -o Acquire::Retries=3 -o Acquire::ForceIPv4=true && \
        apt-get install -y --no-install-recommends \
            ca-certificates \
            curl \
            apt-utils \
            build-essential \
            gcc \
            g++ \
        && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt requirements-postgres.txt ./

# Install Python dependencies (include PostgreSQL driver for Docker/Compose)
RUN pip install --no-cache-dir -r requirements.txt -r requirements-postgres.txt

# Copy Flask application
COPY backend/ ./backend/
COPY config/ ./config/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/build ./static

# Create necessary directories
RUN mkdir -p logs data/uploads

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set proper ownership of directories
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Run the application
CMD ["python", "backend/app.py"]
