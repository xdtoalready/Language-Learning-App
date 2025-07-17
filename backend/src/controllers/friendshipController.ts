// backend/src/controllers/friendshipController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { checkAchievements, getAchievementProgress } from '../utils/achievements';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Добавить друга по username
 */
export const addFriend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { username } = req.body;

    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    // Находим пользователя по username
    const friendUser = await prisma.user.findFirst({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true }
    });

    if (!friendUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (friendUser.id === userId) {
      res.status(400).json({ error: 'Cannot add yourself as friend' });
      return;
    }

    // Проверяем, существует ли уже дружба
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId: friendUser.id },
          { userId: friendUser.id, friendId: userId }
        ]
      }
    });

    if (existingFriendship) {
      res.status(409).json({ error: 'Friendship already exists' });
      return;
    }

    // Создаем запрос на дружбу
    const friendship = await prisma.friendship.create({
      data: {
        userId,
        friendId: friendUser.id,
        status: 'PENDING'
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            currentStreak: true,
            totalWordsLearned: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Friend request sent successfully',
      friendship
    });

  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить список друзей
 */
export const getFriends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const friends = await prisma.friendship.findMany({
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
            currentStreak: true,
            totalWordsLearned: true,
            lastActiveDate: true
          }
        },
        friend: {
          select: {
            id: true,
            username: true,
            currentStreak: true,
            totalWordsLearned: true,
            lastActiveDate: true
          }
        }
      }
    });

    // Форматируем список друзей
    const formattedFriends = friends.map(friendship => {
      const friend = friendship.userId === userId ? friendship.friend : friendship.user;
      return {
        id: friend.id,
        username: friend.username,
        currentStreak: friend.currentStreak,
        totalWordsLearned: friend.totalWordsLearned,
        lastActiveDate: friend.lastActiveDate,
        isOnline: friend.lastActiveDate && 
          new Date().getTime() - friend.lastActiveDate.getTime() < 5 * 60 * 1000 // 5 минут
      };
    });

    res.json({ friends: formattedFriends });

  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Принять запрос на дружбу
 */
export const acceptFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { friendshipId } = req.params;

    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        friendId: userId,
        status: 'PENDING'
      }
    });

    if (!friendship) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    const updatedFriendship = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            currentStreak: true,
            totalWordsLearned: true
          }
        }
      }
    });

    res.json({
      message: 'Friend request accepted',
      friendship: updatedFriendship
    });

  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Отклонить запрос на дружбу
 */
export const rejectFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { friendshipId } = req.params;

    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        friendId: userId,
        status: 'PENDING'
      }
    });

    if (!friendship) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    await prisma.friendship.delete({
      where: { id: friendshipId }
    });

    res.json({ message: 'Friend request rejected' });

  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить входящие запросы на дружбу
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
            currentStreak: true,
            totalWordsLearned: true
          }
        }
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
    const { friendId } = req.params;

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId, status: 'ACCEPTED' },
          { userId: friendId, friendId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    if (!friendship) {
      res.status(404).json({ error: 'Friendship not found' });
      return;
    }

    await prisma.friendship.delete({
      where: { id: friendship.id }
    });

    res.json({ message: 'Friend removed successfully' });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Обновить активность пользователя для системы CloudStreak
 */
export const updateUserActivity = async (userId: string): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Обновляем последнюю активность пользователя
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveDate: new Date() }
    });

    // Получаем все активные дружбы пользователя
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    // Обновляем CloudStreak для каждой дружбы
    for (const friendship of friendships) {
      const otherUserId = friendship.userId === userId ? friendship.friendId : friendship.userId;
      
      // Получаем или создаем CloudStreak для этой пары
      let cloudStreak = await prisma.cloudStreak.findFirst({
        where: {
          OR: [
            { user1Id: userId, user2Id: otherUserId },
            { user1Id: otherUserId, user2Id: userId }
          ]
        }
      });

      if (!cloudStreak) {
        // Создаем новый CloudStreak
        cloudStreak = await prisma.cloudStreak.create({
          data: {
            user1Id: userId,
            user2Id: otherUserId,
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: today,
            user1LastActive: new Date(),
            user2LastActive: null
          }
        });
        continue;
      }

      // Определяем, какой пользователь обновляется
      const isUser1 = cloudStreak.user1Id === userId;
      const updateData: any = {};

      if (isUser1) {
        updateData.user1LastActive = new Date();
      } else {
        updateData.user2LastActive = new Date();
      }

      // Проверяем, активен ли другой пользователь сегодня
      const otherUserActiveToday = isUser1 
        ? cloudStreak.user2LastActive && cloudStreak.user2LastActive >= today
        : cloudStreak.user1LastActive && cloudStreak.user1LastActive >= today;

      const currentUserActiveToday = true; // Текущий пользователь активен (мы его обновляем)

      // Если оба активны сегодня, обновляем стрик
      if (otherUserActiveToday && currentUserActiveToday) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Проверяем, был ли вчера активен стрик
        const wasActiveYesterday = cloudStreak.lastActiveDate && 
          cloudStreak.lastActiveDate >= yesterday && 
          cloudStreak.lastActiveDate < today;

        if (wasActiveYesterday) {
          // Продолжаем стрик
          updateData.currentStreak = cloudStreak.currentStreak + 1;
        } else {
          // Начинаем новый стрик
          updateData.currentStreak = 1;
        }

        updateData.lastActiveDate = today;
        updateData.longestStreak = Math.max(cloudStreak.longestStreak, updateData.currentStreak);
      }

      // Обновляем CloudStreak
      await prisma.cloudStreak.update({
        where: { id: cloudStreak.id },
        data: updateData
      });
    }
  } catch (error) {
    console.error('❌ Ошибка обновления активности:', error);
  }
};

/**
 * Рассчитывает количество дней, когда была выполнена дневная цель
 */
function calculatePerfectDays(reviews: any[], dailyGoal: number): number {
  const reviewsByDay = reviews.reduce((acc, review) => {
    const day = review.createdAt.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.values(reviewsByDay).filter((count: number) => count >= dailyGoal).length;
}

/**
 * Рассчитывает статистику времени изучения
 */
function calculateTimeStats(reviews: any[]): { earlyMorningDays: number; lateNightDays: number } {
  const activityByDay = reviews.reduce((acc, review) => {
    const date = new Date(review.createdAt);
    const day = date.toISOString().split('T')[0];
    const hour = date.getHours();
    
    if (!acc[day]) {
      acc[day] = { earlyMorning: false, lateNight: false };
    }
    
    if (hour < 8) {
      acc[day].earlyMorning = true;
    }
    
    if (hour >= 22) {
      acc[day].lateNight = true;
    }
    
    return acc;
  }, {} as Record<string, { earlyMorning: boolean; lateNight: boolean }>);

  return {
    earlyMorningDays: Object.values(activityByDay).filter((day: { earlyMorning: boolean; lateNight: boolean }) => day.earlyMorning).length,
    lateNightDays: Object.values(activityByDay).filter((day: { earlyMorning: boolean; lateNight: boolean }) => day.lateNight).length
  };
}

/**
 * Получить достижения друга
 */
export const getFriendAchievements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { friendId } = req.params;

    // Проверяем, что пользователи действительно друзья
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId, status: 'ACCEPTED' },
          { userId: friendId, friendId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    if (!friendship) {
      res.status(403).json({ error: 'Вы не являетесь друзьями' });
      return;
    }

    // Получаем информацию о друге
    const friend = await prisma.user.findUnique({
      where: { id: friendId },
      select: {
        id: true,
        username: true,
        currentStreak: true,
        longestStreak: true,
        totalWordsLearned: true,
        dailyGoal: true,
        joinDate: true,
        lastActiveDate: true,
        _count: {
          select: {
            reviews: true
          }
        }
      }
    });

    if (!friend) {
      res.status(404).json({ error: 'Друг не найден' });
      return;
    }

    // Получаем ревью друга за последние 30 дней для расчета дополнительных метрик
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const recentReviews = await prisma.review.findMany({
      where: {
        userId: friendId,
        createdAt: { gte: monthAgo }
      },
      select: {
        rating: true,
        createdAt: true
      }
    });

    const perfectDays = calculatePerfectDays(recentReviews, friend.dailyGoal);
    const timeStats = calculateTimeStats(recentReviews);

    const friendWithStats = {
      ...friend,
      totalReviews: friend._count.reviews,
      perfectDays,
      earlyMorningDays: timeStats.earlyMorningDays,
      lateNightDays: timeStats.lateNightDays
    };

    // Рассчитываем достижения друга
    const achievements = checkAchievements(friendWithStats);
    const achievementProgress = getAchievementProgress(achievements);

    res.json({
      achievements,
      progress: achievementProgress,
      friend: {
        id: friend.id,
        username: friend.username,
        currentStreak: friend.currentStreak,
        totalWordsLearned: friend.totalWordsLearned,
        totalReviews: friend._count.reviews
      }
    });

  } catch (error) {
    console.error('Get friend achievements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить облачки друзей
 */
export const getFriendsWithClouds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Получаем всех друзей с их CloudStreak данными
    const friendsWithClouds = await prisma.friendship.findMany({
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
            currentStreak: true,
            totalWordsLearned: true,
            lastActiveDate: true
          }
        },
        friend: {
          select: {
            id: true,
            username: true,
            currentStreak: true,
            totalWordsLearned: true,
            lastActiveDate: true
          }
        }
      }
    });

    // Получаем CloudStreak данные для каждого друга
    const friendsData = await Promise.all(
      friendsWithClouds.map(async (friendship) => {
        const friend = friendship.userId === userId ? friendship.friend : friendship.user;
        
        const cloudStreak = await prisma.cloudStreak.findFirst({
          where: {
            OR: [
              { user1Id: userId, user2Id: friend.id },
              { user1Id: friend.id, user2Id: userId }
            ]
          }
        });

        return {
          id: friend.id,
          username: friend.username,
          currentStreak: friend.currentStreak,
          totalWordsLearned: friend.totalWordsLearned,
          lastActiveDate: friend.lastActiveDate,
          isOnline: friend.lastActiveDate && 
            new Date().getTime() - friend.lastActiveDate.getTime() < 5 * 60 * 1000,
          cloudStreak: cloudStreak ? {
            currentStreak: cloudStreak.currentStreak,
            longestStreak: cloudStreak.longestStreak,
            lastActiveDate: cloudStreak.lastActiveDate
          } : null
        };
      })
    );

    res.json({ friends: friendsData });

  } catch (error) {
    console.error('Get friends with clouds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};