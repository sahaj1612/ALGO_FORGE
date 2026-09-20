const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminMiddleware');
const problemController = require('../controllers/problemController');
const { validateProblemPayload } = require('../middleware/validator');

// 1. PUBLIC GET ALL PROBLEMS (cursor pagination, filters, search, solved status)
router.get('/', problemController.listProblems);

// 2. ADMIN PROBLEM OPERATIONS
router.get('/admin/all', auth, adminAuth, problemController.listAllProblemsAdmin);
router.post('/admin', auth, adminAuth, validateProblemPayload, problemController.createProblemAdmin);
router.put('/admin/:id', auth, adminAuth, validateProblemPayload, problemController.updateProblemAdmin);
router.delete('/admin/:id', auth, adminAuth, (req, res, next) => {
  if (req.query.hard === 'true' || req.query.permanent === 'true') {
    return problemController.deleteProblemAdmin(req, res, next);
  }
  return problemController.retireProblemAdmin(req, res, next);
});
router.delete('/admin/:id/permanent', auth, adminAuth, problemController.deleteProblemAdmin);

// 3. PUBLIC GET PROBLEM DETAIL (by slug or ObjectId fallback)
router.get('/:slug', problemController.getProblemDetail);

module.exports = router;
