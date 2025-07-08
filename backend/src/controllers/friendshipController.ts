// backend/src/controllers/friendshipController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Поиск пользователей для добавления в друзья
 */
export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      res.status(400).json({ 
        error: 'Search query must be at least 2 characters long' 
      });
      return;
    }

    const searchTerm = query.trim().toLowerCase();

    // Ищем пользователей по username или email (исключая себя)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              { username: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        learningLanguage: true,
        currentStreak: true,
        totalWordsLearned: true,
        joinDate: true
      },
      take: 10 // Ограничиваем результаты
    });

    // Получаем информацию о существующих дружеских связях
    const existingFriendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, friendId: { in: users.map(u => u.id) } },
          { friendId: userId, userId: { in: users.map(u => u.id) } }
        ]
      }
    });

    // Добавляем статус дружбы к каждому пользователю
    const usersWithStatus = users.map(user => {
      const friendship = existingFriendships.find(f => 
        (f.userId === userId && f.friendId === user.id) ||
        (f.friendId === userId && f.userId === user.id)
      );

      let friendshipStatus = 'none';
      if (friendship) {
        if (friendship.status === 'ACCEPTED') {
          friendshipStatus = 'friends';
        } else if (friendship.status === 'PENDING') {
          friendshipStatus = friendship.userId === userId ? 'sent' : 'received';
        } else if (friendship.status === 'BLOCKED') {
          friendshipStatus = 'blocked';
        }
      }

      return {
        ...user,
        friendshipStatus
      };
    });

    res.json({ users: usersWithStatus });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Отправить заявку в друзья
 */
export const sendFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { friendId } = req.body;

    if (!friendId) {
      res.status(400).json({ error: 'Friend ID is required' });
      return;
    }

    if (userId === friendId) {
      res.status(400).json({ error: 'Cannot add yourself as friend' });
      return;
    }

    // Проверяем, что пользователь существует
    const targetUser = await prisma.user.findUnique({
      where: { id: friendId }
    });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Проверяем, нет ли уже дружеской связи
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    });

    if (existingFriendship) {
      res.status(400).json({ 
        error: 'Friendship already exists',
        status: existingFriendship.status 
      });
      return;
    }

    // Создаем заявку в друзья
    const friendship = await prisma.friendship.create({
      data: {
        userId,
        friendId,
        status: 'PENDING'
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            avatar: true,
            learningLanguage: true
          }
        }
      }
    });

    res.json({
      message: 'Friend request sent successfully',
      friendship
    });

  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Ответить на заявку в друзья (принять/отклонить)
 */
export const respondToFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { friendshipId } = req.params;
    const { action } = req.body; // 'accept' или 'reject'

    if (!['accept', 'reject'].includes(action)) {
      res.status(400).json({ error: 'Action must be accept or reject' });
      return;
    }

    // Находим заявку в друзья
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        friendId: userId, // Только получатель может отвечать на заявку
        status: 'PENDING'
      }
    });

    if (!friendship) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    if (action === 'accept') {
      // Принимаем заявку
      const updatedFriendship = await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: 'ACCEPTED' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              learningLanguage: true
            }
          }
        }
      });

      res.json({
        message: 'Friend request accepted',
        friendship: updatedFriendship
      });
    } else {
      // Отклоняем заявку (удаляем запись)
      await prisma.friendship.delete({
        where: { id: friendshipId }
      });

      res.json({ message: 'Friend request rejected' });
    }

  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить список друзей
 */
export const getFriends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            learningLanguage: true,
            currentStreak: true,
            totalWordsLearned: true,
            lastActiveDate: true
          }
        },
        friend: {
          select: {
            id: true,
            username: true,
            avatar: true,
            learningLanguage: true,
            currentStreak: true,
            totalWordsLearned: true,
            lastActiveDate: true
          }
        }
      }
    });

    // Формируем список друзей
    const friends = friendships.map(friendship => {
      const friend = friendship.userId === userId ? friendship.friend : friendship.user;
      return {
        ...friend,
        friendshipId: friendship.id,
        friendshipDate: friendship.createdAt
      };
    });

    res.json({ friends });

  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить входящие заявки в друзья
 */
export const getPendingRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const pendingRequests = await prisma.friendship.findMany({
      where: {
        friendId: userId,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            learningLanguage: true,
            currentStreak: true,
            totalWordsLearned: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ requests: pendingRequests });

  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Удалить друга
 */
export const removeFriend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { friendshipId } = req.params;

    // Находим дружескую связь
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        OR: [
          { userId },
          { friendId: userId }
        ],
        status: 'ACCEPTED'
      }
    });

    if (!friendship) {
      res.status(404).json({ error: 'Friendship not found' });
      return;
    }

    // Удаляем дружескую связь
    await prisma.friendship.delete({
      where: { id: friendshipId }
    });

    res.json({ message: 'Friend removed successfully' });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};