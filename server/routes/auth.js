/**
 * routes/auth.js — Authentication Routes
 *
 * Maps POST / → authController.login.
 * Mounted at /api/login in app.js, so the full path is:
 *   POST /api/login
 *
 * Keeping routes thin (URL → handler only, no logic) matches the
 * Controller → Route → Service pattern used across this project.
 *
 * Used by: app.js
 */

const express        = require('express');
const router         = express.Router();
const { login }      = require('../controllers/authController');


// POST /api/login — accepts email + password, returns JWT on success
router.post('/', login);


module.exports = router;
