/**
 * fileReader.js — Async JSON File Reader
 *
 * A thin wrapper around Node's fs.promises.readFile that parses
 * the result as JSON. Keeping this separate means any file I/O
 * concerns (encoding, error messages) live in one place.
 *
 * Used by: services/productService.js
 */

const fs   = require('fs').promises;
const path = require('path');


// -------------------------------------------------------------
// readJSON(filePath)
// Reads a file at the given path and returns the parsed JS value.
// filePath can be absolute or relative — path.resolve() handles both.
// Returns a Promise, so callers use await.
// -------------------------------------------------------------
async function readJSON(filePath) {
    const absolute = path.resolve(filePath);
    const raw      = await fs.readFile(absolute, 'utf-8');
    return JSON.parse(raw);
}


module.exports = { readJSON };
