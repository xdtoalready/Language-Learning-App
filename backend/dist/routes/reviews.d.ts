import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  submitReview, 
  getWordReviews, 
  getReviewStats,
  startReviewSession
} from '../controllers/reviewController';

const router = express.Router();

// POST /api/reviews - Зафиксировать результат повторения
router.post('/', authenticateToken, submitReview);

// GET /api/reviews/session/start - Начать сессию повторения
router.get('/session/start', authenticateToken, startReviewSession);

// GET /api/reviews/stats - Получить статистику ревью
router.get('/stats', authenticateToken, getReviewStats);

// GET /api/reviews/word/:wordId - Получить историю ревью для слова
router.get('/word/:wordId', authenticateToken, getWordReviews);

export default router;