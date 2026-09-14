const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

router.get('/', healthController.live);
router.get('/live', healthController.live);
router.get('/ready', healthController.ready);

module.exports = router;
