import express from 'express';
import { supabaseAdmin } from '../supabase.js';

const router = express.Router();

// Получение информации о текущем пользователе
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ authenticated: false });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.json({ authenticated: false });
    }

    // Получаем пользователя из БД
    const { getOrCreateUser } = await import('../database.js');
    
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
    
    const dbUser = await getOrCreateUser(discordId, username, avatar);

    res.json({
      authenticated: true,
      user: {
        id: dbUser.id,
        discordId: dbUser.discord_id,
        username: dbUser.username,
        avatar: dbUser.avatar
      }
    });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

// Получить URL для авторизации через Discord (Supabase)
router.get('/discord/url', (req, res) => {
  const redirectUrl = process.env.SUPABASE_REDIRECT_URL || `${process.env.FRONTEND_URL}/auth/callback`;
  const supabaseUrl = process.env.SUPABASE_URL;
  
  if (!supabaseUrl) {
    return res.status(500).json({ error: 'Supabase не настроен' });
  }

  // Supabase обрабатывает OAuth через свой API
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(redirectUrl)}`;
  res.json({ url: authUrl });
});

export default router;
