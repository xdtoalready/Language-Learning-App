// backend/src/routes/reviewRoutes.ts - ОБНОВЛЕННЫЙ

import { Router } from 'express';
import { 
  createReviewSession,
  getCurrentWord,
  submitReview,
  getHint,
  getTrainingWords,
  endSession,
  startReviewSession // legacy
} from '../controllers/reviewController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Все роуты требуют аутентификации
router.use(authenticateToken);

// ====================== НОВЫЕ РОУТЫ ======================

/**
 * POST /api/reviews/sessions
 * Создать новую сессию ревью
 * 
 * Body:
 * {
 *   "mode": "RECOGNITION" | "TRANSLATION_INPUT" | "REVERSE_INPUT" | "MIXED",
 *   "sessionType": "daily" | "training",
 *   "filterBy": {
 *     "tags": ["tag1", "tag2"],
 *     "masteryLevel": [0, 1, 2],
 *     "onlyActive": true
 *   }
 * }
 */
router.post('/sessions', createReviewSession);

/**
 * GET /api/reviews/sessions/:sessionId/current
 * Получить текущее слово в сессии
 */
router.get('/sessions/:sessionId/current', getCurrentWord);

/**
 * POST /api/reviews/sessions/:sessionId/submit
 * Отправить ревью в рамках сессии
 * 
 * Body:
 * {
 *   "wordId": "word123",
 *   "rating": 3,                    // для RECOGNITION режима
 *   "userInput": "привет",          // для INPUT режимов
 *   "hintsUsed": 1,
 *   "timeSpent": 5000,              // миллисекунды
 *   "reviewMode": "TRANSLATION_INPUT",
 *   "direction": "LEARNING_TO_NATIVE"
 * }
 */
router.post('/sessions/:sessionId/submit', (req, res) => {
  req.body.sessionId = req.params.sessionId;
  submitReview(req, res);
});

/**
 * DELETE /api/reviews/sessions/:sessionId
 * Принудительно завершить сессию
 */
router.delete('/sessions/:sessionId', endSession);

/**
 * POST /api/reviews/hint
 * Получить подсказку для слова
 * 
 * Body:
 * {
 *   "wordId": "word123",
 *   "hintType": "length" | "first_letter",
 *   "currentHintsUsed": 0,
 *   "direction": "LEARNING_TO_NATIVE" | "NATIVE_TO_LEARNING"
 * }
 */
router.post('/hint', getHint);

/**
 * GET /api/reviews/training-words
 * Получить слова для тренировочного полигона
 * 
 * Query параметры:
 * - tags: строка через запятую "tag1,tag2"
 * - masteryLevel: уровни через запятую "0,1,2"  
 * - limit: количество слов (по умолчанию 20)
 */
router.get('/training-words', getTrainingWords);

// =================== LEGACY РОУТЫ ===================

/**
 * GET /api/reviews/start
 * Старый метод запуска ревью (для обратной совместимости)
 * @deprecated Используйте POST /api/reviews/sessions
 */
router.get('/start', startReviewSession);

/**
 * POST /api/reviews/submit
 * Старый метод отправки ревью (для обратной совместимости)
 * @deprecated Используйте POST /api/reviews/sessions/:sessionId/submit
 */
router.post('/submit', (req, res) => {
  // Для обратной совместимости добавляем значения по умолчанию
  req.body.reviewMode = req.body.reviewMode || 'RECOGNITION';
  req.body.direction = req.body.direction || 'LEARNING_TO_NATIVE';
  req.body.sessionId = req.body.sessionId || 'legacy_session';
  
  submitReview(req, res);
});

export default router;