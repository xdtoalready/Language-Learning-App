#!/bin/bash
# scripts/setup.sh - Первоначальная настройка

echo "⚙️ Настройка Language Learning App..."

# Создаем .env файлы если их нет
if [ ! -f backend/.env ]; then
    echo "📝 Создаем backend/.env..."
    cat > backend/.env << EOF
DATABASE_URL="postgresql://postgres:password123@localhost:5432/languageapp"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
EOF
fi

if [ ! -f frontend/.env.local ]; then
    echo "📝 Создаем frontend/.env.local..."
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api
EOF
fi

# Устанавливаем зависимости локально (для разработки без Docker)
echo "📦 Устанавливаем зависимости..."
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

echo "✅ Настройка завершена!"
echo ""
echo "🚀 Способы запуска:"
echo "1. С Docker: ./scripts/dev.sh"
echo "2. Без Docker: ./scripts/manual-dev.sh"
echo "3. Продакшн: ./scripts/start.sh"