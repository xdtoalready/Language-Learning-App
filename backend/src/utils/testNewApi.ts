// backend/src/utils/testNewApi.ts
// Простой скрипт для тестирования новых API эндпоинтов

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  responseTime?: number;
}

class ApiTester {
  private token: string | null = null;
  private results: TestResult[] = [];

  private async request(
    endpoint: string, 
    method: string = 'GET', 
    body?: any,
    requireAuth: boolean = true
  ): Promise<{ status: number; data: any; time: number }> {
    const startTime = Date.now();
    
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (requireAuth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: any = {
      method,
      headers
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json();
      const time = Date.now() - startTime;

      return { status: response.status, data, time };
    } catch (error) {
      const time = Date.now() - startTime;
      return { status: 0, data: { error: error instanceof Error ? error.message : String(error) }, time };
    }
  }

  private addResult(endpoint: string, method: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, time?: number) {
    this.results.push({ endpoint, method, status, message, responseTime: time });
  }

  async testAuth() {
    console.log('🔐 Тестирование аутентификации...');

    // Тест логина
    const loginResult = await this.request('/auth/login', 'POST', {
      emailOrUsername: 'test@example.com',
      password: '123456'
    }, false);

    if (loginResult.status === 200 && loginResult.data.token) {
      this.token = loginResult.data.token;
      this.addResult('/auth/login', 'POST', 'PASS', 'Успешная аутентификация', loginResult.time);
      console.log('✅ Аутентификация успешна');
    } else {
      this.addResult('/auth/login', 'POST', 'FAIL', `Ошибка аутентификации: ${loginResult.data.error}`, loginResult.time);
      console.log('❌ Ошибка аутентификации');
      return false;
    }

    // Тест профиля
    const profileResult = await this.request('/auth/profile');
    if (profileResult.status === 200) {
      this.addResult('/auth/profile', 'GET', 'PASS', 'Профиль получен', profileResult.time);
      console.log('✅ Профиль получен');
    } else {
      this.addResult('/auth/profile', 'GET', 'FAIL', 'Ошибка получения профиля', profileResult.time);
      console.log('❌ Ошибка получения профиля');
    }

    return true;
  }

  async testReviewSessions() {
    console.log('\n📝 Тестирование сессий ревью...');

    // Тест создания ежедневной сессии
    const dailySessionResult = await this.request('/reviews/sessions', 'POST', {
      mode: 'RECOGNITION',
      sessionType: 'daily'
    });

    if (dailySessionResult.status === 200) {
      this.addResult('/reviews/sessions', 'POST', 'PASS', 'Ежедневная сессия создана', dailySessionResult.time);
      console.log('✅ Ежедневная сессия создана');

      const sessionId = dailySessionResult.data.session?.sessionId;
      if (sessionId) {
        // Тест получения текущего слова
        const currentWordResult = await this.request(`/reviews/sessions/${sessionId}/current`);
        if (currentWordResult.status === 200) {
          this.addResult(`/reviews/sessions/:id/current`, 'GET', 'PASS', 'Текущее слово получено', currentWordResult.time);
          console.log('✅ Текущее слово получено');
        } else {
          this.addResult(`/reviews/sessions/:id/current`, 'GET', 'FAIL', 'Ошибка получения слова', currentWordResult.time);
          console.log('❌ Ошибка получения текущего слова');
        }

        // Тест завершения сессии
        const endSessionResult = await this.request(`/reviews/sessions/${sessionId}`, 'DELETE');
        if (endSessionResult.status === 200) {
          this.addResult(`/reviews/sessions/:id`, 'DELETE', 'PASS', 'Сессия завершена', endSessionResult.time);
          console.log('✅ Сессия завершена');
        } else {
          this.addResult(`/reviews/sessions/:id`, 'DELETE', 'FAIL', 'Ошибка завершения сессии', endSessionResult.time);
          console.log('❌ Ошибка завершения сессии');
        }
      }
    } else {
      this.addResult('/reviews/sessions', 'POST', 'FAIL', `Ошибка создания сессии: ${dailySessionResult.data.error}`, dailySessionResult.time);
      console.log('❌ Ошибка создания ежедневной сессии');
    }

    // Тест создания тренировочной сессии
    const trainingSessionResult = await this.request('/reviews/sessions', 'POST', {
      mode: 'TRANSLATION_INPUT',
      sessionType: 'training',
      filterBy: {
        onlyActive: true
      }
    });

    if (trainingSessionResult.status === 200) {
      this.addResult('/reviews/sessions (training)', 'POST', 'PASS', 'Тренировочная сессия создана', trainingSessionResult.time);
      console.log('✅ Тренировочная сессия создана');
    } else {
      this.addResult('/reviews/sessions (training)', 'POST', 'FAIL', `Ошибка создания тренировочной сессии: ${trainingSessionResult.data.error}`, trainingSessionResult.time);
      console.log('❌ Ошибка создания тренировочной сессии');
    }
  }

  async testHints() {
    console.log('\n💡 Тестирование подсказок...');

    // Сначала получим любое слово для тестирования
    const wordsResult = await this.request('/words?limit=1');
    
    if (wordsResult.status === 200 && wordsResult.data.words.length > 0) {
      const wordId = wordsResult.data.words[0].id;

      // Тест подсказки длины
      const lengthHintResult = await this.request('/reviews/hint', 'POST', {
        wordId,
        hintType: 'length',
        currentHintsUsed: 0,
        direction: 'LEARNING_TO_NATIVE'
      });

      if (lengthHintResult.status === 200) {
        this.addResult('/reviews/hint (length)', 'POST', 'PASS', 'Подсказка длины получена', lengthHintResult.time);
        console.log('✅ Подсказка длины получена');
      } else {
        this.addResult('/reviews/hint (length)', 'POST', 'FAIL', 'Ошибка получения подсказки длины', lengthHintResult.time);
        console.log('❌ Ошибка получения подсказки длины');
      }

      // Тест подсказки первой буквы
      const letterHintResult = await this.request('/reviews/hint', 'POST', {
        wordId,
        hintType: 'first_letter',
        currentHintsUsed: 1,
        direction: 'LEARNING_TO_NATIVE'
      });

      if (letterHintResult.status === 200) {
        this.addResult('/reviews/hint (first_letter)', 'POST', 'PASS', 'Подсказка первой буквы получена', letterHintResult.time);
        console.log('✅ Подсказка первой буквы получена');
      } else {
        this.addResult('/reviews/hint (first_letter)', 'POST', 'FAIL', 'Ошибка получения подсказки первой буквы', letterHintResult.time);
        console.log('❌ Ошибка получения подсказки первой буквы');
      }
    } else {
      this.addResult('/reviews/hint', 'POST', 'SKIP', 'Нет слов для тестирования подсказок');
      console.log('⏭️ Нет слов для тестирования подсказок');
    }
  }

  async testTrainingGround() {
    console.log('\n🏋️ Тестирование тренировочного полигона...');

    // Тест получения активных слов
    const trainingWordsResult = await this.request('/reviews/training-words?limit=5');

    if (trainingWordsResult.status === 200) {
      this.addResult('/reviews/training-words', 'GET', 'PASS', `Получено ${trainingWordsResult.data.count} активных слов`, trainingWordsResult.time);
      console.log(`✅ Получено ${trainingWordsResult.data.count} активных слов для тренировки`);
    } else {
      this.addResult('/reviews/training-words', 'GET', 'FAIL', 'Ошибка получения активных слов', trainingWordsResult.time);
      console.log('❌ Ошибка получения активных слов');
    }

    // Тест фильтрации по тегам
    const filteredWordsResult = await this.request('/reviews/training-words?tags=test,example&masteryLevel=0,1,2');

    if (filteredWordsResult.status === 200) {
      this.addResult('/reviews/training-words (filtered)', 'GET', 'PASS', 'Фильтрация по тегам работает', filteredWordsResult.time);
      console.log('✅ Фильтрация по тегам работает');
    } else {
      this.addResult('/reviews/training-words (filtered)', 'GET', 'FAIL', 'Ошибка фильтрации', filteredWordsResult.time);
      console.log('❌ Ошибка фильтрации активных слов');
    }
  }

  async testLegacyCompatibility() {
    console.log('\n🔄 Тестирование обратной совместимости...');

    // Тест старого эндпоинта startReviewSession
    const legacyStartResult = await this.request('/reviews/start');

    if (legacyStartResult.status === 200) {
      this.addResult('/reviews/start (legacy)', 'GET', 'PASS', 'Старый эндпоинт работает', legacyStartResult.time);
      console.log('✅ Старый эндпоинт /reviews/start работает');
    } else {
      this.addResult('/reviews/start (legacy)', 'GET', 'FAIL', 'Старый эндпоинт не работает', legacyStartResult.time);
      console.log('❌ Старый эндпоинт /reviews/start не работает');
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ API');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    console.log(`\n📈 Общая статистика:`);
    console.log(`✅ Прошло: ${passed}`);
    console.log(`❌ Не прошло: ${failed}`);
    console.log(`⏭️ Пропущено: ${skipped}`);
    console.log(`📊 Всего: ${total}`);
    console.log(`🎯 Успешность: ${Math.round((passed / (total - skipped)) * 100)}%`);

    console.log(`\n🔍 Детальные результаты:`);
    this.results.forEach(result => {
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      const timeStr = result.responseTime ? ` (${result.responseTime}ms)` : '';
      console.log(`${statusIcon} ${result.method} ${result.endpoint} - ${result.message}${timeStr}`);
    });

    if (failed > 0) {
      console.log(`\n⚠️  Есть ошибки в API. Проверьте логи сервера.`);
    } else {
      console.log(`\n🎉 Все тесты прошли успешно! API готов к использованию.`);
    }
  }

  async runAllTests() {
    console.log('🚀 ЗАПУСК ТЕСТИРОВАНИЯ НОВЫХ API ЭНДПОИНТОВ');
    console.log('=' .repeat(60));

    const authSuccess = await this.testAuth();
    
    if (authSuccess) {
      await this.testReviewSessions();
      await this.testHints();
      await this.testTrainingGround();
      await this.testLegacyCompatibility();
    } else {
      console.log('⚠️ Пропускаем остальные тесты из-за ошибки аутентификации');
    }

    this.printResults();
  }
}

// Запуск тестов
async function main() {
  const tester = new ApiTester();
  await tester.runAllTests();
}

// Запускаем тесты, если файл запущен напрямую
if (require.main === module) {
  main().catch(console.error);
}

export { ApiTester };