const express = require('express');
const router = express.Router();
const {
  createRoom, getMyRooms, getRoom,
  joinRoom, createFile, getFileVersions
} = require('../controllers/roomController');
const authMiddleware = require('../middleware/authMiddleware');

// All room routes require authentication
router.use(authMiddleware);

router.post('/', createRoom);
router.get('/', getMyRooms);
router.get('/:roomId', getRoom);
router.post('/:roomId/join', joinRoom);
router.post('/:roomId/files', createFile);
router.get('/files/:fileId/versions', getFileVersions);

module.exports = router;
