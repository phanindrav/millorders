const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const DBSOURCE = "app.db";

// Initialize DB
let db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    //console.log("Connected to SQLite database.");
    const schema = fs.readFileSync("schema.sql", "utf8");
    db.exec(schema, (err) => {
      if (err) console.error("Error creating tables", err.message);
      //else console.log("Tables created/verified.");
    });
  }
});

module.exports = db;