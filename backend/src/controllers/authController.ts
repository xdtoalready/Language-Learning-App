import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Регистрация нового пользователя
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password, learningLanguage = 'English' } = req.body;

    // Валидация
    if (!email || !username || !password) {
      res.status(400).json({ 
        error: 'Email, username and password are required' 
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
      return;
    }

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      res.status(400).json({ 
        error: 'User with this email or username already exists' 
      });
      return;
    }

    // Хешируем пароль
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
        learningLanguage,
        lastActiveDate: new Date()
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        learningLanguage: true,
        currentStreak: true,
        longestStreak: true,
        totalWordsLearned: true,
        dailyGoal: true,
        joinDate: true
      }
    });

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Авторизация пользователя
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailOrUsername, password } = req.body;

    // Валидация
    if (!emailOrUsername || !password) {
      res.status(400).json({ 
        error: 'Email/username and password are required' 
      });
      return;
    }

    // Ищем пользователя по email или username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() }
        ]
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Обновляем последнюю активность и стрик
    const today = new Date();
    const lastActive = user.lastActiveDate;
    
    let newStreak = user.currentStreak;
    let newLongestStreak = user.longestStreak;

    if (lastActive) {
      const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Пользователь заходил вчера - увеличиваем стрик
        newStreak += 1;
        newLongestStreak = Math.max(newLongestStreak, newStreak);
      } else if (daysDiff > 1) {
        // Пропустил дни - сбрасываем стрик
        newStreak = 1;
      }
      // Если daysDiff === 0, то пользователь уже заходил сегодня - стрик не меняется
    } else {
      // Первый заход
      newStreak = 1;
      newLongestStreak = 1;
    }

    // Обновляем данные пользователя
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastActiveDate: today,
        currentStreak: newStreak,
        longestStreak: newLongestStreak
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        learningLanguage: true,
        currentStreak: true,
        longestStreak: true,
        totalWordsLearned: true,
        dailyGoal: true,
        joinDate: true
      }
    });

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: updatedUser
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Обновление профиля пользователя
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { username, learningLanguage, dailyGoal, avatar } = req.body;

    // Валидация данных
    const updateData: any = {};

    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim().length < 2) {
        res.status(400).json({ error: 'Username must be at least 2 characters long' });
        return;
      }
      
      // Проверяем уникальность username (исключая текущего пользователя)
      const existingUser = await prisma.user.findFirst({
        where: { 
          username: username.trim(),
          id: { not: userId }
        }
      });
      
      if (existingUser) {
        res.status(400).json({ error: 'Username already taken' });
        return;
      }
      
      updateData.username = username.trim();
    }

    if (learningLanguage !== undefined) {
      const validLanguages = ['English', 'Korean', 'Chinese', 'Spanish', 'French', 'German', 'Japanese'];
      if (!validLanguages.includes(learningLanguage)) {
        res.status(400).json({ error: 'Invalid learning language' });
        return;
      }
      updateData.learningLanguage = learningLanguage;
    }

    if (dailyGoal !== undefined) {
      if (typeof dailyGoal !== 'number' || dailyGoal < 1 || dailyGoal > 100) {
        res.status(400).json({ error: 'Daily goal must be between 1 and 100' });
        return;
      }
      updateData.dailyGoal = dailyGoal;
    }

    if (avatar !== undefined) {
      // Проверяем тип аватара
      if (typeof avatar !== 'string') {
        res.status(400).json({ error: 'Avatar must be a string' });
        return;
      }

      // Если аватар пустой - убираем его
      if (avatar === '') {
        updateData.avatar = null;
      }
      // Если аватар начинается с data: - это base64 изображение
      else if (avatar.startsWith('data:image/')) {
        // Проверяем размер base64 (примерно 5MB в base64 = ~6.7MB строка)
        if (avatar.length > 7000000) {
          res.status(400).json({ error: 'Image too large. Maximum size is 5MB' });
          return;
        }

        // Проверяем валидность base64
        try {
          const base64Data = avatar.split(',')[1];
          if (!base64Data) {
            throw new Error('Invalid base64 format');
          }
          Buffer.from(base64Data, 'base64');
        } catch (error) {
          res.status(400).json({ error: 'Invalid image format' });
          return;
        }

        updateData.avatar = avatar;
      }
      // Иначе это эмодзи или текст
      else {
        if (avatar.length > 10) {
          res.status(400).json({ error: 'Avatar text too long' });
          return;
        }
        updateData.avatar = avatar;
      }
    }

    // Проверяем, что есть данные для обновления
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    // Обновляем пользователя
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        learningLanguage: true,
        dailyGoal: true,
        currentStreak: true,
        longestStreak: true,
        totalWordsLearned: true,
        joinDate: true,
        lastActiveDate: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получение информации о текущем пользователе
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        learningLanguage: true,
        currentStreak: true,
        longestStreak: true,
        totalWordsLearned: true,
        dailyGoal: true,
        joinDate: true,
        _count: {
          select: {
            words: true,
            friends: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
