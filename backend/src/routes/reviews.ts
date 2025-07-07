// src/routes/reviews.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Заглушки для ревью
router.post('/', authenticateToken, (req, res) => {
  res.json({ message: 'Reviews endpoint' });
});

export default router;
