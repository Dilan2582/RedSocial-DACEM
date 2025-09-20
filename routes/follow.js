const express = require('express');
const { followUser, unfollowUser } = require('../controllers/follow');
const auth = require('../middlewares/auth');
const router = express.Router();

router.post('/:id', auth, followUser);
router.delete('/:id', auth, unfollowUser);

module.exports = router;
