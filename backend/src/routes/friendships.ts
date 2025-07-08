// backend/src/routes/friendships.ts
import express from 'express';
import {
  searchUsers,
  sendFriendRequest,
  respondToFriendRequest,
  getFriends,
  getPendingRequests,
  removeFriend
} from '../controllers/friendshipController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticateToken);

// Поиск пользователей
router.get('/search', searchUsers);

// Управление заявками в друзья
router.post('/request', sendFriendRequest);
router.put('/request/:friendshipId', respondToFriendRequest);
router.get('/requests', getPendingRequests);

// Управление друзьями
router.get('/', getFriends);
router.delete('/:friendshipId', removeFriend);
router.get('/clouds', getFriendsWithClouds);

export default router;