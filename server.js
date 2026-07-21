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
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

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
app.post('/api/properties', verifyApiKey, (req, res) => {
  const { 
    title,
    category,
    type,
    price,
    isNegotiable, 
    description, 
    ownerName, 
    ownerContact, 
    location, 
    subLocation, 
    latitude, 
    longitude, 
    mapsLink, 
    activeOffer, 
    offerDescription, 
    isArchived, 
    specifications, 
    amenities 
  } = req.body;
  
  const specs = JSON.stringify(specifications || {});
  const amens = JSON.stringify(amenities || {});

  const sql = `
    INSERT INTO properties 
    (title, category, type, price, isNegotiable, description, ownerName, ownerContact, location, subLocation, latitude, longitude, mapsLink, activeOffer, offerDescription, isArchived, specifications, amenities) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [title, category, type, price, isNegotiable ? 1 : 0, description, ownerName, ownerContact, location, subLocation, latitude ? parseFloat(latitude) : null, longitude ? parseFloat(longitude) : null, mapsLink, activeOffer ? 1 : 0, offerDescription, isArchived ? 1 : 0, specs, amens];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID });
  });
})


// =================================
// Upload Property Assets
// =================================
app.put('/api/properties/upload/:id', verifyApiKey, (req, res) => {})




// =================================
// Update Property 
// =================================
app.put('/api/properties/:id', verifyApiKey, (req, res) => {})



// =================================
// Delete multiple properties
// =================================
app.delete('/api/properties', verifyApiKey, (req, res) => {})


// =================================
// Page not found handler
// =================================
app.use((req, res) => { 
  res.status(404).json({ error: 'Not found' }); 
}); 

app.listen(PORT, () => { 
  console.log(`Server running smoothly on port ${PORT}`); 
});
