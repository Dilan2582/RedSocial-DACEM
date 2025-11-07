// routes/follow.js
const router = require('express').Router();
const { ensureAuth } = require('../middlewares/auth');
const {
  followUser, unfollowUser, toggleFollow,
  listFollowers, listFollowing,
  acceptFollowRequest, rejectFollowRequest, getFollowRequests,
  removeFollower
} = require('../controllers/follow');

// Rutas específicas primero (antes de las rutas con :id)
router.get('/requests', ensureAuth, getFollowRequests);

// Rutas con parámetros
router.post('/toggle/:id', ensureAuth, toggleFollow);
router.post('/:id/remove', ensureAuth, removeFollower);
router.post('/:id/accept', ensureAuth, acceptFollowRequest);
router.post('/:id/reject', ensureAuth, rejectFollowRequest);
router.post('/:id', ensureAuth, followUser);
router.delete('/:id', ensureAuth, unfollowUser);
router.post('/:id/accept', ensureAuth, acceptFollowRequest);
router.post('/:id/reject', ensureAuth, rejectFollowRequest);
router.get('/:id/followers', ensureAuth, listFollowers);
router.get('/:id/following', ensureAuth, listFollowing);

module.exports = router;
