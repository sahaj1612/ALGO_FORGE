const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminMiddleware');
const problemController = require('../controllers/problemController');

// 1. PUBLIC GET ALL PROBLEMS (cursor pagination, filters, search, solved status)
router.get('/', problemController.listProblems);

// 2. ADMIN PROBLEM OPERATIONS
router.get('/admin/all', auth, adminAuth, problemController.listAllProblemsAdmin);
router.post('/admin', auth, adminAuth, problemController.createProblemAdmin);
router.put('/admin/:id', auth, adminAuth, problemController.updateProblemAdmin);
router.delete('/admin/:id', auth, adminAuth, problemController.retireProblemAdmin);

// 3. PUBLIC GET PROBLEM DETAIL (by slug or ObjectId fallback)
router.get('/:slug', problemController.getProblemDetail);

module.exports = router;
