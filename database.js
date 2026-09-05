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
      db.all("PRAGMA table_info(Item)", (pragmaError, columns) => {
        if (pragmaError) {
          console.error("Error checking Item columns", pragmaError.message);
          return;
        }
        if (!columns.some((column) => column.name === "IsActive")) {
          db.run("ALTER TABLE Item ADD COLUMN IsActive INTEGER NOT NULL DEFAULT 1", (migrationError) => {
            if (migrationError) console.error("Error adding Item.IsActive", migrationError.message);
          });
        }
      });
      //else console.log("Tables created/verified.");
    });
  }
});

module.exports = db;