// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../lumbinirentals.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('CRITICAL: SQLite connection failed:', err.message);
    process.exit(1);
  }
  console.log('Database connection securely provisioned.');
});

// Configure base operations sequentially
db.serialize(() => {
  // Ensure background foreign key validation features are active
  db.run("PRAGMA foreign_keys = ON;");
  
  // Define structural layouts safely using standard text syntax
  const INITIAL_SCHEMA = `
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      price REAL NOT NULL,
      floor TEXT NOT NULL,
      status TEXT NOT NULL,
      location TEXT NOT NULL,
      subLocation TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      mapsLink TEXT,
      description TEXT,
      ownerName TEXT NOT NULL,
      ownerContact TEXT NOT NULL,
      activeOffer BOOLEAN DEFAULT 0,
      activeDescription TEXT,
      isArchived BOOLEAN DEFAULT 0,
      specifications TEXT DEFAULT '{}' CHECK(json_valid(specifications)),
      images TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(images)),
      videos TEXT DEFAULT '[]' CHECK(json_valid(videos)),
      amenities TEXT DEFAULT '{}' CHECK(json_valid(amenities))
    );
  `;
  
  db.exec(INITIAL_SCHEMA, (err) => {
    if (err) return console.error('CRITICAL: Core table setup failed:', err.message);
    console.log('Core tables synchronized successfully.');
  });
});


// Cleanly handle database connection disconnect when server terminates
process.on('SIGINT', () => {
  db.close(() => {
    console.log('SQLite database connection successfully closed.');
    process.exit(0);
  });
});

module.exports = db;
