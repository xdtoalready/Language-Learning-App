#!/bin/bash
# scripts/logs.sh - Просмотр логов

service=${1:-all}

if [ "$service" = "all" ]; then
    echo "📋 Логи всех сервисов:"
    docker-compose logs -f
elif [ "$service" = "backend" ]; then
    echo "📋 Логи Backend:"
    docker-compose logs -f backend
elif [ "$service" = "frontend" ]; then
    echo "📋 Логи Frontend:"
    docker-compose logs -f frontend
elif [ "$service" = "db" ]; then
    echo "📋 Логи Database:"
    docker-compose logs -f postgres
else
    echo "❌ Неизвестный сервис. Используйте: backend, frontend, db или all"
fi