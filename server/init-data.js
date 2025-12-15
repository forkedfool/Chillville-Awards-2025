import { createCategory, createNominee } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

// Инициализация начальных данных
async function initData() {
  try {
    // Создаем категории и номинантов
    const categories = [
      {
        title: "ТИТАНЫ СЕРВЕРА",
        code: "TITAN_CLASS",
        nominees: [
          { name: "DarkSlayer", desc: "Душа компании 24/7. Живет в войсе.", role: "MVP" },
          { name: "HealerGirl", desc: "Саппорт года. Помогает всем новичкам.", role: "HELPER" },
          { name: "MemeLord", desc: "Главный генератор локальных мемов.", role: "FUN" },
        ]
      },
      {
        title: "КРИНЖ ГОДА",
        code: "CRINGE_MOMENT",
        nominees: [
          { name: "Спор за Аниме", desc: "5 часов криков в канале General.", role: "DRAMA" },
          { name: "Микрофон Васи", desc: "ASMR поедание чипсов на стриме.", role: "FAIL" },
          { name: "Удаление #rules", desc: "Случайный миссклик админа.", role: "EPIC" },
        ]
      },
      {
        title: "СОБЫТИЕ ГОДА",
        code: "EVENT_LOG",
        nominees: [
          { name: "Турнир по CS2", desc: "Легендарный камбэк команды А.", role: "GAME" },
          { name: "Новый год 2024", desc: "Караоке баттл до 6 утра.", role: "IRL" },
        ]
      }
    ];

    for (const cat of categories) {
      try {
        const result = await createCategory(cat.title, cat.code);
        const categoryId = result.lastInsertRowid || result.id;
        
        for (const nom of cat.nominees) {
          await createNominee(categoryId, nom.name, nom.desc, nom.role);
        }
        
        console.log(`✅ Создана категория: ${cat.title}`);
      } catch (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          console.log(`⚠️  Категория "${cat.title}" уже существует, пропускаем`);
        } else {
          console.error(`❌ Ошибка создания категории "${cat.title}":`, error.message);
        }
      }
    }

    console.log('✅ Инициализация данных завершена');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error);
    process.exit(1);
  }
}

initData();
