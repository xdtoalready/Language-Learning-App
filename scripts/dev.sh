#!/bin/bash
# scripts/dev.sh - Запуск в режиме разработки

echo "🚀 Запуск Language Learning App в режиме разработки..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Устанавливаем вручную..."
    echo "Backend: cd backend && npm run dev"
    echo "Frontend: cd frontend && npm run dev"
    exit 1
fi

# Запускаем в development режиме
docker-compose -f docker-compose.dev.yml up --build