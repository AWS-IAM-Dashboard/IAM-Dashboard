#!/bin/bash

# Cybersecurity Dashboard Setup Script
# This script sets up the development environment for the team

set -e

echo "🚀 Setting up Cybersecurity Dashboard..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs data/uploads config/grafana/dashboards

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please update .env file with your AWS credentials"
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

# Test the application
echo "🧪 Testing the application..."
if curl -f http://localhost:5000/api/v1/health > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
    echo ""
    echo "🎉 Setup complete! Your Cybersecurity Dashboard is ready:"
    echo "   📊 Main Dashboard: http://localhost:5001"
    echo "   📈 Grafana: http://localhost:3000 (admin/admin)"
    echo "   📊 Prometheus: http://localhost:9090"
    echo ""
    echo "📚 Next steps:"
    echo "   1. Update .env file with your AWS credentials"
    echo "   2. Visit http://localhost:5001 to see the dashboard"
    echo "   3. Check docs/onboarding/TEAM_SETUP.md for detailed documentation"
else
    echo "❌ Application is not responding. Check logs with: docker-compose logs"
fi

echo ""
echo "🛠️  Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Rebuild: docker-compose up --build -d"
