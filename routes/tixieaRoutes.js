const express = require('express');
const router = express.Router();
const { makeCall, saveLead } = require('../controllers/tixieaController');

router.post('/call', makeCall);
router.post('/save-lead', saveLead);

module.exports = router; 