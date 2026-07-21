// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv'); 
const path = require('path');
const db = require('./db');

dotenv.config(); 
const app = express(); 
const PORT = process.env.PORT || 3000; 
const API_KEY = process.env.API_KEY || 'default_api_key';

app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// =================================
// API Key Middleware
// =================================
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use(requireApiKey);

// =================================
// Routes
// =================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});




// =================================
// Get all properties 
// =================================
app.get('/api/properties', (req, res) => {
  const { isArchived } = req.query;

  db.all(`SELECT * FROM properties`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const processedRows = rows.map(row => ({
      ...row,
      specifications: JSON.parse(row.specifications),
      assets: JSON.parse(row.assets),
      amenities: JSON.parse(row.amenities)
    }));

    res.json(processedRows);
  });
});

// =================================
// Create a new property
// =================================
app.post('/api/properties', (req, res) => {})



// =================================
// Upload Property Assets
// =================================
app.put('/api/properties/upload/:id', (req, res) => {})




// =================================
// Update Property 
// =================================
app.put('/api/properties/:id', (req, res) => {})



// =================================
// Delete multiple properties
// =================================
app.delete('/api/properties', (req, res) => {})


// =================================
// Page not found handler
// =================================
app.use((req, res) => { 
  res.status(404).json({ error: 'Not found' }); 
}); 

app.listen(PORT, () => { 
  console.log(`Server running smoothly on port ${PORT}`); 
});
