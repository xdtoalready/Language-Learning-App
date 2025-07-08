#!/bin/bash
# scripts/manual-dev.sh - Запуск без Docker

echo "🚀 Запуск без Docker (ручной режим)..."

# Проверяем PostgreSQL
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL не запущен на localhost:5432"
    echo "Запустите PostgreSQL или используйте Docker: ./scripts/dev.sh"
    exit 1
fi

# Запускаем Backend в фоне
echo "🔧 Запуск Backend..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Ждем запуска backend
sleep 3

# Запускаем Frontend
echo "🌐 Запуск Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Приложение запущено!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo ""
echo "Для остановки нажмите Ctrl+C"

# Ожидаем сигнал завершения
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait