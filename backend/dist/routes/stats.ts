import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  getUserStats, 
  updateDailyGoal,
  getDifficultWords
} from '../controllers/statsController';

const router = express.Router();

// GET /api/stats - Получить общую статистику пользователя
router.get('/', authenticateToken, getUserStats);

// PUT /api/stats/daily-goal - Обновить дневную цель
router.put('/daily-goal', authenticateToken, updateDailyGoal);

// GET /api/stats/difficult-words - Получить самые сложные слова
router.get('/difficult-words', authenticateToken, getDifficultWords);

export default router;