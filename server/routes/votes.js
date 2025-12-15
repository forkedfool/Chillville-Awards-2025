import express from 'express';
import { isAuthenticated, isAdmin } from '../auth.js';
import {
  getUserVotes,
  getUserVoteForCategory,
  submitVote,
  getVoteCountsByCategory,
  getAllVoteStats
} from '../database.js';

const router = express.Router();

// Получить все голоса текущего пользователя
router.get('/my-votes', isAuthenticated, async (req, res) => {
  try {
    const votes = await getUserVotes(req.user.id);
    const votesMap = {};
    votes.forEach(vote => {
      votesMap[vote.category_id] = vote.is_skip ? 'skip' : vote.nominee_id;
    });
    res.json({ votes: votesMap });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отправить голос
router.post('/submit', isAuthenticated, async (req, res) => {
  try {
    const { votes } = req.body; // { categoryId: nomineeId или 'skip' }
    
    if (!votes || typeof votes !== 'object') {
      return res.status(400).json({ error: 'Неверный формат голосов' });
    }

    const userId = req.user.id;
    const results = [];

    for (const [categoryId, nomineeId] of Object.entries(votes)) {
      const isSkip = nomineeId === 'skip';
      const nomineeIdNum = isSkip ? null : parseInt(nomineeId);
      
      await submitVote(userId, parseInt(categoryId), nomineeIdNum, isSkip);
      results.push({ categoryId: parseInt(categoryId), success: true });
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить статистику голосов по категории (публичная)
router.get('/stats/:categoryId', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const stats = await getVoteCountsByCategory(categoryId);
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить полную статистику (только для админов)
router.get('/stats', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const stats = await getAllVoteStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
