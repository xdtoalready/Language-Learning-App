import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  getWords, 
  getDueWords, 
  getWordById,
  createWord, 
  updateWord, 
  deleteWord,
  getWordsStats
} from '../controllers/wordController';

const router = express.Router();

// GET /api/words - Получить все слова с фильтрацией и поиском
router.get('/', authenticateToken, getWords);

// GET /api/words/due - Получить слова для повторения сегодня
router.get('/due', authenticateToken, getDueWords);

// GET /api/words/stats - Получить статистику слов
router.get('/stats', authenticateToken, getWordsStats);

// GET /api/words/:id - Получить конкретное слово
router.get('/:id', authenticateToken, getWordById);

// POST /api/words - Добавить новое слово
router.post('/', authenticateToken, createWord);

// PUT /api/words/:id - Обновить слово
router.put('/:id', authenticateToken, updateWord);

// DELETE /api/words/:id - Удалить слово
router.delete('/:id', authenticateToken, deleteWord);

export default router;