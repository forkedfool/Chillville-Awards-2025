import React, { useState, useEffect } from 'react';
import { 
  Disc, Check, ChevronRight, Terminal, User, Zap, Trophy, Hash, Monitor, Code, 
  Globe, MessageCircle, Lock, Edit, Trash2, Plus, BarChart, Save, X, LogOut 
} from 'lucide-react';
import { authAPI, categoriesAPI, votesAPI, setAuthTokenGetter } from './api.js';
import { supabase } from './supabase.js';

export default function ChillvilleApp() {
  // State
  const [categories, setCategories] = useState([]);
  const [view, setView] = useState('landing'); // 'landing', 'voting', 'success', 'admin-login', 'admin-dashboard'
  const [votes, setVotes] = useState({});
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  
  // Admin Editing State
  const [editingCategory, setEditingCategory] = useState(null);
  const [isEditingCategoryData, setIsEditingCategoryData] = useState(false);
  const [editingCategoryData, setEditingCategoryData] = useState({ title: '', code: '', description: '' });
  const [newNominee, setNewNominee] = useState({ name: '', desc: '', role: '', imageUrl: '' });
  
  // Category Creation State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  // Vote Stats для админ-панели
  const [voteStats, setVoteStats] = useState({});

  // Настройка Supabase и загрузка данных при монтировании
  useEffect(() => {
    // Настраиваем получение токена для API
    setAuthTokenGetter(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    });

    // Обработка callback от Supabase OAuth
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await checkAuth();
        setView('voting');
        // Очищаем URL от параметров OAuth
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setVotes({});
        setView('landing');
      }
    });

    // Проверяем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkAuth();
      }
    });

    loadInitialData();
    
    // Если URL содержит /voting, переключаемся на страницу голосования
    if (window.location.pathname.includes('voting') || window.location.hash === '#voting') {
      setView('voting');
    }
  }, []);

  // Проверка авторизации при изменении view
  useEffect(() => {
    if (view === 'voting' || view === 'admin-dashboard') {
      checkAuth();
    }
  }, [view]);

  // Автоматический редирект на голосование, если пользователь авторизован и на лендинге
  useEffect(() => {
    if (!isLoading && view === 'landing' && user) {
      setView('voting');
    }
  }, [isLoading, view, user]);

  async function loadInitialData() {
    try {
      setIsLoading(true);
      
      // Проверяем авторизацию (не блокируем, если бекенд недоступен)
      try {
        await checkAuth();
      } catch (error) {
        console.warn('Бекенд недоступен, работаем в офлайн режиме:', error);
      }
      
      // Загружаем категории (не блокируем, если бекенд недоступен)
      try {
        await loadCategories();
      } catch (error) {
        console.warn('Не удалось загрузить категории:', error);
        // Используем пустой массив, если не удалось загрузить
        setCategories([]);
      }
      
      // Если пользователь авторизован, загружаем его голоса
      if (user) {
        try {
          await loadUserVotes();
        } catch (error) {
          console.warn('Не удалось загрузить голоса:', error);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Получаем информацию о пользователе через API
        const apiData = await authAPI.getMe();
        if (apiData && apiData.authenticated) {
          setUser(apiData.user);
        } else {
          // Если API недоступен, используем данные из Supabase сессии
          const userMetadata = session.user.user_metadata;
          setUser({
            id: session.user.id,
            discordId: userMetadata.provider_id || session.user.id,
            username: userMetadata.full_name || userMetadata.preferred_username || session.user.email?.split('@')[0] || 'User',
            avatar: userMetadata.avatar_url || null
          });
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    } catch (error) {
      // Не критично, если бекенд недоступен
      setUser(null);
      setIsAdmin(false);
      throw error; // Пробрасываем ошибку для обработки выше
    }
  }

  async function loadCategories() {
    try {
      const data = await categoriesAPI.getAll();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  }

  async function loadUserVotes() {
    try {
      const data = await votesAPI.getMyVotes();
      setVotes(data.votes || {});
    } catch (error) {
      console.error('Ошибка загрузки голосов:', error);
    }
  }

  async function loadVoteStats() {
    try {
      const data = await votesAPI.getAllStats();
      const statsMap = {};
      data.stats.forEach(stat => {
        if (!statsMap[stat.category_id]) {
          statsMap[stat.category_id] = {};
        }
        statsMap[stat.category_id][stat.nominee_id] = stat.vote_count;
      });
      setVoteStats(statsMap);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  }

  // Navigation Handlers
  const handleLogin = async () => {
    try {
      // Авторизация через Supabase Discord OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        alert('Ошибка авторизации: ' + error.message);
      }
      // Редирект произойдет автоматически через Supabase
    } catch (error) {
      alert('Ошибка при попытке авторизации: ' + error.message);
    }
  };

  const handleVote = (catId, nomId) => {
    setVotes(prev => ({ ...prev, [catId]: nomId }));
  };

  const handleSubmit = async () => {
    try {
      await votesAPI.submit(votes);
      setView('success');
    } catch (error) {
      alert('Ошибка при отправке голосов: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setVotes({});
      setView('landing');
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  // Admin Handlers
  const handleAdminLogin = async () => {
    // Проверка авторизации через API
    if (!user) {
      alert('Необходима авторизация через Discord');
      handleLogin();
      return;
    }
    
    // Пытаемся загрузить статистику - если пользователь админ, запрос пройдет
    // Если нет - бекенд вернет 403
    try {
      await loadVoteStats();
      setView('admin-dashboard');
    } catch (error) {
      if (error.message.includes('403') || error.message.includes('запрещен')) {
        alert('ACCESS DENIED - У вас нет прав администратора');
      } else {
        alert('Ошибка доступа: ' + error.message);
      }
    }
  };

  const handleDeleteNominee = async (catId, nomId) => {
    try {
      await categoriesAPI.deleteNominee(catId, nomId);
      await loadCategories();
    } catch (error) {
      alert('Ошибка удаления номинанта: ' + error.message);
    }
  };

  const handleAddNominee = async (catId) => {
    if (!newNominee.name) return;
    try {
      await categoriesAPI.createNominee(
        catId,
        newNominee.name,
        newNominee.desc,
        newNominee.role,
        newNominee.imageUrl || null
      );
      setNewNominee({ name: '', desc: '', role: '', imageUrl: '' });
      await loadCategories();
    } catch (error) {
      alert('Ошибка добавления номинанта: ' + error.message);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryTitle.trim()) return;
    const code = newCategoryCode.trim() || `CAT_${Math.floor(Math.random() * 1000)}`;
    
    try {
      const result = await categoriesAPI.create(newCategoryTitle, code, newCategoryDescription);
      setNewCategoryTitle('');
      setNewCategoryCode('');
      setNewCategoryDescription('');
      setIsAddingCategory(false);
      await loadCategories();
      if (result.category) {
        setEditingCategory(result.category.id);
      }
    } catch (error) {
      alert('Ошибка добавления категории: ' + error.message);
    }
  };

  const handleUpdateCategory = async (categoryId) => {
    if (!editingCategoryData.title.trim() || !editingCategoryData.code.trim()) {
      alert('Название и код обязательны');
      return;
    }
    
    try {
      await categoriesAPI.update(categoryId, editingCategoryData.title, editingCategoryData.code, editingCategoryData.description);
      setIsEditingCategoryData(false);
      await loadCategories();
    } catch (error) {
      alert('Ошибка обновления категории: ' + error.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Вы уверены, что хотите удалить эту категорию? Все номинанты и голоса будут удалены.')) {
      return;
    }
    
    try {
      await categoriesAPI.delete(categoryId);
      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      alert('Ошибка удаления категории: ' + error.message);
    }
  };

  // Получение количества голосов для номинанта (для админ-панели)
  const getVoteCount = (categoryId, nomineeId) => {
    if (!voteStats[categoryId] || !voteStats[categoryId][nomineeId]) {
      return 0;
    }
    return voteStats[categoryId][nomineeId];
  };

  const styles = {
    appContainer: {
      backgroundColor: '#050505',
      color: 'white',
      minHeight: '100vh',
      fontFamily: '"Inter", sans-serif',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
  };

  return (
    <div style={styles.appContainer} className="font-sans selection:bg-[#00FFCC] selection:text-black">
      
      {/* CSS Styles injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Unbounded:wght@400;700;900&display=swap');
        
        .font-display { font-family: 'Unbounded', sans-serif; }
        
        .scanline {
          width: 100%;
          height: 100px;
          position: absolute;
          z-index: 10;
          background: linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0, 255, 204, 0.1) 50%, rgba(0,0,0,0) 100%);
          opacity: 0.1;
          bottom: 100%;
          animation: scanline 8s linear infinite;
          pointer-events: none;
        }
        @keyframes scanline {
          0% { bottom: 100%; }
          100% { bottom: -100%; }
        }

        .glitch-hover:hover {
          animation: glitch 0.3s cubic-bezier(.25, .46, .45, .94) both infinite;
          color: #00FFCC;
        }
        @keyframes glitch {
          0% { transform: translate(0) }
          20% { transform: translate(-2px, 2px) }
          40% { transform: translate(-2px, -2px) }
          60% { transform: translate(2px, 2px) }
          80% { transform: translate(2px, -2px) }
          100% { transform: translate(0) }
        }

        .bg-grid {
          background-size: 40px 40px;
          background-image: linear-gradient(to right, #1a1a1a 1px, transparent 1px),
                            linear-gradient(to bottom, #1a1a1a 1px, transparent 1px);
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 60s linear infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>

      {/* BACKGROUND & ABSTRACTIONS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Base Grid */}
        <div className="absolute inset-0 bg-grid opacity-20"></div>
        
        {/* Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-black/50 to-black"></div>
        
        {/* Abstraction 1: Large Rotating Hexagon (Top Right) */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] opacity-10 animate-spin-slow">
            <svg viewBox="0 0 100 100" fill="none" stroke="#00FFCC" strokeWidth="0.5">
               <path d="M50 0 L93.3 25 L93.3 75 L50 100 L6.7 75 L6.7 25 Z" />
               <path d="M50 10 L84.6 30 L84.6 70 L50 90 L15.4 70 L15.4 30 Z" opacity="0.5" />
               <circle cx="50" cy="50" r="10" fill="#00FFCC" opacity="0.2" />
            </svg>
        </div>

        {/* Abstraction 2: Circuit Lines (Bottom Left) */}
        <div className="absolute bottom-0 left-0 w-full h-1/2 opacity-10">
           <svg width="100%" height="100%" preserveAspectRatio="none">
              <path d="M0 100 L100 100 L150 50 L300 50" stroke="#CCFF00" strokeWidth="2" fill="none" />
              <path d="M50 200 L150 200 L200 150 L400 150" stroke="#00FFCC" strokeWidth="1" fill="none" />
              <circle cx="300" cy="50" r="4" fill="#CCFF00" />
              <circle cx="400" cy="150" r="3" fill="#00FFCC" />
           </svg>
        </div>

        {/* Abstraction 3: Floating Data Cubes */}
        <div className="absolute top-1/4 left-10 w-16 h-16 border border-gray-700 opacity-20 rotate-12 animate-float"></div>
        <div className="absolute bottom-1/3 right-20 w-24 h-24 border border-teal-900 opacity-20 -rotate-12 animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-20 right-1/4 w-4 h-4 bg-lime-400 opacity-20 rounded-sm animate-pulse"></div>

        {/* Scanline */}
        <div className="scanline"></div>
      </div>

      {/* NAVBAR */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 border-b border-gray-800 backdrop-blur-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
           <div className="w-8 h-8 bg-teal-400 text-black flex items-center justify-center font-bold font-display rounded-sm transform -skew-x-12">
             C
           </div>
           <span className="font-display font-bold tracking-tight text-lg">CHILLVILLE<span className="text-teal-400">25</span></span>
        </div>
        
        {/* User info & status */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end mr-1">
                <span className="text-xs font-mono text-gray-400 leading-none">SIGNED IN AS</span>
                <span className="text-sm font-mono text-white leading-none truncate max-w-[160px]">
                  {user.username}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-teal-400/60 bg-gray-900 flex items-center justify-center">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="text-teal-400" size={18} />
                )}
              </div>
            </div>
          )}

          {view === 'voting' && user && (
             <div className="hidden md:flex items-center gap-3 text-sm font-mono text-gray-400">
               <span className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></span>
               LOGGED_IN
             </div>
          )}

          {view === 'admin-dashboard' && (
             <div className="hidden md:flex items-center gap-3 text-sm font-mono text-teal-400 border border-teal-400/30 px-3 py-1 bg-teal-400/10">
               <Lock size={12} />
               ADMIN_MODE
             </div>
          )}

          {user && (
            <button
              onClick={handleLogout}
              className="text-[11px] font-mono text-gray-500 hover:text-white border border-gray-700 hover:border-red-400 px-3 py-1 rounded-sm transition-colors"
            >
              LOGOUT
            </button>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT WRAPPER */}
      <div className="relative z-10 flex-grow flex flex-col">
        
        {/* === LOADING VIEW === */}
        {isLoading && (
          <div className="flex items-center justify-center flex-grow">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4"></div>
              <p className="text-gray-400 font-mono">Загрузка...</p>
            </div>
          </div>
        )}

        {/* === LANDING VIEW === */}
        {!isLoading && view === 'landing' && (
          <header className="flex flex-col items-center justify-center flex-grow text-center px-4 relative overflow-hidden py-20">
            
            {/* REMOVED ABSTRACT LOGO HERE */}

            <div className="mb-6">
              <span className="px-3 py-1 border border-lime-400/30 text-lime-400 bg-lime-400/5 text-xs font-mono tracking-[0.3em] uppercase">
                Voting ends 21.12.2025
              </span>
            </div>

            <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.85] mb-10 font-display">
              <span className="block text-white glitch-hover cursor-default">Chillville</span>
              <span className="block text-teal-400 glitch-hover cursor-default drop-shadow-[0_0_30px_rgba(0,255,204,0.3)]">
                Awards
              </span>
            </h1>

            <p className="max-w-xl text-gray-400 text-lg md:text-xl mb-16 font-light leading-relaxed">
              Главное событие года.<br/>
              <span className="text-gray-600 font-mono text-sm mt-2 block">[ SYSTEM_READY_FOR_VOTING ]</span>
            </p>

            {!user ? (
              <button 
                onClick={handleLogin}
                className="group relative px-12 py-6 bg-transparent border border-teal-400 text-teal-400 font-display font-bold uppercase tracking-widest text-lg overflow-hidden hover:text-black hover:bg-teal-400 transition-all duration-300"
              >
                <div className="relative z-10 flex items-center gap-3">
                  <Disc size={24} />
                  Login with Discord
                </div>
              </button>
            ) : (
              <button 
                onClick={() => setView('voting')}
                className="group relative px-12 py-6 bg-transparent border border-teal-400 text-teal-400 font-display font-bold uppercase tracking-widest text-lg overflow-hidden hover:text-black hover:bg-teal-400 transition-all duration-300"
              >
                <div className="relative z-10 flex items-center gap-3">
                  <ChevronRight size={24} />
                  Start Voting
                </div>
              </button>
            )}
          </header>
        )}

        {/* === VOTING VIEW === */}
        {!isLoading && view === 'voting' && (
          <main className="container mx-auto px-4 py-16 max-w-6xl">
            {!user ? (
              <div className="text-center py-20">
                <p className="text-gray-400 mb-4">Необходима авторизация</p>
                <button onClick={handleLogin} className="px-6 py-3 border border-teal-400 text-teal-400 hover:bg-teal-400 hover:text-black transition-colors">
                  Войти через Discord
                </button>
              </div>
            ) : (
              <>
                <div className="mb-16">
                  <h2 className="text-3xl md:text-4xl font-display font-bold uppercase mb-2 text-white">Голосование</h2>
                  <p className="text-gray-500 font-mono text-sm">// SELECT_YOUR_HEROES</p>
                </div>

                <div className="space-y-24">
                  {categories.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                      <p>Категории пока не добавлены</p>
                    </div>
                  ) : (
                    categories.map((cat) => (
                <div key={cat.id} className="relative group">
                  <div className="flex items-end justify-between border-b border-gray-800 pb-4 mb-8">
                     <div className="flex-1">
                       <span className="text-lime-400 font-mono text-xs mb-1 block">0{cat.id} // {cat.code}</span>
                       <h3 className="text-2xl md:text-4xl font-display font-bold uppercase text-white mb-2">{cat.title}</h3>
                       {cat.description && (
                         <p className="text-gray-400 text-sm font-mono leading-relaxed max-w-2xl">
                           {cat.description}
                         </p>
                       )}
                     </div>
                     <Terminal size={20} className="text-gray-700 ml-4" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cat.nominees.map((nom) => {
                      const isSelected = votes[cat.id] === nom.id;
                      return (
                        <div 
                          key={nom.id}
                          onClick={() => handleVote(cat.id, nom.id)}
                          className={`
                            relative border p-6 cursor-pointer transition-all duration-300 bg-gray-900/50 backdrop-blur-sm group/card
                            ${isSelected 
                              ? 'border-teal-400 bg-teal-400/10 shadow-lg shadow-teal-400/10 scale-[1.02]' 
                              : 'border-gray-800 hover:border-gray-500 hover:bg-gray-800'
                            }
                          `}
                        >
                           <div className={`
                             absolute top-4 right-4 w-5 h-5 border transition-all flex items-center justify-center transform rotate-45
                             ${isSelected ? 'bg-teal-400 border-teal-400' : 'border-gray-700'}
                           `}>
                             {isSelected && <Check size={12} className="text-black -rotate-45" />}
                           </div>

                           <div className="w-full aspect-video bg-black border border-gray-800 mb-6 relative overflow-hidden flex items-center justify-center">
                              {nom.imageUrl ? (
                                <img
                                  src={nom.imageUrl}
                                  alt={nom.name}
                                  className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-opacity duration-300"
                                />
                              ) : (
                                <User className={`text-gray-800 ${isSelected ? 'text-teal-400' : ''}`} size={40} />
                              )}
                              <div className="absolute inset-0 bg-teal-400/10 translate-y-full group-hover/card:translate-y-0 transition-transform duration-300"></div>
                           </div>

                           <div>
                              <div className="flex items-center gap-2 mb-2">
                                 <span className="text-[10px] font-mono text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded-sm">
                                   {nom.role}
                                 </span>
                              </div>
                              <h4 className={`font-display text-xl uppercase mb-2 ${isSelected ? 'text-teal-400' : 'text-white'}`}>
                                {nom.name}
                              </h4>
                              <p className="text-gray-500 text-sm font-mono leading-relaxed">
                                {nom.desc}
                              </p>
                           </div>
                        </div>
                      )
                    })}
                    
                    <div 
                      onClick={() => handleVote(cat.id, 'skip')}
                      className={`
                        border border-dashed border-gray-800 p-6 flex flex-col items-center justify-center cursor-pointer min-h-[200px] hover:border-gray-500 hover:text-white transition-all
                        ${votes[cat.id] === 'skip' ? 'border-white bg-white/5 text-white' : 'text-gray-600'}
                      `}
                    >
                       <span className="font-display text-lg mb-2">SKIP</span>
                       <span className="text-[10px] font-mono uppercase tracking-widest">Воздержаться</span>
                    </div>

                  </div>
                    </div>
                    ))
                  )}
                </div>

                <div className={`fixed bottom-24 md:bottom-32 left-0 right-0 p-6 pointer-events-none transition-transform duration-500 z-50 ${Object.keys(votes).length > 0 ? 'translate-y-0' : 'translate-y-[200%]'}`}>
                  <div className="container mx-auto flex justify-center">
                    <button 
                      onClick={handleSubmit}
                      className="pointer-events-auto bg-lime-400 text-black font-display font-bold uppercase text-xl px-12 py-4 shadow-xl shadow-lime-400/20 hover:scale-105 transition-transform flex items-center gap-3 transform -skew-x-12 border-2 border-lime-400"
                    >
                      <span className="transform skew-x-12">Отправить голоса ({Object.keys(votes).length})</span>
                      <ChevronRight className="transform skew-x-12" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>
        )}

        {/* === SUCCESS VIEW === */}
        {view === 'success' && (
          <div className="flex flex-col items-center justify-center flex-grow text-center relative z-10 px-4">
             <div className="w-24 h-24 bg-teal-400 rounded-full flex items-center justify-center mb-8 animate-bounce shadow-xl shadow-teal-400/30">
                <Check size={48} className="text-black" />
             </div>
             
             <h2 className="text-4xl md:text-6xl font-display font-bold uppercase text-white mb-4">
               Голос принят
             </h2>
             <p className="text-gray-400 font-mono mb-8">
               [ TRANSACTION_COMPLETE ]
             </p>
             
             <button 
               onClick={() => setView('landing')}
               className="mt-12 text-gray-500 hover:text-white underline decoration-1 underline-offset-4"
             >
               Вернуться на главную
             </button>
          </div>
        )}

        {/* === ADMIN LOGIN === */}
        {view === 'admin-login' && (
          <div className="flex flex-col items-center justify-center flex-grow relative z-10 px-4">
             <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 shadow-2xl">
               <div className="flex justify-center mb-6">
                 <Lock className="text-teal-400 w-12 h-12" />
               </div>
               <h2 className="text-2xl font-display font-bold text-center mb-6 text-white uppercase">Admin Access</h2>
               <input 
                 type="password"
                 placeholder="Enter Passkey"
                 className="w-full bg-black border border-gray-700 p-4 text-center font-mono text-teal-400 focus:outline-none focus:border-teal-400 mb-6 placeholder-gray-700"
                 value={adminPass}
                 onChange={(e) => setAdminPass(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
               />
               <button 
                 onClick={handleAdminLogin}
                 className="w-full bg-teal-400 text-black font-display font-bold uppercase py-4 hover:bg-white transition-colors"
               >
                 Authorize
               </button>
               <button 
                 onClick={() => setView('landing')}
                 className="w-full mt-4 text-gray-600 hover:text-white text-xs font-mono uppercase"
               >
                 Cancel
               </button>
             </div>
          </div>
        )}

        {/* === ADMIN DASHBOARD === */}
        {view === 'admin-dashboard' && (
          <main className="container mx-auto px-4 py-16 max-w-6xl relative z-10">
            <div className="flex justify-between items-end mb-12 border-b border-gray-800 pb-6">
               <div>
                  <h2 className="text-3xl font-display font-bold uppercase text-white mb-2">Admin Panel</h2>
                  <p className="text-gray-500 font-mono text-xs">MANAGE_NOMINEES // VIEW_RESULTS</p>
               </div>
               <button 
                 onClick={() => setView('landing')} 
                 className="flex items-center gap-2 text-red-500 hover:text-white font-mono text-sm border border-red-500/30 px-4 py-2 hover:bg-red-500/10"
               >
                 <LogOut size={14} /> LOGOUT
               </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Sidebar / Category List */}
              <div className="lg:col-span-1 space-y-4">
                 <h3 className="text-lime-400 font-mono text-xs uppercase tracking-widest mb-4">Categories</h3>
                 {categories.map(cat => (
                   <div 
                     key={cat.id}
                     onClick={() => {
                       setEditingCategory(cat.id);
                       setIsEditingCategoryData(false);
                       setEditingCategoryData({
                         title: cat.title,
                         code: cat.code,
                         description: cat.description || ''
                       });
                     }}
                     className={`p-4 border cursor-pointer transition-all flex justify-between items-center ${editingCategory === cat.id ? 'border-teal-400 bg-teal-400/5' : 'border-gray-800 hover:border-gray-600 bg-gray-900'}`}
                   >
                     <span className="font-display font-bold text-sm">{cat.title}</span>
                     <ChevronRight size={14} className={editingCategory === cat.id ? 'text-teal-400' : 'text-gray-700'} />
                   </div>
                 ))}
                 
                 {/* ADD NEW CATEGORY LOGIC */}
                 {isAddingCategory ? (
                   <div className="p-4 border border-teal-400 bg-teal-400/5">
                      <input 
                        autoFocus
                        placeholder="NEW CATEGORY NAME"
                        className="w-full bg-black border border-gray-700 p-2 text-xs text-white mb-2 outline-none focus:border-teal-400 font-display uppercase"
                        value={newCategoryTitle}
                        onChange={(e) => setNewCategoryTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                      />
                      <input 
                        placeholder="CODE (optional)"
                        className="w-full bg-black border border-gray-700 p-2 text-xs text-white mb-2 outline-none focus:border-teal-400 font-mono"
                        value={newCategoryCode}
                        onChange={(e) => setNewCategoryCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                      />
                      <textarea 
                        placeholder="Description (optional)"
                        className="w-full bg-black border border-gray-700 p-2 text-xs text-white mb-2 outline-none focus:border-teal-400 font-mono resize-none"
                        rows="2"
                        value={newCategoryDescription}
                        onChange={(e) => setNewCategoryDescription(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={handleAddCategory} 
                          className="flex-1 bg-teal-400 text-black text-[10px] font-bold py-2 hover:bg-white"
                        >
                          SAVE
                        </button>
                        <button 
                          onClick={() => {
                            setIsAddingCategory(false);
                            setNewCategoryTitle('');
                            setNewCategoryCode('');
                          }} 
                          className="flex-1 border border-gray-700 text-gray-500 text-[10px] py-2 hover:text-white"
                        >
                          CANCEL
                        </button>
                      </div>
                   </div>
                 ) : (
                   <div 
                     onClick={() => setIsAddingCategory(true)}
                     className="p-4 border border-dashed border-gray-800 text-gray-500 hover:text-teal-400 hover:border-teal-400 text-center font-mono text-xs cursor-pointer transition-colors"
                   >
                      + ADD NEW CATEGORY
                   </div>
                 )}
              </div>

              {/* Main Editing Area */}
              <div className="lg:col-span-2">
                 {editingCategory ? (
                   <div className="bg-gray-900 border border-gray-800 p-8">
                      {(() => {
                        const cat = categories.find(c => c.id === editingCategory);
                        return (
                          <>
                            <div className="flex justify-between items-start mb-8">
                               {isEditingCategoryData ? (
                                 <div className="flex-1 space-y-3">
                                   <input
                                     placeholder="Category Title"
                                     className="w-full bg-black border border-gray-700 p-2 text-sm text-white focus:border-teal-400 outline-none font-display uppercase"
                                     value={editingCategoryData.title}
                                     onChange={(e) => setEditingCategoryData({...editingCategoryData, title: e.target.value})}
                                   />
                                   <input
                                     placeholder="Code"
                                     className="w-full bg-black border border-gray-700 p-2 text-sm text-white focus:border-teal-400 outline-none font-mono"
                                     value={editingCategoryData.code}
                                     onChange={(e) => setEditingCategoryData({...editingCategoryData, code: e.target.value})}
                                   />
                                   <textarea
                                     placeholder="Description (optional)"
                                     className="w-full bg-black border border-gray-700 p-2 text-sm text-white focus:border-teal-400 outline-none font-mono resize-none"
                                     rows="2"
                                     value={editingCategoryData.description}
                                     onChange={(e) => setEditingCategoryData({...editingCategoryData, description: e.target.value})}
                                   />
                                   <div className="flex gap-2">
                                     <button
                                       onClick={() => handleUpdateCategory(cat.id)}
                                       className="flex-1 bg-teal-400 text-black text-xs font-bold py-2 hover:bg-white"
                                     >
                                       SAVE
                                     </button>
                                     <button
                                       onClick={() => {
                                         setIsEditingCategoryData(false);
                                         setEditingCategoryData({ title: '', code: '', description: '' });
                                       }}
                                       className="flex-1 border border-gray-700 text-gray-500 text-xs py-2 hover:text-white"
                                     >
                                       CANCEL
                                     </button>
                                   </div>
                                 </div>
                               ) : (
                                 <>
                                   <div>
                                     <span className="text-gray-500 font-mono text-xs block mb-1">EDITING_CATEGORY:</span>
                                     <h3 className="text-2xl font-display font-bold text-white mb-2">{cat.title}</h3>
                                     {cat.description && (
                                       <p className="text-gray-400 text-sm font-mono">{cat.description}</p>
                                     )}
                                   </div>
                                   <div className="flex gap-2">
                                      <button 
                                        onClick={() => {
                                          setEditingCategoryData({
                                            title: cat.title,
                                            code: cat.code,
                                            description: cat.description || ''
                                          });
                                          setIsEditingCategoryData(true);
                                        }}
                                        className="p-2 border border-gray-700 text-gray-400 hover:text-white hover:border-white"
                                        title="Edit Category"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="p-2 border border-red-500/30 text-red-500 hover:text-white hover:bg-red-500/10"
                                        title="Delete Category"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                   </div>
                                 </>
                               )}
                            </div>

                            {/* Nominees List */}
                            <div className="space-y-4 mb-8">
                               {cat.nominees.map(nom => {
                                 const votesCount = getVoteCount(cat.id, nom.id);
                                 return (
                                   <div key={nom.id} className="bg-black border border-gray-800 p-4 flex justify-between items-center group">
                                      <div className="flex-grow">
                                         <div className="flex items-center gap-2 mb-1">
                                            <span className="font-display font-bold text-white">{nom.name}</span>
                                            <span className="text-[10px] font-mono bg-gray-800 px-1 text-gray-400">{nom.role}</span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden">
                                               <div className="h-full bg-teal-400" style={{width: `${Math.min(votesCount, 100)}%`}}></div>
                                            </div>
                                            <span className="text-xs font-mono text-teal-400">{votesCount} votes</span>
                                         </div>
                                      </div>
                                      <button 
                                        onClick={() => handleDeleteNominee(cat.id, nom.id)}
                                        className="text-gray-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                   </div>
                                 );
                               })}
                            </div>

                            {/* Add Nominee Form */}
                            <div className="bg-black/50 border border-gray-800 p-4">
                               <h4 className="text-xs font-mono text-gray-500 uppercase mb-4">+ Add New Nominee</h4>
                               <div className="grid grid-cols-2 gap-4 mb-4">
                                  <input 
                                    placeholder="Name" 
                                    className="bg-gray-900 border border-gray-700 p-2 text-sm text-white focus:border-teal-400 outline-none"
                                    value={newNominee.name}
                                    onChange={(e) => setNewNominee({...newNominee, name: e.target.value})}
                                  />
                                  <input 
                                    placeholder="Role (e.g. MVP)" 
                                    className="bg-gray-900 border border-gray-700 p-2 text-sm text-white focus:border-teal-400 outline-none"
                                    value={newNominee.role}
                                    onChange={(e) => setNewNominee({...newNominee, role: e.target.value})}
                                  />
                               </div>
                               <input 
                                  placeholder="Image URL (optional)" 
                                  className="w-full bg-gray-900 border border-gray-700 p-2 text-sm text-white focus:border-teal-400 outline-none mb-4"
                                  value={newNominee.imageUrl}
                                  onChange={(e) => setNewNominee({...newNominee, imageUrl: e.target.value})}
                               />
                               <input 
                                  placeholder="Description" 
                                  className="w-full bg-gray-900 border border-gray-700 p-2 text-sm text-white focus:border-teal-400 outline-none mb-4"
                                  value={newNominee.desc}
                                  onChange={(e) => setNewNominee({...newNominee, desc: e.target.value})}
                               />
                               <button 
                                 onClick={() => handleAddNominee(cat.id)}
                                 className="w-full bg-gray-800 hover:bg-lime-400 hover:text-black text-white font-mono text-xs uppercase py-3 transition-colors flex items-center justify-center gap-2"
                               >
                                 <Save size={14} /> Save Nominee
                               </button>
                            </div>

                          </>
                        );
                      })()}
                   </div>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center border border-dashed border-gray-800 text-gray-600 font-mono">
                      <BarChart size={48} className="mb-4 opacity-20" />
                      <p>SELECT A CATEGORY TO MANAGE</p>
                   </div>
                 )}
              </div>
            </div>
          </main>
        )}
      </div>

      {/* === TRENDY FOOTER === */}
      <footer className="relative z-20 border-t border-gray-800 bg-black/80 backdrop-blur-md">
        
        {/* Marquee Ticker */}
        <div className="overflow-hidden border-b border-gray-800 py-2 bg-teal-400/5">
          <div className="font-mono text-xs text-teal-400 tracking-widest">
            <div className="animate-marquee flex whitespace-nowrap gap-8">
              {/* Блок 1 */}
              <span>CHILLVILLE AWARDS 2025</span>
              <span>///</span>
              <span>VOTING NOW OPEN</span>
              <span>///</span>
              <span>POWERED BY DISCORD</span>
              <span>///</span>
              <span>CHOOSE YOUR LEGENDS</span>
              <span>///</span>
              <span>CHILLVILLE AWARDS 2025</span>
              <span>///</span>
              <span>VOTING NOW OPEN</span>

              {/* Блок 2 — дубликат для бесшовной анимации */}
              <span>CHILLVILLE AWARDS 2025</span>
              <span>///</span>
              <span>VOTING NOW OPEN</span>
              <span>///</span>
              <span>POWERED BY DISCORD</span>
              <span>///</span>
              <span>CHOOSE YOUR LEGENDS</span>
              <span>///</span>
              <span>CHILLVILLE AWARDS 2025</span>
              <span>///</span>
              <span>VOTING NOW OPEN</span>
            </div>
          </div>
        </div>

        {/* Footer Grid */}
        <div className="container mx-auto px-6 py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 font-mono text-sm">
            
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-6 h-6 bg-teal-400 text-black flex items-center justify-center font-bold font-display text-xs rounded-sm">C</div>
                 <span className="font-display font-bold">CHILLVILLE</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed mb-4">
                The ultimate server awards platform. Celebrating community, gaming, and chaos.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs border-l-2 border-teal-400 pl-3">Voting Info</h4>
              <ul className="space-y-2 text-gray-500 text-xs">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></span>
                  Voting Now Open
                </li>
                <li>Ends: 21.12.2025</li>
                <li className="text-gray-600 text-[10px] mt-3">
                  Choose your legends
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs border-l-2 border-lime-400 pl-3">Connect</h4>
              <ul className="space-y-2 text-gray-500">
                <li>
                  <a 
                    href="https://discord.gg/chill-ville" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-white cursor-pointer transition-colors flex items-center gap-2"
                  >
                    <MessageCircle size={14} /> Discord
                  </a>
                </li>
              </ul>
            </div>

            <div className="text-gray-600 text-xs flex flex-col justify-end items-end">
              <button 
                onClick={() => setView('admin-login')} 
                className="mb-4 text-gray-700 hover:text-white flex items-center gap-1"
              >
                <Lock size={10} /> Admin
              </button>
              <p className="mb-2">© 2025 Chillville Server.</p>
              <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center w-full">
                 <span>v2.5.0</span>
                 <Code size={12} />
              </div>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}

