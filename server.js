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
// Get all properties for public view 
// =================================
app.get('/api/properties', (req, res) => {

  // Explicitly name only the safe columns you want to expose publicly
  const sql = `
    SELECT 
      id, title, category, type, price, isNegotiable, 
      description, location, subLocation, isOfferActive, 
      offerDescription, assets, specifications 
    FROM properties 
    WHERE isArchived = 0
  `;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    
    const processedRows = rows.map(row => ({
      ...row,
      category: JSON.parse(row.category),
      specifications: JSON.parse(row.specifications),
      assets: JSON.parse(row.assets)
    }));

    res.json({ success: true, data: processedRows });
  });
});


// =================================
// Get all archived/unarchived properties for admin view 
// =================================
app.get('/api/properties/admin', verifyApiKey, (req, res) => {

  // Explicitly name only the safe columns you want to expose publicly
  const sql = `
    SELECT * FROM properties
  `;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    
    const processedRows = rows.map(row => ({
      ...row,
      category: JSON.parse(row.category),
      specifications: JSON.parse(row.specifications),
      assets: JSON.parse(row.assets)
    }));

    res.json({ success: true, data: processedRows });
  });
});

// =================================
// Create a new property
// =================================
app.post('/api/properties', verifyApiKey, (req, res) => {
  const { 
    title, category, type, status, price, isNegotiable, description, 
    ownerName, ownerContact, location, subLocation, latitude, longitude, 
    mapsLink, isOfferActive, offerDescription, isArchived, 
    specifications 
  } = req.body;
  
  const cats = JSON.stringify(category || []);
  const specs = JSON.stringify(specifications || {});

  const latNum = latitude ? parseFloat(latitude) : null;
  const longNum = longitude ? parseFloat(longitude) : null;

  const sql = `
    INSERT INTO properties 
    (title, category, type, status, price, isNegotiable, description, ownerName, ownerContact, location, subLocation, latitude, longitude, mapsLink, isOfferActive, offerDescription, isArchived, specifications) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
   const params = [
    title, cats, type, status, price, 
    isNegotiable ? 1 : 0, 
    description, ownerName, ownerContact, location, subLocation, 
    latNum, longNum, mapsLink, 
    isOfferActive ? 1 : 0, 
    offerDescription, 
    isArchived ? 1 : 0, 
    specs
  ]

  db.run(sql, params, function(err) {
    if (err) return res.status(400).json({ success: false, error: err.message });
    res.status(201).json({ success: true, message: "Property created successfully" });
  });
})


// =================================
// Upload Property Assets
// =================================
app.put('/api/properties/upload/:id', verifyApiKey, (req, res) => {

})


// =================================
// Update Property 
// =================================
app.put('/api/properties/:id', verifyApiKey, (req, res) => {
  const { id } = req.params; 

  const { 
    title, category, type, status, price, isNegotiable, description, 
    ownerName, ownerContact, location, subLocation, latitude, longitude, 
    mapsLink, isOfferActive, offerDescription, isArchived, 
    specifications
  } = req.body;

  // 1. Prepare JSON strings
  const cats = JSON.stringify(category || []);
  const specs = JSON.stringify(specifications || {});

  // 2. Prepare Coordinate numbers
  const latNum = latitude ? parseFloat(latitude) : null;
  const longNum = longitude ? parseFloat(longitude) : null;

  // 3. SQL UPDATE Statement
  const sql = `
    UPDATE properties 
    SET 
      title = ?, category = ?, type = ?, status = ?, price = ?, isNegotiable = ?, 
      description = ?, ownerName = ?, ownerContact = ?, location = ?, 
      subLocation = ?, latitude = ?, longitude = ?, mapsLink = ?, 
      isOfferActive = ?, offerDescription = ?, isArchived = ?, 
      specifications = ?
    WHERE id = ?
  `;

    // 4. Map parameters (the ID goes last to match the WHERE clause)
  const params = [
    title, cats, type, status, price, 
    isNegotiable ? 1 : 0, 
    description, ownerName, ownerContact, location, subLocation, 
    latNum, longNum, mapsLink, 
    isOfferActive ? 1 : 0, 
    offerDescription, 
    isArchived ? 1 : 0, 
    specs,
    id
  ];

  db.run(sql, params, function(err) {
    if (err) 
      return res.status(400).json({ success: false, error: err.message });
    
    res.status(200).json({ success: true, message: "Property updated successfully" });
  });
})


// =================================
// Update isNegotiable status of a property
// =================================
app.put('/api/properties/negotiable/:id', verifyApiKey, (req, res) => {
  const { id } = req.params; 
  const { isNegotiable } = req.body;

  const sql = `UPDATE properties SET isNegotiable = ? WHERE id = ?`;

  db.run(sql, [isNegotiable ? 1 : 0, id], function(err) {
    if (err) return res.status(400).json({ success: false, error: err.message });
    res.json({ success: true, message: `Property ${id} negotiable status updated to ${isNegotiable}` });
  });
})


// =================================
// Update isArchived status of a property
// =================================
app.put('/api/properties/archive/:id', verifyApiKey, (req, res) => {
  const { id } = req.params; 
  const { isArchived } = req.body;

  const sql = `UPDATE properties SET isArchived = ? WHERE id = ?`;

  db.run(sql, [isArchived ? 1 : 0, id], function(err) {
    if (err) return res.status(400).json({ success: false, error: err.message });
    res.json({ success: true, message: `Property ${id} archive status updated to ${isArchived}` });
  });
})


// =================================
// Delete multiple properties
// =================================
app.delete('/api/properties', verifyApiKey, (req, res) => {
  const { ids } = req.body; 

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: 'Invalid or missing property IDs' });
  }

  const placeholders = ids.map(() => '?').join(', ');
  const sql = `DELETE FROM properties WHERE id IN (${placeholders})`;
  
  db.run(sql, ids, function(err) {
    if (err) return res.status(400).json({ success: false, error: err.message });
    res.json({ success: true, message: `${this.changes} properties deleted successfully` });
  });
})


// =================================
// Page not found handler
// =================================
app.use((req, res) => { 
  res.status(404).json({ success: false, error: 'Not found' }); 
}); 

app.listen(PORT, () => { 
  console.log(`Server running smoothly on port ${PORT}`); 
});
