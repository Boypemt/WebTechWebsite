const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Hello! Your Express backend is working.');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
