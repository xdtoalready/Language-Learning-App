// backend/src/routes/achievements.ts
import express from 'express';
import {
  getUserAchievements,
  getPublicUserAchievements,
  getAchievementProgress
} from '../controllers/achievementsController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticateToken);

// Получить свои достижения
router.get('/', getUserAchievements);

// Получить прогресс к достижениям
router.get('/progress', getAchievementProgress);

// Получить достижения конкретного пользователя (публичные)
router.get('/user/:userId', getPublicUserAchievements);

export default router;