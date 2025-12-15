-- Схема базы данных для Supabase

-- Таблица пользователей (из Discord через Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица категорий
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица номинантов
CREATE TABLE IF NOT EXISTS nominees (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  role TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица голосов
CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  nominee_id BIGINT REFERENCES nominees(id) ON DELETE CASCADE,
  is_skip BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_category ON votes(category_id);
CREATE INDEX IF NOT EXISTS idx_nominees_category ON nominees(category_id);
CREATE INDEX IF NOT EXISTS idx_votes_nominee ON votes(nominee_id);

-- Row Level Security (RLS) политики
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Политики для чтения категорий и номинантов (публичные)
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Nominees are viewable by everyone" ON nominees
  FOR SELECT USING (true);

-- Политики для голосов (пользователи могут видеть только свои голоса)
CREATE POLICY "Users can view their own votes" ON votes
  FOR SELECT USING (auth.uid()::text = (SELECT discord_id FROM users WHERE id = votes.user_id));

-- Политики для создания/обновления голосов (через service role на бекенде)
-- Админские операции будут выполняться через service role key

