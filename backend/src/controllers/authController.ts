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
