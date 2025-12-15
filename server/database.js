import { supabaseAdmin } from './supabase.js';

// Функции для работы с пользователями
export async function getUserByDiscordId(discordId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createUser(discordId, username, avatar) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      discord_id: discordId,
      username,
      avatar
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getOrCreateUser(discordId, username, avatar) {
  let user = await getUserByDiscordId(discordId);
  if (!user) {
    user = await createUser(discordId, username, avatar);
  }
  return user;
}

// Функции для работы с категориями
export async function getAllCategories() {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('id');
  
  if (error) throw error;
  return data || [];
}

export async function getCategoryById(id) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createCategory(title, code, description) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({ title, code, description: description || null })
    .select()
    .single();
  
  if (error) throw error;
  return { lastInsertRowid: data.id, ...data };
}

export async function updateCategory(id, title, code, description) {
  const { error } = await supabaseAdmin
    .from('categories')
    .update({ title, code, description: description || null })
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteCategory(id) {
  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Функции для работы с номинантами
export async function getNomineesByCategory(categoryId) {
  const { data, error } = await supabaseAdmin
    .from('nominees')
    .select('*')
    .eq('category_id', categoryId)
    .order('id');
  
  if (error) throw error;
  return data || [];
}

export async function getNomineeById(id) {
  const { data, error } = await supabaseAdmin
    .from('nominees')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createNominee(categoryId, name, description, role, imageUrl) {
  const { data, error } = await supabaseAdmin
    .from('nominees')
    .insert({
      category_id: categoryId,
      name,
      description,
      role,
      image_url: imageUrl || null
    })
    .select()
    .single();
  
  if (error) throw error;
  return { lastInsertRowid: data.id, ...data };
}

export async function updateNominee(id, name, description, role, imageUrl) {
  const { error } = await supabaseAdmin
    .from('nominees')
    .update({ name, description, role, image_url: imageUrl || null })
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteNominee(id) {
  const { error } = await supabaseAdmin
    .from('nominees')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Функции для работы с голосами
export async function getUserVotes(userId) {
  const { data, error } = await supabaseAdmin
    .from('votes')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data || [];
}

export async function getUserVoteForCategory(userId, categoryId) {
  const { data, error } = await supabaseAdmin
    .from('votes')
    .select('*')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function submitVote(userId, categoryId, nomineeId, isSkip = false) {
  // Проверяем, есть ли уже голос
  const existing = await getUserVoteForCategory(userId, categoryId);
  
  if (existing) {
    // Обновляем существующий голос
    const { error } = await supabaseAdmin
      .from('votes')
      .update({
        nominee_id: nomineeId,
        is_skip: isSkip
      })
      .eq('user_id', userId)
      .eq('category_id', categoryId);
    
    if (error) throw error;
    return { changes: 1 };
  } else {
    // Создаем новый голос
    const { data, error } = await supabaseAdmin
      .from('votes')
      .insert({
        user_id: userId,
        category_id: categoryId,
        nominee_id: nomineeId,
        is_skip: isSkip
      })
      .select()
      .single();
    
    if (error) throw error;
    return { lastInsertRowid: data.id, changes: 1 };
  }
}

export async function getVoteCountsByCategory(categoryId) {
  const { data, error } = await supabaseAdmin
    .from('nominees')
    .select(`
      id,
      name,
      description,
      role,
      votes!left(count)
    `)
    .eq('category_id', categoryId);
  
  if (error) throw error;
  
  // Подсчитываем голоса
  const { data: voteData } = await supabaseAdmin
    .from('votes')
    .select('nominee_id')
    .eq('category_id', categoryId)
    .eq('is_skip', false);
  
  const voteCounts = {};
  voteData?.forEach(vote => {
    voteCounts[vote.nominee_id] = (voteCounts[vote.nominee_id] || 0) + 1;
  });
  
  return (data || []).map(nom => ({
    id: nom.id,
    name: nom.name,
    description: nom.description,
    role: nom.role,
    vote_count: voteCounts[nom.id] || 0
  })).sort((a, b) => b.vote_count - a.vote_count);
}

export async function getAllVoteStats() {
  const { data, error } = await supabaseAdmin
    .from('votes')
    .select(`
      category_id,
      nominee_id,
      nominees!inner(
        id,
        name,
        categories!inner(
          id,
          title
        )
      )
    `)
    .eq('is_skip', false);
  
  if (error) throw error;
  
  // Группируем по категориям и номинантам
  const stats = {};
  data?.forEach(vote => {
    const catId = vote.category_id;
    const nomId = vote.nominee_id;
    if (!stats[catId]) stats[catId] = {};
    stats[catId][nomId] = (stats[catId][nomId] || 0) + 1;
  });
  
  // Преобразуем в нужный формат
  const result = [];
  for (const [categoryId, nominees] of Object.entries(stats)) {
    const category = await getCategoryById(parseInt(categoryId));
    for (const [nomineeId, voteCount] of Object.entries(nominees)) {
      const nominee = await getNomineeById(parseInt(nomineeId));
      result.push({
        category_id: parseInt(categoryId),
        category_title: category?.title || '',
        nominee_id: parseInt(nomineeId),
        nominee_name: nominee?.name || '',
        vote_count: voteCount
      });
    }
  }
  
  return result;
}
