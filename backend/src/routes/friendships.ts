// src/routes/friendships.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Заглушки для друзей
router.get('/', authenticateToken, (req, res) => {
  res.json({ message: 'Friendships endpoint' });
});

export default router;
