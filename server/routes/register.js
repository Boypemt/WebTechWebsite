/**
 * routes/register.js — Registration Route
 *
 * Maps POST / → authController.register.
 * Mounted at /api/register in app.js, so the full path is:
 *   POST /api/register
 *
 * Used by: app.js
 */

const express          = require('express');
const router           = express.Router();
const { register }     = require('../controllers/authController');


// POST /api/register — accepts first_name + email + password, returns JWT on success
router.post('/', register);


module.exports = router;
