#!/bin/bash
# scripts/stop.sh - Остановка всех сервисов

echo "🛑 Остановка Language Learning App..."

# Останавливаем все контейнеры
docker-compose down
docker-compose -f docker-compose.dev.yml down

echo "✅ Все сервисы остановлены"