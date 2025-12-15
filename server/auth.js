import { supabaseAdmin } from './supabase.js';
import { getOrCreateUser } from './database.js';

// Middleware для проверки аутентификации через Supabase JWT
export async function isAuthenticated(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const token = authHeader.substring(7);
    
    // Проверяем токен через Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Неверный токен' });
    }

    // Получаем Discord ID из метаданных пользователя
    // Supabase сохраняет provider_id в user_metadata при OAuth
    const discordId = user.user_metadata?.provider_id || 
                     user.user_metadata?.sub || 
                     user.id;
    
    const username = user.user_metadata?.full_name || 
                     user.user_metadata?.preferred_username || 
                     user.user_metadata?.name ||
                     user.email?.split('@')[0] || 
                     'User';
    
    const avatar = user.user_metadata?.avatar_url || 
                   user.user_metadata?.picture || 
                   null;

    // Получаем пользователя из нашей БД
    const dbUser = await getOrCreateUser(discordId, username, avatar);

    req.user = {
      id: dbUser.id,
      discordId: dbUser.discord_id,
      username: dbUser.username,
      avatar: dbUser.avatar,
      supabaseUserId: user.id
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Ошибка аутентификации' });
  }
}

export function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Необходима авторизация' });
  }

  const adminIds = process.env.ADMIN_DISCORD_IDS?.split(',').map(id => id.trim()) || [];
  const userDiscordId = req.user?.discordId;

  if (adminIds.includes(userDiscordId)) {
    return next();
  }

  res.status(403).json({ error: 'Доступ запрещен' });
}
