// src/routes/words.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Заглушки для слов
router.get('/', authenticateToken, (req, res) => {
  res.json({ message: 'Words endpoint' });
});

router.get('/due', authenticateToken, (req, res) => {
  res.json({ message: 'Due words endpoint' });
});

export default router;
