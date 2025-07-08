import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import wordRoutes from './routes/words';
import reviewRoutes from './routes/reviews';
import friendshipRoutes from './routes/friendships';
import statsRoutes from './routes/stats';

// Middleware
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Увеличиваем лимит для разработки
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://5.129.203.118:3000',
    /^http:\/\/.*:3000$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-HTTP-Method-Override'
  ],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Дополнительная обработка OPTIONS запросов
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (origin && (
      origin.includes('localhost:3000') || 
      origin.includes('127.0.0.1:3000') || 
      origin.includes('5.129.203.118:3000')
    )) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin, X-HTTP-Method-Override');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 часа кеширования preflight
    return res.sendStatus(200);
  }
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Language Learning API',
    version: '1.0.0',
    cors: 'enabled'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/words', wordRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/friendships', friendshipRoutes);
app.use('/api/stats', statsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/words',
      'POST /api/words',
      'GET /api/words/due',
      'GET /api/words/stats',
      'POST /api/reviews',
      'GET /api/reviews/session/start',
      'GET /api/stats'
    ]
  });
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 External access: http://5.129.203.118:${PORT}/api/health`);
  console.log(`📚 API Documentation:`);
  console.log(`   - Words: /api/words`);
  console.log(`   - Reviews: /api/reviews`);
  console.log(`   - Statistics: /api/stats`);
  console.log(`   - Authentication: /api/auth`);
  console.log(`🔧 CORS enabled for development`);
});