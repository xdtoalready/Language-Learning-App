// backend/src/utils/__tests__/inputEvaluation.test.ts

import {
  evaluateInput,
  generateHint,
  validateInputRealtime,
  calculateInputAccuracy
} from '../inputEvaluation';

describe('Input Evaluation System', () => {
  
  describe('evaluateInput', () => {
    
    // Тест точного совпадения
    describe('Exact matches', () => {
      test('should return score 4 for exact match', () => {
        const result = evaluateInput('привет', 'привет');
        expect(result.score).toBe(4);
        expect(result.reason).toBe('exact');
        expect(result.similarity).toBe(1.0);
      });

      test('should ignore case', () => {
        const result = evaluateInput('ПРИВЕТ', 'привет');
        expect(result.score).toBe(4);
        expect(result.reason).toBe('exact');
      });

      test('should handle whitespace correctly', () => {
        const result = evaluateInput('  привет  ', 'привет');
        expect(result.score).toBe(4);
        expect(result.reason).toBe('exact');
      });
    });

    // Тест опечаток
    describe('Typos', () => {
      test('should detect simple typos', () => {
        const result = evaluateInput('превет', 'привет'); // и → е
        expect(result.score).toBe(3);
        expect(result.reason).toBe('typo');
        expect(result.similarity).toBeGreaterThan(0.8);
      });

      test('should detect multiple typos', () => {
        const result = evaluateInput('превт', 'привет'); // и → е, missing е
        expect(result.score).toBe(3);
        expect(result.reason).toBe('typo');
      });

      test('should not accept too many typos', () => {
        const result = evaluateInput('прв', 'привет'); // too many missing letters
        expect(result.score).toBe(1);
        expect(result.reason).toBe('wrong');
      });
    });

    // Тест синонимов
    describe('Synonyms', () => {
      test('should accept synonyms', () => {
        const synonyms = ['здравствуй', 'хай'];
        const result = evaluateInput('здравствуй', 'привет', synonyms);
        expect(result.score).toBe(3);
        expect(result.reason).toBe('synonym');
        expect(result.similarity).toBe(1.0);
      });

      test('should handle synonym with different case', () => {
        const synonyms = ['ЗДРАВСТВУЙ'];
        const result = evaluateInput('здравствуй', 'привет', synonyms);
        expect(result.score).toBe(3);
        expect(result.reason).toBe('synonym');
      });
    });

    // Тест пробелов
    describe('Space validation', () => {
      test('should require spaces when present in correct answer', () => {
        const result = evaluateInput('добрыйдень', 'добрый день');
        expect(result.score).toBe(1);
        expect(result.reason).toBe('wrong');
      });

      test('should accept correct spaces', () => {
        const result = evaluateInput('добрый день', 'добрый день');
        expect(result.score).toBe(4);
        expect(result.reason).toBe('exact');
      });

      test('should reject spaces when not in correct answer', () => {
        const result = evaluateInput('при вет', 'привет');
        expect(result.score).toBe(1);
        expect(result.reason).toBe('wrong');
      });

      test('should handle multiple spaces', () => {
        const result = evaluateInput('очень  хорошо', 'очень хорошо');
        expect(result.score).toBe(4); // multiple spaces normalized to single
        expect(result.reason).toBe('exact');
      });
    });

    // Тест подсказок
    describe('Hints penalty', () => {
      test('should reduce score when hints are used', () => {
        const result = evaluateInput('привет', 'привет', [], 1);
        expect(result.score).toBe(2);
        expect(result.reason).toBe('hint_used');
      });

      test('should apply hint penalty to synonyms', () => {
        const synonyms = ['здравствуй'];
        const result = evaluateInput('здравствуй', 'привет', synonyms, 1);
        expect(result.score).toBe(2);
        expect(result.reason).toBe('hint_used');
      });

      test('should apply hint penalty to typos', () => {
        const result = evaluateInput('превет', 'привет', [], 2);
        expect(result.score).toBe(2);
        expect(result.reason).toBe('hint_used');
      });
    });

    // Тест неправильных ответов
    describe('Wrong answers', () => {
      test('should return score 1 for completely wrong answer', () => {
        const result = evaluateInput('кот', 'собака');
        expect(result.score).toBe(1);
        expect(result.reason).toBe('wrong');
        expect(result.suggestions).toContain('собака');
      });

      test('should return score 1 for empty input', () => {
        const result = evaluateInput('', 'привет');
        expect(result.score).toBe(1);
        expect(result.reason).toBe('wrong');
      });

      test('should return score 1 for whitespace only', () => {
        const result = evaluateInput('   ', 'привет');
        expect(result.score).toBe(1);
        expect(result.reason).toBe('wrong');
      });
    });

    // Тест предложений исправлений
    describe('Suggestions', () => {
      test('should provide suggestions for wrong answers', () => {
        const synonyms = ['здравствуй', 'хай'];
        const result = evaluateInput('кот', 'привет', synonyms);
        expect(result.suggestions).toContain('привет');
        expect(result.suggestions).toContain('здравствуй');
        expect(result.suggestions).toContain('хай');
      });

      test('should limit suggestions to 3', () => {
        const synonyms = ['здравствуй', 'хай', 'салют', 'йо'];
        const result = evaluateInput('кот', 'привет', synonyms);
        expect(result.suggestions).toHaveLength(3);
      });
    });
  });

  describe('generateHint', () => {
    test('should generate length hint', () => {
      const hint = generateHint('привет', 'length', 0);
      expect(hint.content).toBe('6 символов');
      expect(hint.penalty).toBe(true);
    });

    test('should generate length hint with spaces', () => {
      const hint = generateHint('добрый день', 'length', 0);
      expect(hint.content).toBe('11 символов (включая 1 пробел)');
      expect(hint.penalty).toBe(true);
    });

    test('should generate first letter hint', () => {
      const hint = generateHint('привет', 'first_letter', 1);
      expect(hint.content).toBe('Начинается с: "п"');
      expect(hint.penalty).toBe(true);
    });

    test('should handle multiple spaces in length hint', () => {
      const hint = generateHint('очень хорошо отлично', 'length', 0);
      expect(hint.content).toBe('20 символов (включая 2 пробела)');
    });
  });

  describe('validateInputRealtime', () => {
    test('should validate correct input', () => {
      const result = validateInputRealtime('привет', 'привет');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing spaces', () => {
      const result = validateInputRealtime('добрыйдень', 'добрый день');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('В ответе должны быть пробелы');
    });

    test('should detect extra spaces', () => {
      const result = validateInputRealtime('при вет', 'привет');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('В ответе не должно быть пробелов');
    });

    test('should warn about too long input', () => {
      const result = validateInputRealtime('очень длинный неправильный ответ', 'кот');
      expect(result.warnings).toContain('Ответ кажется слишком длинным');
    });
  });

  describe('calculateInputAccuracy', () => {
    test('should calculate excellent accuracy', () => {
      const result = calculateInputAccuracy({ correct: 9, attempts: 10 });
      expect(result.accuracy).toBe(0.9);
      expect(result.level).toBe('excellent');
    });

    test('should calculate good accuracy', () => {
      const result = calculateInputAccuracy({ correct: 7, attempts: 10 });
      expect(result.accuracy).toBe(0.7);
      expect(result.level).toBe('good');
    });

    test('should calculate needs practice accuracy', () => {
      const result = calculateInputAccuracy({ correct: 5, attempts: 10 });
      expect(result.accuracy).toBe(0.5);
      expect(result.level).toBe('needs_practice');
    });

    test('should handle zero attempts', () => {
      const result = calculateInputAccuracy({ correct: 0, attempts: 0 });
      expect(result.accuracy).toBe(0);
      expect(result.level).toBe('needs_practice');
    });
  });

  // Интеграционные тесты для реальных сценариев
  describe('Real-world scenarios', () => {
    test('Korean to Russian translation', () => {
      const result = evaluateInput('привет', '안녕하세요');
      // Это неправильно, но тестируем что система работает
      expect(result.score).toBe(1);
      expect(result.reason).toBe('wrong');
    });

    test('Russian with typo and hints', () => {
      const result = evaluateInput('превет', 'привет', [], 1);
      expect(result.score).toBe(2); // typo would be 3, but hint penalty makes it 2
      expect(result.reason).toBe('hint_used');
    });

    test('Multiple word translation', () => {
      const result = evaluateInput('добрый день', 'добрый день');
      expect(result.score).toBe(4);
      expect(result.reason).toBe('exact');
      expect(result.similarity).toBe(1.0);
    });

    test('Synonym with spaces', () => {
      const synonyms = ['доброе утро'];
      const result = evaluateInput('доброе утро', 'добрый день', synonyms);
      expect(result.score).toBe(3);
      expect(result.reason).toBe('synonym');
    });
  });
});

// Команда для запуска тестов:
// npm test inputEvaluation.test.ts

/* 
Примеры использования:

1. Точное совпадение:
   evaluateInput('привет', 'привет') → { score: 4, reason: 'exact' }

2. Опечатка:
   evaluateInput('превет', 'привет') → { score: 3, reason: 'typo' }

3. Синоним:
   evaluateInput('здравствуй', 'привет', ['здравствуй']) → { score: 3, reason: 'synonym' }

4. С подсказкой:
   evaluateInput('привет', 'привет', [], 1) → { score: 2, reason: 'hint_used' }

5. Неправильно:
   evaluateInput('кот', 'собака') → { score: 1, reason: 'wrong', suggestions: ['собака'] }

6. Проблемы с пробелами:
   evaluateInput('добрыйдень', 'добрый день') → { score: 1, reason: 'wrong' }
*/