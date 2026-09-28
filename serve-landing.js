/**
 * Simple server to serve landingpage.html
 * Run: node serve-landing.js
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = 5173;

// Serve static files from current directory
app.use(express.static(path.join(__dirname, 'landing/public')));
app.use('/assets', express.static(path.join(__dirname, 'landing/public/assets')));

// Serve landingpage.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landingpage.html'));
});

// Also serve it at /landing
app.get('/landing', (req, res) => {
  res.sendFile(path.join(__dirname, 'landingpage.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Landing page running at: http://localhost:${PORT}`);
  console.log(`✅ Open your browser and go to http://localhost:${PORT}`);
});
