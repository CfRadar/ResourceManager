const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'Backend API',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Express Backend running on http://localhost:${PORT}`);
});
