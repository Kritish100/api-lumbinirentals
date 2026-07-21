// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv'); 
const path = require('path');
const db = require('./db');

dotenv.config(); 
const app = express(); 
const PORT = process.env.PORT || 3000; 

app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// Get all properties
app.get('/api/properties', (req, res) => {
  db.all(`SELECT * FROM properties`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const processedRows = rows.map(row => ({
      ...row,
      specifications: JSON.parse(row.specifications),
      images: JSON.parse(row.images),
      videos: JSON.parse(row.videos),
      amenities: JSON.parse(row.amenities)
    }));

    res.json(processedRows);
  });
});

// Upload images/videos for a property
app.put('/api/properties/upload/:id', (req, res) => {})

// Update property details
app.put('/api/properties/:id', (req, res) => {})

// 404 Handler 
app.use((req, res) => { 
  res.status(404).json({ error: 'Not found' }); 
}); 

app.listen(PORT, () => { 
  console.log(`Server running smoothly on port ${PORT}`); 
});
