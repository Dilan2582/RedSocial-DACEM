// routes/follow.js
const router = require('express').Router();
const { ensureAuth } = require('../middlewares/auth');
const {
  followUser, unfollowUser, toggleFollow,
  listFollowers, listFollowing
} = require('../controllers/follow');

router.post('/:id', ensureAuth, followUser);
router.delete('/:id', ensureAuth, unfollowUser);
router.post('/toggle/:id', ensureAuth, toggleFollow);
router.get('/:id/followers', ensureAuth, listFollowers);
router.get('/:id/following', ensureAuth, listFollowing);

module.exports = router;
