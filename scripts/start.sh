#!/bin/bash
# scripts/start.sh - Запуск в продакшн режиме

echo "🚀 Запуск Language Learning App в продакшн режиме..."

# Запускаем в production режиме
docker-compose up --build -d

echo "✅ Приложение запущено!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo "📊 API Health: http://localhost:5000/api/health"