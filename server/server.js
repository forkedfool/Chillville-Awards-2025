import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import votesRoutes from './routes/votes.js';
import categoriesRoutes from './routes/categories.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/votes', votesRoutes);
app.use('/api/categories', categoriesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📊 API доступен по адресу http://localhost:${PORT}/api`);
  console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL || 'не настроен'}`);
});
