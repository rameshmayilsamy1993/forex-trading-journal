const express = require('express');
const router = express.Router();
const { 
  getChecklists, 
  getChecklistById, 
  getActiveSessions,
  getActiveChecklists,
  createChecklist, 
  updateChecklist,
  linkToTrade,
  linkChecklistToTrades,
  unlinkChecklistFromTrades,
  deleteChecklist 
} = require('./checklist.controller');

router.get('/', getChecklists);
router.get('/active', getActiveSessions);
router.get('/active-list', getActiveChecklists);
router.get('/:id', getChecklistById);
router.post('/', createChecklist);
router.put('/:id', updateChecklist);
router.post('/link', linkChecklistToTrades);
router.post('/unlink', unlinkChecklistFromTrades);
router.post('/:id/link-trade', linkToTrade);
router.delete('/:id', deleteChecklist);

module.exports = router;
