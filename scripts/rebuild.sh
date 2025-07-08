#!/bin/bash
# scripts/rebuild.sh - Пересборка с очисткой

echo "🔄 Пересборка Language Learning App..."

# Останавливаем и удаляем контейнеры
docker-compose down
docker-compose -f docker-compose.dev.yml down

# Удаляем образы
docker-compose down --rmi all

# Пересобираем
docker-compose up --build -d

echo "✅ Пересборка завершена!"