import express from 'express';
import { isAuthenticated, isAdmin } from '../auth.js';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getNomineesByCategory,
  createNominee,
  updateNominee,
  deleteNominee
} from '../database.js';

const router = express.Router();

// Получить все категории с номинантами (публичный endpoint)
router.get('/', async (req, res) => {
  try {
    const categories = await getAllCategories();
    const categoriesWithNominees = await Promise.all(categories.map(async (cat) => {
      const nominees = await getNomineesByCategory(cat.id);
      return {
        id: cat.id,
        title: cat.title,
        code: cat.code,
        description: cat.description,
        nominees: nominees.map(nom => ({
          id: nom.id,
          name: nom.name,
          desc: nom.description,
          role: nom.role,
          imageUrl: nom.image_url
        }))
      };
    }));
    res.json({ categories: categoriesWithNominees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить одну категорию
router.get('/:id', async (req, res) => {
  try {
    const category = await getCategoryById(parseInt(req.params.id));
    if (!category) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }
    const nominees = await getNomineesByCategory(category.id);
    res.json({
      ...category,
      nominees: nominees.map(nom => ({
        id: nom.id,
        name: nom.name,
        desc: nom.description,
        role: nom.role,
        imageUrl: nom.image_url
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать категорию (только админ)
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, code, description } = req.body;
    if (!title || !code) {
      return res.status(400).json({ error: 'Требуются title и code' });
    }
    const result = await createCategory(title, code, description);
    res.json({ success: true, category: { id: result.lastInsertRowid, title, code, description } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновить категорию (только админ)
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, code, description } = req.body;
    if (!title || !code) {
      return res.status(400).json({ error: 'Требуются title и code' });
    }
    await updateCategory(id, title, code, description);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Удалить категорию (только админ)
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteCategory(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать номинанта (только админ)
router.post('/:categoryId/nominees', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const { name, desc, role, imageUrl } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Требуется name' });
    }
    const result = await createNominee(categoryId, name, desc || '', role || 'NEW', imageUrl || null);
    res.json({
      success: true,
      nominee: {
        id: result.lastInsertRowid,
        name,
        desc: desc || '',
        role: role || 'NEW',
        imageUrl: imageUrl || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновить номинанта (только админ)
router.put('/:categoryId/nominees/:nomineeId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const nomineeId = parseInt(req.params.nomineeId);
    const { name, desc, role, imageUrl } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Требуется name' });
    }
    await updateNominee(nomineeId, name, desc || '', role || 'NEW', imageUrl || null);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Удалить номинанта (только админ)
router.delete('/:categoryId/nominees/:nomineeId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const nomineeId = parseInt(req.params.nomineeId);
    await deleteNominee(nomineeId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
