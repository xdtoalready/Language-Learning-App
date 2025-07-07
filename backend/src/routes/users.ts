// src/routes/users.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Заглушки для пользователей
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ message: 'User profile endpoint' });
});

export default router;
