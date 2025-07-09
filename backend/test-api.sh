#!/bin/bash
# backend/test-api.sh
# Скрипт для тестирования новых API эндпоинтов

echo "🧪 Тестирование новых API эндпоинтов..."
echo ""

cd "$(dirname "$0")"

# Проверяем, что сервер запущен
echo "🔍 Проверка доступности сервера..."
if ! curl -s http://localhost:5000/api/health > /dev/null; then
    echo "❌ Сервер не запущен на порту 5000"
    echo "Запустите сервер командой: npm run dev"
    exit 1
fi

echo "✅ Сервер доступен"
echo ""

# Проверяем наличие тестового файла
if [ ! -f "src/utils/testNewApi.ts" ]; then
    echo "❌ Файл testNewApi.ts не найден"
    echo "Убедитесь, что вы создали файл src/utils/testNewApi.ts"
    exit 1
fi

# Устанавливаем node-fetch если нужно
if ! npm list node-fetch > /dev/null 2>&1; then
    echo "📦 Установка node-fetch..."
    npm install --save-dev node-fetch @types/node-fetch
fi

# Запускаем тесты
echo "🚀 Запуск тестов новых API..."
npx ts-node src/utils/testNewApi.ts

echo ""
echo "📋 Описание новых эндпоинтов:"
echo ""
echo "🔄 Сессии ревью:"
echo "  POST /api/reviews/sessions - Создать сессию"
echo "  GET  /api/reviews/sessions/:id/current - Текущее слово"
echo "  POST /api/reviews/sessions/:id/submit - Отправить ревью"
echo "  DELETE /api/reviews/sessions/:id - Завершить сессию"
echo ""
echo "💡 Подсказки:"
echo "  POST /api/reviews/hint - Получить подсказку"
echo ""
echo "🏋️ Тренировочный полигон:"
echo "  GET /api/reviews/training-words - Активные слова"
echo ""
echo "📖 Документация API доступна в файлах:"
echo "  - backend/src/controllers/reviewController.ts"
echo "  - backend/src/routes/reviewRoutes.ts"