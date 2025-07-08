#!/bin/bash

# ===========================================
# ТЕСТИРОВАНИЕ BACKEND API - Все команды в одну строку
# ===========================================

echo "🚀 Начинаем тестирование Backend API..."

# 1. ПРОВЕРКА ЗДОРОВЬЯ СЕРВЕРА
echo "📊 1. Проверка health endpoint..."
curl -s http://localhost:5000/api/health | jq .

echo -e "\n"

# 2. РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ  
echo "👤 2. Регистрация пользователя..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"email":"test3@example.com","username":"testuser3","password":"123456","learningLanguage":"Korean"}')
echo $REGISTER_RESPONSE | jq .

# Извлекаем токен из ответа
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
echo "🔑 Токен: $TOKEN"

echo -e "\n"

# 3. АВТОРИЗАЦИЯ
echo "🔐 3. Авторизация пользователя..."
curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"emailOrUsername":"test3@example.com","password":"123456"}' | jq .

echo -e "\n"

# 4. ПОЛУЧЕНИЕ ПРОФИЛЯ
echo "👨‍💼 4. Получение профиля..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/auth/me | jq .

echo -e "\n"

# 5. ДОБАВЛЕНИЕ СЛОВ
echo "📝 5. Добавление слов..."

echo "Добавляем слово 1..."
curl -s -X POST http://localhost:5000/api/words -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"word":"안녕하세요","translation":"Здравствуйте","transcription":"annyeonghaseyo","example":"안녕하세요, 만나서 반갑습니다","tags":["приветствие","формальное"]}' | jq .

echo "Добавляем слово 2..."
curl -s -X POST http://localhost:5000/api/words -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"word":"감사합니다","translation":"Спасибо","transcription":"gamsahamnida","example":"도움을 주셔서 감사합니다","tags":["благодарность","формальное"]}' | jq .

echo "Добавляем слово 3..."
curl -s -X POST http://localhost:5000/api/words -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"word":"물","translation":"Вода","transcription":"mul","example":"물을 마시다","tags":["еда","напитки"]}' | jq .

echo -e "\n"

# 6. ПОЛУЧЕНИЕ ВСЕХ СЛОВ
echo "📚 6. Получение всех слов..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/words | jq .

echo -e "\n"

# 7. ПОИСК СЛОВ
echo "🔍 7. Поиск слов..."
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/words?search=안녕" | jq .

echo -e "\n"

# 8. СЛОВА ДЛЯ ПОВТОРЕНИЯ
echo "🎯 8. Слова для повторения сегодня..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/words/due | jq .

echo -e "\n"

# 9. НАЧАЛО СЕССИИ ПОВТОРЕНИЯ
echo "🎮 9. Начало сессии повторения..."
SESSION_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/reviews/session/start)
echo $SESSION_RESPONSE | jq .

# Извлекаем ID слова для ревью
WORD_ID=$(echo $SESSION_RESPONSE | jq -r '.word.id')
echo "📝 ID слова для ревью: $WORD_ID"

echo -e "\n"

# 10. ОТПРАВКА РЕЗУЛЬТАТА РЕВЬЮ
if [ "$WORD_ID" != "null" ] && [ "$WORD_ID" != "" ]; then
    echo "✅ 10. Отправка результата ревью (оценка: 3)..."
    curl -s -X POST http://localhost:5000/api/reviews -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "{\"wordId\":\"$WORD_ID\",\"rating\":3}" | jq .
else
    echo "❌ 10. Нет слов для ревью"
fi

echo -e "\n"

# 11. СТАТИСТИКА СЛОВ
echo "📊 11. Статистика слов..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/words/stats | jq .

echo -e "\n"

# 12. ОБЩАЯ СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ
echo "📈 12. Общая статистика пользователя..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/stats | jq .

echo -e "\n"

# 13. СТАТИСТИКА РЕВЬЮ
echo "📊 13. Статистика ревью..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/reviews/stats | jq .

echo -e "\n"

# 14. СЛОЖНЫЕ СЛОВА
echo "😰 14. Самые сложные слова..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/stats/difficult-words | jq .

echo -e "\n"

# 15. ОБНОВЛЕНИЕ ДНЕВНОЙ ЦЕЛИ
echo "🎯 15. Обновление дневной цели..."
curl -s -X PUT http://localhost:5000/api/stats/daily-goal -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"dailyGoal":15}' | jq .

echo -e "\n"

echo "✅ Тестирование завершено!"
