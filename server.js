const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");
const db = require("./database");
const path = require("path");
const { group } = require("console");

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "rice-mill-secret";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function createToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(signatureInput).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  if (expectedSignature !== signature) return null;

  try {
    return JSON.parse(base64UrlDecode(payload));
  } catch (error) {
    return null;
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication token required" });
  }

  const user = verifyToken(token);
  if (!user) return res.status(403).json({ error: "Invalid or expired token" });

  req.user = user;
  next();
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function ensureAdminUser() {
  const defaultUsername = "admin";
  const defaultPassword = "admin123";
  const hashedPassword = hashPassword(defaultPassword);

  db.get("SELECT * FROM User WHERE username = ?", [defaultUsername], (err, row) => {
    if (err) return;
    if (!row) {
      db.run("INSERT INTO User (username, password, role) VALUES (?, ?, ?)", [defaultUsername, hashedPassword, "admin"]);
    }
  });
}

const createUsersTable = () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user'
    )
  `);
};

createUsersTable();
ensureAdminUser();

/**
 * FRONTEND ROUTES
 */
// app.get("/", (req, res) => {
//   res.render("dashboard");
// });
// app.get("/partials/agent", (req, res) => res.render("partials/agent"));
// app.get("/partials/shop", (req, res) => res.render("partials/shop"));
// app.get("/partials/item", (req, res) => res.render("partials/item"));

/**
 * Utility: Generic CRUD functions
 */

/* ---------- API: AGENTS ---------- */
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  console.log("Login attempt:", username);

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  db.get("SELECT * FROM User WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const validPassword = hashPassword(password) === user.password;
    if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

    const token = createToken({ id: user.id, username: user.username, role: user.role });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });
});

app.get("/api/agents", authenticateToken, (req, res) => {
  db.all("SELECT * FROM Agent ORDER BY AgentName", [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/agents/:id", authenticateToken, (req, res) => {
  db.get("SELECT * FROM Agent WHERE AgentId = ?", [req.params.id], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(row || {});
  });
});

app.get('/api/reports/agent-summary/:agentId', authenticateToken, (req, res) => {
  const { agentId } = req.params;
  const isAll = agentId === 'all';
  const params = !isAll ? [agentId] : [];

  const sql = `
    SELECT
      a.AgentId,
      a.AgentName,
      o.OrderId,
      o.Date,
      s.ShopId,
      s.ShopName,
      s.Place,
      s.PhoneNumber,
      r.RiceType AS ItemName,
      b.BrandName AS Brand,
      oi.Bags,
      oi.Kgs,
      ROUND(oi.Bags * oi.Kgs / 100.0, 2) AS Quintals,
      oi.Rate,
      ROUND((oi.Bags * oi.Kgs / 100.0) * oi.Rate, 2) AS Amount,
      oi.Condition,
      st.Status
    FROM Orders o
    LEFT JOIN Shop s ON o.ShopId = s.ShopId
    LEFT JOIN Agent a ON s.AgentId = a.AgentId
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE st.StatusId IN (1,2) AND o.DeliveryDate IS NULL
    ${!isAll ? 'AND s.AgentId = ?' : ''}
    ORDER BY a.AgentName, o.Date, o.OrderId
  `;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ details: rows || [] });
  });
});

app.get('/api/reports/item-summary/:agentId', authenticateToken, (req, res) => {
  const { agentId } = req.params;
  const isAll = agentId === 'all';
  const params = !isAll ? [agentId] : [];

  const summarySql = `
    SELECT 
      r.RiceType AS ItemName,
      b.BrandName AS Brand,
      SUM(oi.Bags) AS Bags,
      ROUND(SUM(oi.Bags * oi.Kgs) / 100.0, 2) AS Quintals
    FROM Orders o
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Shop s ON s.ShopId = o.ShopId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE st.StatusId IN (1,2) AND o.DeliveryDate IS NULL
    ${!isAll ? 'AND s.AgentId = ?' : ''}
    GROUP BY r.RiceId, b.BrandId
    ORDER BY Quintals DESC, r.RiceType, b.BrandName
  `;

  const detailSql = `
    SELECT 
      r.RiceType AS ItemName,
      b.BrandName AS Brand,
      oi.Kgs,
      ROUND(SUM(oi.Bags * oi.Kgs) / 100.0, 2) AS Quintals
    FROM Orders o
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Shop s ON s.ShopId = o.ShopId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE st.StatusId IN (1,2) AND o.DeliveryDate IS NULL
    ${!isAll ? 'AND s.AgentId = ?' : ''}
    GROUP BY r.RiceId, b.BrandId, oi.Kgs
    ORDER BY r.RiceType, b.BrandName, oi.Kgs
  `;

  db.all(summarySql, params, (err, summaryRows) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(detailSql, params, (err2, detailRows) => {
      if (err2) return res.status(500).json({ error: err.message });
      res.json({ summary: summaryRows || [], details: detailRows || [] });
    });
  });
});

app.get('/api/reports/daily-report/:date', authenticateToken, (req, res) => {
  const { date } = req.params;
  const sql = `
    SELECT 
      a.AgentId,
      a.AgentName,
      s.ShopName,
      s.Place,
      r.RiceType AS ItemName,
      t.Id As TypeId,
      t.Name AS TypeName,
      b.BrandName AS Brand,
      oi.Bags,
      oi.Kgs,
      ROUND(oi.Bags * oi.Kgs / 100.0, 2) AS Quintals,
      ROUND(oi.Rate, 2) AS Rate,
      ROUND((oi.Bags * oi.Kgs / 100.0) * oi.Rate, 2) AS Amount,
      o.OrderId
    FROM Orders o
    LEFT JOIN Shop s ON o.ShopId = s.ShopId
    LEFT JOIN Agent a ON s.AgentId = a.AgentId
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN "Type" t ON t.Id = r.TypeId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE o.DeliveryDate IS NOT NULL AND o.DeliveryDate = ?
    ORDER BY a.AgentName, o.OrderId, s.ShopId
  `;

  db.all(sql, [date], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ orders: rows || [] });
  });
});

app.get('/api/reports/check-report/', authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      o.OrderId, 
      o.Date, 
      s.ShopName, 
      s.Place, 
      --s.PhoneNumber,
      r.RiceType AS ItemName, 
      b.BrandName As Brand, 
      oi.Bags, 
      oi.Kgs,
      oi.Bags * oi.Kgs / 100 AS Quintals,
      oi.Rate
      --(oi.Bags * oi.Kgs / 100) * oi.Rate AS Amount,
      --oi.Condition, 
      --oi.Notes,
      --st.Status
    FROM Orders o
    LEFT JOIN Shop s ON o.ShopId = s.ShopId
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE  st.StatusId IN (1,2) AND o.DeliveryDate IS NULL
    ORDER BY o.OrderId, s.ShopId
  `;
 
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ data: rows || [] });
  });
});

app.post("/api/agents", authenticateToken, (req, res) => {
  const { AgentName } = req.body;
  db.run("INSERT INTO Agent (AgentName) VALUES (?)", [AgentName], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ AgentId: this.lastID, AgentName });
  });
});

app.put("/api/agents/:id", authenticateToken, (req, res) => {
  const { AgentName } = req.body;
  db.run(
    "UPDATE Agent SET AgentName=? WHERE AgentId=?",
    [AgentName, req.params.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete("/api/agents/:id", authenticateToken, (req, res) => {
  db.run("DELETE FROM Agent WHERE AgentId=?", [req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

/* ---------- API: ITEMS ---------- */
// app.get("/api/items", authenticateToken, (req, res) => {
//   db.all("SELECT * FROM Item ORDER BY Name", [], (err, rows) => {
//     if (err) return res.status(400).json({ error: err.message });
//     res.json(rows);
//   });
// });

app.get("/api/ricesummary", (req, res) => {

    const sql = `
            SELECT 
              r.RiceId AS RiceId,
              r.RiceType AS ItemName,
              ROUND(SUM(oi.Bags * oi.Kgs) / 100.0, 2) AS Quintals
            FROM Orders o
            LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
            LEFT JOIN Shop s ON s.ShopId = o.ShopId
            LEFT JOIN Item i ON i.ItemId = oi.ItemId
            LEFT JOIN Status st ON st.StatusId = oi.StatusId
            LEFT JOIN Rice r ON r.RiceId = i.RiceId
            LEFT JOIN Brand b ON b.BrandId = i.BrandId
            WHERE st.StatusId IN (1,2) AND o.DeliveryDate IS NULL 
            GROUP BY i.RiceId
            ORDER BY r.Odr
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                error: "Database error"
            });
        }

        res.json(rows);
    });
});

app.get("/api/rice-report", (req, res) => {
  const riceId = req.query.riceId || "all";
  return app._router.handle ? res.redirect(307, `/api/rice-report/${encodeURIComponent(riceId)}`) : res.json({ items: [], details: [], riceName: "All Rice", selectedRice: riceId });
});

app.get("/api/rice-report/:riceId", (req, res) => {
  const { riceId } = req.params;

  let filter = "";
  let params = [];

  if (riceId !== "all") {
    filter = "AND r.RiceId = ?";
    params.push(riceId);
  }

  const query = `
    SELECT 
      o.OrderId, 
      o.Date, 
      s.ShopName, 
      s.Place, 
      s.PhoneNumber,
      r.RiceType AS ItemName,
      b.BrandName AS Brand,
      oi.Bags,
      oi.Kgs,
      ROUND((oi.Bags * oi.Kgs) / 100.0, 2) AS Quintals,
      oi.Rate,
      ROUND(((oi.Bags * oi.Kgs) / 100.0) * oi.Rate, 2) AS Amount,
      oi.Condition,
      oi.Notes,
      st.Status
    FROM Orders o
    LEFT JOIN Shop s ON o.ShopId = s.ShopId
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE st.StatusId IN (1,2) AND o.DeliveryDate IS NULL ${filter}
    ORDER BY o.Date, o.OrderId, s.ShopId
  `;

  db.all("SELECT RiceId, RiceType AS Name FROM Rice ORDER BY Odr", [], (err, items) => {
    if (err) {
      console.error("Error fetching rice types:", err);
      return res.status(500).json({ success: false, error: "Error fetching rice types" });
    }

    db.all(query, params, (err2, details) => {
      if (err2) {
        console.error("Error running rice query:", err2);
        return res.status(500).json({ success: false, error: "Error fetching rice report" });
      }

      let riceName = "All Rice";
      if (riceId !== "all") {
        const found = items.find(r => String(r.RiceId) === String(riceId));
        riceName = found ? `${found.Name}` : "Unknown Rice";
      }

      res.json({
        items: items || [],
        selectedRice: riceId,
        riceName,
        details: details || []
      });
    });
  });
});

app.get("/api/brandsummary", (req, res) => {

    const sql = `
        SELECT
            r.RiceId,
            r.RiceType AS ItemName,
            b.BrandName,
            oi.Kgs,
            SUM(oi.Bags) Bags,
            ROUND(SUM(oi.Bags * oi.Kgs) / 100.0, 2) AS Quintals
        FROM Orders o
        LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
        LEFT JOIN Item i ON i.ItemId = oi.ItemId
        LEFT JOIN Status st ON st.StatusId = oi.StatusId
        LEFT JOIN Rice r ON r.RiceId = i.RiceId
        LEFT JOIN Brand b ON b.BrandId = i.BrandId
        WHERE st.StatusId IN (1,2)
          AND o.DeliveryDate IS NULL
        GROUP BY r.RiceId, b.BrandId, oi.Kgs
        ORDER BY r.Odr, oi.Kgs, b.BrandId, oi.kgs asc
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: "Database error"
            });
        }

        const grouped = [];

        rows.forEach(row => {
            let rice = grouped.find(x => x.RiceId === row.RiceId);

            if (!rice) {
                rice = {
                    RiceId: row.RiceId,
                    ItemName: row.ItemName,
                    Quintals: 0,
                    brands: []
                };
                grouped.push(rice);
            }

            const quintals = Number(row.Quintals);

            rice.Quintals += quintals;

            rice.brands.push({
                BrandName: row.BrandName,
                Kgs: row.Kgs,
                Bags: row.Bags,
                Quintals: quintals
            });
        });

        // Optional: Round totals to 2 decimal places
        grouped.forEach(rice => {
            rice.Quintals = Number(rice.Quintals.toFixed(2));
        });

        res.json(grouped);
    });

});

app.get("/api/agentsummary", (req, res) => {

    const sql = `
        SELECT
            a.AgentId,
            a.AgentName,
            r.RiceId,
            r.RiceType,
            b.BrandId,
            b.BrandName,
            SUM(oi.Bags) AS Bags,
            oi.Kgs AS Kgs,
            ROUND(SUM(oi.Bags * oi.Kgs) / 100.0, 2) AS Quintals
        FROM Orders o
        INNER JOIN OrderItem oi ON o.OrderId = oi.OrderId
        INNER JOIN Shop s ON s.ShopId = o.ShopId
        INNER JOIN Agent a ON a.AgentId = s.AgentId
        INNER JOIN Item i ON i.ItemId = oi.ItemId
        INNER JOIN Status st ON st.StatusId = oi.StatusId
        INNER JOIN Rice r ON r.RiceId = i.RiceId
        INNER JOIN Brand b ON b.BrandId = i.BrandId
        WHERE st.StatusId IN (1,2)
          AND o.DeliveryDate IS NULL
        GROUP BY
            a.AgentId,
            r.RiceId,
            oi.Kgs,
            b.BrandId
        ORDER BY
            a.AgentId,
            r.Odr,
            b.BrandName
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                error: "Database error"
            });
        }

        const agents = [];

        rows.forEach(row => {

            // Agent
            let agent = agents.find(a => a.agentId === row.AgentId);

            if (!agent) {
                agent = {
                    agentId: row.AgentId,
                    agentName: row.AgentName,
                    quintals: 0,
                    rice: []
                };
                agents.push(agent);
            }

            // Rice
            let rice = agent.rice.find(r => r.riceId === row.RiceId);

            if (!rice) {
                rice = {
                    riceId: row.RiceId,
                    riceType: row.RiceType,
                    quintals: 0,
                    brands: []
                };
                agent.rice.push(rice);
            }

            // Brand
            rice.brands.push({
                brandId: row.BrandId,
                brandName: row.BrandName,
                bags: Number(row.Bags),
                kgs: Number(row.Kgs),
                quintals: Number(row.Quintals)
            });

            rice.quintals += Number(row.Quintals);
            agent.quintals += Number(row.Quintals);
        });

        // Round totals
        agents.forEach(agent => {
            agent.quintals = Number(agent.quintals.toFixed(2));

            agent.rice.forEach(rice => {
                rice.quintals = Number(rice.quintals.toFixed(2));
            });
        });

        res.json(agents);

    });

});

app.get("/api/items", (req, res) => {

    const sql = `
        SELECT  
           i.ItemId, r.RiceType Name, b.BrandName Brand, i.Ord, i.Grp, i.RiceId, i.BrandId, i.IsActive 
        FROM Item i
        JOIN Rice r ON i.RiceId = r.RiceId
        JOIN Brand b ON i.BrandId = b.BrandId
        Where i.IsActive = 1
        Order by r.TypeId, r.Odr
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                error: "Database error"
            });
        }

        res.json(rows);
    });
});


app.get("/api/items/:id", authenticateToken, (req, res) => {
  db.get("SELECT * FROM Item WHERE ItemId = ?", [req.params.id], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(row || {});
  });
});

app.post("/api/items", (req, res) => {
  const { Name, Brand } = req.body;
  db.run("INSERT INTO Item (Name, Brand) VALUES (?,?)", [Name, Brand || null], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ ItemId: this.lastID, Name, Brand });
  });
});

app.put("/api/items/:id", authenticateToken, (req, res) => {
  const { Name, Brand } = req.body;
  db.run(
    "UPDATE Item SET Name=?, Brand=? WHERE ItemId=?",
    [Name, Brand || null, req.params.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete("/api/items/:id", authenticateToken, (req, res) => {
  db.run("DELETE FROM Item WHERE ItemId=?", [req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

/* ---------- API: SHOPS (JOIN with Agent) ---------- */
/* LIST with AgentName */
app.get("/api/shops", authenticateToken, (req, res) => {
  const sql = `
    SELECT s.ShopId, s.ShopName, s.Place, s.Address, s.PhoneNumber, s.GST,
           s.AgentId, a.AgentName, COUNT(o.OrderId) AS PendingOrders
    FROM Shop s
    LEFT JOIN Agent a ON a.AgentId = s.AgentId
    LEFT JOIN Orders o ON o.ShopId = s.ShopId AND o.DeliveryDate IS NULL
    GROUP BY s.ShopId
    ORDER BY s.ShopName
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

/* SINGLE shop (no join needed for edit modal) */
app.get("/api/shops/:id", authenticateToken, (req, res) => {
  db.get("SELECT * FROM Shop WHERE ShopId = ?", [req.params.id], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(row || {});
  });
});

app.post("/api/shops", authenticateToken, (req, res) => {
  const { ShopName, Place, Address, PhoneNumber, GST, AgentId } = req.body;

  const sql = `
    INSERT INTO Shop (ShopName, Place, Address, PhoneNumber, GST, AgentId)
    VALUES (?,?,?,?,?,?)
  `;
  db.run(sql, [ShopName, Place || null, Address || null, PhoneNumber || null, GST || null, AgentId || null],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ ShopId: this.lastID });
    }
  );
});

app.put("/api/shops/:id", authenticateToken, (req, res) => {
  const { ShopName, Place, Address, PhoneNumber, GST, AgentId } = req.body;
  const sql = `
    UPDATE Shop SET ShopName=?, Place=?, Address=?, PhoneNumber=?, GST=?, AgentId=?
    WHERE ShopId=?
  `;
  db.run(
    sql,
    [ShopName, Place || null, Address || null, PhoneNumber || null, GST || null, AgentId || null, req.params.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete("/api/shops/:id", authenticateToken, (req, res) => {
  db.run("DELETE FROM Shop WHERE ShopId=?", [req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Get Orders
app.get("/api/orders/:agentId", authenticateToken, (req, res) => {
  const isAllAgents = req.params.agentId === "all";
  const sql = `
    SELECT 
      o.OrderId, 
      o.Date, 
      a.AgentName, 
      sh.ShopName,
      sh.Place,
      sh.Address,
      sh.GST,
      sh.PhoneNumber,
      COUNT(oi.ItemId) AS Items,
      r.RiceType as ItemName,
      b.BrandName as Brand,
      oi.Bags,
      oi.Kgs,
      ROUND(SUM(oi.Bags), 2) as TotalBags,
      ROUND(oi.Bags * oi.Kgs / 100,2) as Quintals,
      oi.Rate,
      oi.Condition,
      ROUND( SUM(oi.Bags * oi.Kgs / 100 ), 2) AS TotalQuintals,
      ROUND(SUM((oi.Bags * oi.Kgs / 100) * oi.Rate), 0) AS TotalAmount,
      GROUP_CONCAT(
          r.RiceType || ' ' || b.BrandName || ', ' ||
          printf('%g', oi.Bags) || ' bags - ' ||
          printf('%g', oi.Kgs) || ' kgs - ' ||
          printf('%.2f', oi.Bags * oi.Kgs / 100) || ' qtls - ₹' ||
          printf('%g', oi.Rate),
          '\n'
      ) AS Items
    FROM Orders o
    LEFT JOIN Shop sh ON o.ShopId = sh.ShopId
    LEFT JOIN Agent a ON sh.AgentId = a.AgentId
    LEFT JOIN OrderItem oi ON oi.OrderId = o.OrderId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON i.BrandId = b.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
      WHERE o.DeliveryDate IS NULL
      ${isAllAgents ? "" : "AND sh.AgentId = ?"}
    GROUP BY o.OrderId
    ORDER BY o.OrderId DESC;
  `;

    db.all(sql, isAllAgents ? [] : [req.params.agentId], (err, orders) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(orders);
  });
});

//add order with duplicate check
app.post("/api/orders", authenticateToken, (req, res) => {
  const { Date, AgentId, ShopId } = req.body;

  // First, check for existing order
  const checkSql = `
    SELECT * FROM Orders
    WHERE Date = ? AND ShopId = ?
  `;
  db.get(checkSql, [Date, ShopId], (err, existingOrder) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }

    if (existingOrder) {
      // Already exists
      return res.status(409).json({ error: "Shop already added for this date" }); // 409 Conflict
    }

    // If not exists, insert new order
    const insertSql = `
      INSERT INTO Orders (Date, ShopId)
      VALUES (?, ?)
    `;
    db.run(insertSql, [Date, ShopId], function (err) {
      if (err) {
        return res.status(500).json({ error: "Insert failed" });
      }

      return res.json({ success: true, orderId: this.lastID });
    });
  });
});

// Delete order by ID
app.delete("/api/orders/:id", authenticateToken, (req, res) => {
  const orderId = req.params.id;

  // Optional: if you have child tables (OrderItems), delete them first
  db.run("DELETE FROM OrderItem WHERE OrderId = ?", [orderId], function (err) {
    if (err) {
      console.error("Error deleting order items:", err);
      return res.status(500).json({ error: "Failed to delete order items" });
    }

    // Now delete the order itself
    db.run("DELETE FROM Orders WHERE OrderId = ?", [orderId], function (err2) {
      if (err2) {
        console.error("Error deleting order:", err2);
        return res.status(500).json({ error: "Failed to delete order" });
      }

      if (this.changes === 0) {
        // Nothing deleted → Order not found
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({ message: "Order deleted successfully" });
    });
  });
});

// Update DeliveryDate of an order by ID
app.put("/api/orders/:id/delivery", authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const { DeliveryDate } = req.body; // get DeliveryDate from request body

  if (!DeliveryDate) {
    return res.status(400).json({ error: "DeliveryDate is required" });
  }

  const sql = "UPDATE Orders SET DeliveryDate = ? WHERE OrderId = ?";
  db.run(sql, [DeliveryDate, orderId], function (err) {
    if (err) {
      console.error("Error updating DeliveryDate:", err);
      return res.status(500).json({ error: "Failed to update DeliveryDate" });
    }

    if (this.changes === 0) {
      // Nothing updated → Order not found
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "DeliveryDate updated successfully" });
  });
});

app.post("/api/items", (req, res) => {
  const { Name, Brand } = req.body;
  db.run("INSERT INTO Item (Name, Brand) VALUES (?,?)", [Name, Brand || null], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ ItemId: this.lastID, Name, Brand });
  });
});

app.get("/api/agents/:agentId/shops", authenticateToken, (req, res) => {
  const { agentId } = req.params;
  db.all(
    "SELECT * FROM Shop WHERE AgentId = ?",
    [agentId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/', (req, res) => {
  res.render('dashboard');  // Loads the main dashboard
});

// Return partials for right pane
app.get('/agents', (req, res) => {
  db.all("SELECT * FROM Agent", [], (err, rows) => {
    res.render('partials/agents', { agents: rows });
  });
});

// Load agents partial
app.get("/partials/agents", (req, res) => {
  res.render("partials/agents"); // ✅ correct path
});

// Load shops partial
app.get("/partials/shops", (req, res) => {
  res.render("partials/shops"); // ✅ correct path
});

// Load items partial
app.get("/partials/items", (req, res) => {
  res.render("partials/items"); // ✅ correct path
});

// Load orders partial
app.get("/partials/orders", (req, res) => {
  res.render("partials/orders"); // ✅ correct path
});


// Load orderItems partial
app.get("/partials/orderItems", (req, res) => {
  res.render("partials/orderItems"); // ✅ correct path
});


// Load orderItems partial
app.get("/partials/agentReport", (req, res) => {
  res.render("partials/agentReport"); // ✅ correct path
});

app.get('/shops', (req, res) => {
  const sql = `
    SELECT s.ShopId, s.ShopName, s.Place, s.Address, s.PhoneNumber, s.GST, 
           a.AgentName
    FROM Shop s
    LEFT JOIN Agent a ON s.AgentId = a.AgentId
  `;
  db.all(sql, [], (err, rows) => {
    db.all("SELECT * FROM Agent", [], (err2, agents) => {
      res.render('partials/shops', { shops: rows, agents });
    });
  });
});

app.get('/items', (req, res) => {
  db.all("SELECT * FROM Item", [], (err, rows) => {
    res.render('partials/items', { items: rows });
  });
});

app.get("/orders", (req, res) => {
  db.all("SELECT AgentId, AgentName FROM Agent", (err, rows) => {
    if (err) return res.status(500).send("Error loading agents");
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    res.render('partials/orders', { agents: rows, today: today });
});
});

// Show order items page
app.get("/orders/:orderId/items", (req, res) => {
  const { orderId } = req.params;
  db.all(`SELECT o.*, a.AgentName, s.ShopName, s.Place, s.Address, s.PhoneNumber, s.GST, a.AgentId
        FROM Orders o
        JOIN Shop s ON o.ShopId = s.ShopId
        JOIN Agent a ON s.AgentId = a.AgentId WHERE o.OrderId = ?  AND o.DeliveryDate IS NULL`, [orderId], (err, orders) => {
  db.all("SELECT i.ItemId, R.RiceType Name, B.BrandName Brand FROM Item i JOIN Rice r ON i.RiceId = r.RiceId JOIN Brand b on i.BrandId = b.BrandId Order by r.Odr, b.BrandId", (err, items) => {
    db.all("SELECT * FROM Status", (err2, statuses) => {
      db.all(`
        SELECT 
        oi.OrderItemId,
        oi.Bags,
        oi.Kgs,
        oi.Rate,
        oi.Condition,
        r.RiceType || ' - ' || b.BrandName AS ItemName, 
        oi.Notes,
        s.Status AS StatusName
      FROM OrderItem oi
      LEFT JOIN Item i ON oi.ItemId = i.ItemId
      LEFT JOIN Rice r ON r.RiceId = i.RiceId
      LEFT JOIN Brand b ON b.BrandId = i.BrandId
      LEFT JOIN Status s ON oi.StatusId = s.StatusId
        WHERE oi.OrderId = ?`, [orderId], (err3, orderItems) => {

          if (err || err2 || err3) {
            console.error("Error loading order items:", err || err2 || err3);
            return res.status(500).send("Error loading order items");
          }

          res.render("partials/orderItems", 
            { layout: false,   // <-- important if you use express-ejs-layouts
              orderId, items: items || [], 
              statuses: statuses || [], 
              order: orders ? orders[0] : null,
              orderItems: orderItems || [], });
        });
    });
  });
  });
});


// 🔹 Autocomplete route for items
app.get("/api/riceBrands", (req, res) => {
  const search = req.query.q ? `%${req.query.q}%` : "%";

  const query = `
    SELECT i.ItemId, r.RiceType AS Name, b.BrandName AS Brand
    FROM Item i
    JOIN Rice r ON i.RiceId = r.RiceId
    JOIN Brand b ON i.BrandId = b.BrandId
    WHERE r.RiceType LIKE ? OR b.BrandName LIKE ? AND i.IsActive = 1
    ORDER BY r.Odr, b.BrandId
  `;

  db.all(query, [search, search], (err, rows) => {
    if (err) {
      console.error("Error fetching autocomplete items:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // 🔸 Return in autocomplete format
    const formatted = rows.map(i => ({
      label: `${i.Name} ${i.Brand}`,
      value: `${i.Name} ${i.Brand}`,
      id: i.ItemId
    }));

    res.json(formatted);
  });
});


// check if item already exists in OrderItem for this Order
app.get("/orders/:orderId/items/check/:itemId", (req, res) => {
  const { orderId, itemId } = req.params;

  db.get(
    `SELECT * FROM OrderItem WHERE OrderId = ? AND ItemId = ?`,
    [orderId, itemId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) return res.json({ exists: true }); // already exists
      return res.json({ exists: false });
    }
  );
});


// Add item
app.post("/orders/:orderId/items/add", (req, res) => {
  const { orderId } = req.params;

  const { ItemId, Bags, Kgs, Rate, Condition, StatusId, Notes } = req.body;

  // Check if item already exists for this order
  db.get("SELECT * FROM OrderItem WHERE OrderId = ? AND ItemId = ?", [orderId, ItemId], (err, row) => {
    if (err) return res.json({ error: "Database error" });
    //if (row) return res.json({ error: "This item is already added for this order" });

    // Insert new item
    const sql = `INSERT INTO OrderItem (OrderId, ItemId, Bags, Kgs, Rate, Condition, StatusId, Notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [orderId, ItemId, Bags, Kgs, Rate, Condition, StatusId, Notes], function(err2){
      if (err2) return res.json({ error: "Failed to add item" });

      db.get(`SELECT 
                oi.OrderItemId, 
                r.RiceType  || ' - ' || b.BrandName AS ItemName, 
                oi.Bags, 
                oi.Kgs, 
                oi.Rate, 
                oi.Condition, 
                s.Status AS StatusName, 
                oi.Notes
              FROM OrderItem oi
              JOIN Item i ON oi.ItemId = i.ItemId
              JOIN Rice r ON i.RiceId = r.RiceId
              JOIN Brand b ON i.BrandId = b.BrandId
              JOIN Status s ON oi.StatusId = s.StatusId
              WHERE oi.OrderItemId = ?`, [this.lastID], (err3, row2) => {
        if (err3) return res.json({ error: "Error fetching item" });
        res.json(row2);
      });
    });
  });
});

// Update an order item
app.post("/orders/:orderId/items/edit/:id", (req, res) => {
  const { id } = req.params;
  const { ItemId, Bags, Kgs, Rate, Condition, StatusId, Notes } = req.body;

  const sql = `
    UPDATE OrderItem
    SET ItemId = ?, Bags = ?, Kgs = ?, Rate = ?, Condition = ?, StatusId = ?, Notes = ?
    WHERE OrderItemId = ?
  `;

  db.run(sql, [ItemId, Bags, Kgs, Rate, Condition, StatusId, Notes, id], function (err) {
    if (err) {
      return res.json({ success: false, error: err.message });
    }

    // Send back success + updated fields
    res.json({
      success: true,
      updated: {
        OrderItemId: id,
        ItemId,
        Bags,
        Kgs,
        Rate,
        Condition,
        StatusId,
        Notes
      }
    });
  });
});

app.post("/orders/:orderId/items/split/:id", (req, res) => {
  const { id } = req.params;
  const splitBags = parseInt(req.body.splitBags, 10);

  if (!splitBags || splitBags <= 0) {
    return res.json({ success: false, error: "Invalid split quantity" });
  }

  // 1️⃣ Get existing item WITH names
  db.get(
    `SELECT 
        oi.*,
        r.RiceType  || ' - ' || b.BrandName as ItemName,
        s.Status AS StatusName
     FROM OrderItem oi
     LEFT JOIN Item i   ON i.ItemId = oi.ItemId
     LEFT JOIN Status s ON s.StatusId = oi.StatusId
     LEFT JOIN Rice r ON r.RiceId = i.RiceId
     LEFT JOIN Brand b ON b.BrandId = i.BrandId
     WHERE oi.OrderItemId = ?`,
    [id],
    function (err, item) {
      if (err || !item) {
        return res.json({ success: false, error: "Item not found" });
      }

      if (splitBags >= item.Bags) {
        return res.json({ success: false, error: "Split exceeds total bags" });
      }

      const remaining = item.Bags - splitBags;

      // 2️⃣ Update existing row
      db.run(
        "UPDATE OrderItem SET Bags = ? WHERE OrderItemId = ?",
        [remaining, id],
        function (err) {
          if (err || this.changes === 0) {
            return res.json({ success: false, error: "Update failed" });
          }

          // 3️⃣ Insert new row
          db.run(
            `INSERT INTO OrderItem
             (OrderId, ItemId, Bags, Kgs, Rate, Condition, Notes, StatusId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.OrderId,
              item.ItemId,
              splitBags,
              item.Kgs,
              item.Rate,
              item.Condition,
              item.Notes,
              item.StatusId
            ],
            function (err) {
              if (err) {
                return res.json({ success: false, error: "Insert failed" });
              }

              // ✅ Final response (NOW has names)
              res.json({
                success: true,
                updated: {
                  OrderItemId: id,
                  Bags: remaining
                },
                newItem: {
                  OrderItemId: this.lastID,
                  ItemName: item.ItemName,
                  Bags: splitBags,
                  Kgs: item.Kgs,
                  Rate: item.Rate,
                  Condition: item.Condition,
                  Notes: item.Notes,
                  StatusName: item.StatusName
                }
              });
            }
          );
        }
      );
    }
  );
});


// Delete item
app.post("/orders/:orderId/items/delete/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM OrderItem WHERE OrderItemId = ?", [id], function(err){
    if (err) return res.json({ success: false });
    if (this.changes === 0) return res.json({ success: false }); // not found
    res.json({ success: true });
  });
});

function createCrudRoutes(table, idField) {
  // Get all
  app.get(`/api/${table}`, (req, res) => {
    db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    });
  });

  // Get by id
  app.get(`/api/${table}/:id`, (req, res) => {
    db.get(
      `SELECT * FROM ${table} WHERE ${idField} = ?`,
      [req.params.id],
      (err, row) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(row);
      }
    );
  });

  // Insert
  app.post(`/api/${table}`, (req, res) => {
    const keys = Object.keys(req.body);
    const values = Object.values(req.body);
    const placeholders = keys.map(() => "?").join(",");
    const sql = `INSERT INTO ${table} (${keys.join(",")}) VALUES (${placeholders})`;
    db.run(sql, values, function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    });
  });

  // Update
  app.put(`/api/${table}/:id`, (req, res) => {
    const updates = Object.keys(req.body)
      .map((k) => `${k} = ?`)
      .join(",");
    const values = [...Object.values(req.body), req.params.id];
    const sql = `UPDATE ${table} SET ${updates} WHERE ${idField} = ?`;
    db.run(sql, values, function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ changes: this.changes });
    });
  });

  // Delete
  app.delete(`/api/${table}/:id`, (req, res) => {
    db.run(
      `DELETE FROM ${table} WHERE ${idField} = ?`,
      [req.params.id],
      function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ deleted: this.changes });
      }
    );
  });
}

// Special Shop route with Agent join
app.get("/api/Shop", (req, res) => {
  const sql = `
    SELECT Shop.ShopId, Shop.ShopName, Shop.Place, Shop.Address, Shop.PhoneNumber,
           Shop.GST, Shop.AgentId, Agent.AgentName
    FROM Shop
    LEFT JOIN Agent ON Shop.AgentId = Agent.AgentId
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});


// Add Order Item
app.post("/orders/:id/items/add", (req, res) => {
  const orderId = req.params.id;
  const { ItemId, Bags, Kgs, Rate, Condition, StatusId } = req.body;

  db.run(
    `INSERT INTO OrderItem (OrderId, ItemId, Bags, Kgs, Rate, Condition, StatusId)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [orderId, ItemId, Bags, Kgs, Rate, Condition, StatusId],
    function (err) {
      if (err) return res.json({ error: err.message });

      db.get(
        `SELECT 
           oi.OrderItemId AS OrderItemId,
           r.RiceType  || ' - ' || b.BrandName AS ItemName,   -- Make sure item has readable text
           oi.Bags AS Bags,
           oi.Kgs AS Kgs,
           oi.Rate AS Rate,
           oi.Condition AS Condition,
           s.Status AS StatusName
         FROM OrderItem oi
         JOIN Item i ON oi.ItemId = i.ItemId
         JOIN Rice r ON i.RiceId = r.RiceId
         JOIN Brand b ON i.BrandId = b.BrandId
         JOIN Status s ON oi.StatusId = s.StatusId
         WHERE oi.OrderItemId = ?`,
        [this.lastID],
        (err, row) => {
          if (err) return res.json({ error: err.message });
          res.json(row); // This JSON will be used by frontend
        }
      );
    }
  );
});

// Delete Order Item
app.post("/orders/:orderId/items/delete/:id", (req, res) => {
  const id = req.params.id;

  db.run(`DELETE FROM OrderItem WHERE OrderItemId = ?`, [id], function (err) {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

app.post("/orders/:orderId/items/update/:id", (req, res) => {
  const id = req.params.id;
  const { Bags, Kgs, Rate, Condition, Notes } = req.body;

  db.run(
    `
    UPDATE OrderItem
    SET Bags = ?, 
        Kgs = ?, 
        Rate = ?, 
        \`Condition\` = ?,
        Notes = ?
    WHERE OrderItemId = ?
    `,
    [Bags, Kgs, Rate, Condition, Notes,id],
    
    function (err) {
      if (err) {
        return res.json({ success: false, error: err.message });
      }

      // Optional safety check
      if (this.changes === 0) {
        return res.json({ success: false, error: "Item not found" });
      }

      res.json({ success: true });
    }
  );
});

// Bulk update status
app.post("/orders/:orderId/items/updateStatus", (req, res) => {
  const { orderId } = req.params;
  const { itemIds, statusId } = req.body;

  if (!itemIds || !Array.isArray(itemIds) || !statusId) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const placeholders = itemIds.map(() => "?").join(",");
  const query = `UPDATE OrderItem SET StatusId = ? WHERE OrderItemId IN (${placeholders}) AND OrderId = ?`;

  db.run(query, [statusId, ...itemIds, orderId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, updated: this.changes });
  });
});

// Load Agent Report page (with dropdown)
app.get("/reports/agent", (req, res) => {
  db.all("SELECT AgentId, AgentName FROM Agent", (err, agents) => {
    if (err) {
      console.error("Error fetching agents:", err);
      return res.status(500).send("DB error fetching agents");
    }
    res.render("partials/agentReport", {
      layout: false,
      agents: agents || [],
      reportData: [],
      selectedAgent: null
    });
  });
});

// Fetch report data for a selected agent
app.get("/reports/agent/:agentId", (req, res) => {
  const { agentId } = req.params;
  const isAll = agentId === "all";

  const sqlDetails = `
    SELECT
      a.AgentId,
      a.AgentName,
      o.OrderId,
      o.Date,
      s.ShopId,
      s.ShopName,
      s.Place,
      s.PhoneNumber,
      r.RiceType AS ItemName,
      b.BrandName AS Brand,
      oi.Bags,
      oi.Kgs,
      ROUND(oi.Bags * oi.Kgs / 100.0, 2) AS Quintals,
      oi.Rate,
      ROUND((oi.Bags * oi.Kgs / 100.0) * oi.Rate, 2) AS Amount,
      oi.Condition,
      st.Status
    FROM Orders o
    LEFT JOIN Shop s ON o.ShopId = s.ShopId
    LEFT JOIN Agent a ON s.AgentId = a.AgentId
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE st.StatusId IN (1,2) AND o.DeliveryDate IS NULL
    ${!isAll ? "AND s.AgentId = ?" : ""}
    ORDER BY a.AgentName, o.Date, o.OrderId
  `;

  const sqlSummaryRice = `
    SELECT 
      a.AgentName,
      r.RiceType,      
      ROUND(SUM(oi.Bags * oi.Kgs) / 100.0, 2) AS Quintals
    FROM Orders o
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Shop s ON s.ShopId = o.ShopId
    LEFT JOIN Agent a ON a.AgentId = s.AgentId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE st.StatusId IN (1,2) AND o.DeliveryDate IS NULL
    ${!isAll ? "AND a.AgentId = ?" : ""}
    GROUP BY a.AgentId, r.RiceId
    ORDER BY a.AgentName, r.RiceId
  `;

  const sqlSummaryRiceBrand = `
    SELECT 
      a.AgentName,
      r.RiceType,
      b.BrandName,      
      i.Name AS ItemName,
      SUM(oi.Bags) Bags,
      oi.Kgs,
      ROUND(SUM(oi.Bags * oi.Kgs) / 100.0, 2) AS Quintals
    FROM Orders o
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Shop s ON s.ShopId = o.ShopId
    LEFT JOIN Agent a On a.AgentId = s.AgentId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON i.BrandId = b.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE st.StatusId IN (1,2) AND o.DeliveryDate IS NULL
    ${!isAll ? "AND a.AgentId = ?" : ""}
    GROUP BY a.AgentId, r.RiceId, b.BrandId, oi.Kgs
    ORDER BY a.AgentName, r.RiceId, b.BrandId
  `;

  const params = !isAll ? [agentId] : [];

  db.all(sqlDetails, params, (err, details) => {
    if (err) return res.status(500).send("Error fetching report");

    db.all(sqlSummaryRice, params, (err2, summaryRice) => {
      if (err2) return res.status(500).send("Error fetching summary");

      db.all(sqlSummaryRiceBrand, params, (err3, summaryRiceBrand) => {
        if (err3) return res.status(500).send("Error fetching brand summary");

        db.all("SELECT AgentId, AgentName FROM Agent", (err4, agents) => {
          if (err4) return res.status(500).send("Error fetching agents");

          res.render("partials/agentReport", {
            layout: false,
            agents,
            reportData: details || [],
            summaryRice: summaryRice || [],
            summaryRiceBrand: summaryRiceBrand || [],
            selectedAgent: agentId,
            selectedAgentName: isAll ? "All Agents" : (agents.find(a => a.AgentId == agentId) || {}).AgentName
          });
        });
      });
    });
  });
});

function renderItemSummaryReport(req, res, agentId) {
  const selectedAgentId = agentId || "all";
  const isAll = selectedAgentId === "all";
  const params = !isAll ? [selectedAgentId] : [];
  const filter = !isAll ? "AND s.AgentId = ?" : "";

  const query1 = `
    SELECT 
      r.RiceId AS GroupName,
      r.RiceType AS ItemName,
      ROUND(SUM(oi.Bags * oi.Kgs) / 100.0, 2) AS Quintals
    FROM Orders o
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Shop s ON s.ShopId = o.ShopId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    WHERE st.StatusId IN (1,2) AND o.DeliveryDate IS NULL ${filter}
    GROUP BY i.RiceId
    ORDER BY r.Odr
  `;

  const query2 = `
    SELECT 
      r.RiceId AS ItemId,
      r.RiceType AS ItemName,
      b.BrandName AS Brand,
      oi.Kgs,
      r.Odr,
      SUM(oi.Bags) AS TotalBags,
      ROUND(SUM(oi.Bags * oi.Kgs / 100.0), 2) AS TotalQuintals,
      ROUND(SUM((oi.Bags * oi.Kgs / 100.0) * oi.Rate), 2) AS TotalAmount
    FROM Orders o
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Shop s ON s.ShopId = o.ShopId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE st.StatusId IN (1,2) AND o.DeliveryDate IS NULL ${filter}
    GROUP BY r.RiceId, b.BrandId, oi.Kgs
    ORDER BY r.Odr ASC, b.BrandName ASC, oi.Kgs ASC
  `;

  db.all("SELECT AgentId, AgentName FROM Agent ORDER BY AgentName", [], (err, agents) => {
    if (err) {
      console.error("Error fetching agents:", err);
      return res.status(500).send("Error fetching agents");
    }

    db.all(query1, params, (err1, summaryResults) => {
      if (err1) {
        console.error("Error running query1:", err1);
        return res.status(500).send("Error fetching summary data");
      }

      db.all(query2, params, (err2, detailResults) => {
        if (err2) {
          console.error("Error running query2:", err2);
          return res.status(500).send("Error fetching detailed data");
        }

        let agentName = "All Agents";
        if (!isAll) {
          const found = agents.find(a => a.AgentId == selectedAgentId);
          agentName = found ? found.AgentName : "Unknown Agent";
        }

        res.render("partials/itemsReport", {
          agents,
          selectedAgent: selectedAgentId,
          agentName,
          summary: summaryResults || [],
          details: detailResults || [],
          formatNumber: (num) => {
            if (num == null) return "";
            return new Intl.NumberFormat("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(num);
          }
        });
      });
    });
  });
}

app.get("/reports/agent-all/all", (req, res) => {
  renderItemSummaryReport(req, res, "all");
});

app.get("/reports/item-summary", (req, res) => {
  renderItemSummaryReport(req, res, "all");
});

app.get("/reports/item-summary/:agentId", (req, res) => {
  const { agentId } = req.params;
  renderItemSummaryReport(req, res, agentId);
});

// Initial load
app.get("/reports/rice-report", (req, res) => {
  db.all("SELECT RiceId, RiceType as Name FROM Rice", (err, items) => {
    if (err) {
      console.error("Error fetching items:", err);
      return res.status(500).send("DB error fetching items");
    }

    res.render("partials/ricereport", {
      items,
      selectedRice: "all",
      riceName: "All Rice",
      details: [],
      formatNumber: (num) => {
        if (num == null) return "";
        return new Intl.NumberFormat("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);
      }
    });
  });
});

// When rice is selected
app.get("/reports/rice-report/:riceId", (req, res) => {
  const { riceId } = req.params;

  let filter = "";
  let params = [];

  if (riceId !== "all") {
    filter = "AND r.riceId = ?";
    params.push(riceId);
  }

  const query = `
    SELECT 
      o.OrderId, 
      o.Date, 
      s.ShopName, 
      s.Place, 
      s.PhoneNumber,
      r.RiceType AS ItemName, 
      b.BrandName As Brand, 
      oi.Bags, 
      oi.Kgs,
      oi.Bags * oi.Kgs / 100 AS Quintals,
      oi.Rate, 
      (oi.Bags * oi.Kgs / 100) * oi.Rate AS Amount,
      oi.Condition, 
      oi.Notes,
      st.Status
    FROM Orders o
    LEFT JOIN Shop s ON o.ShopId = s.ShopId
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE st.StatusId IN (1,2) AND o.DeliveryDate IS NULL ${filter}
    ORDER BY o.Date, o.OrderId, s.ShopId
  `;

  db.all("SELECT RiceId, RiceType as Name FROM Rice", [], (err, items) => {
    if (err) {
      console.error("Error fetching items:", err);
      return res.status(500).send("Error fetching items");
    }

    db.all(query, params, (err2, detailResults) => {
      if (err2) {
        console.error("Error running rice query:", err2);
        return res.status(500).send("Error fetching rice report");
      }

      let riceName = "All Rice";
      if (riceId !== "all") {
        const found = items.find(r => r.RiceId == riceId);
        riceName = found ? `${found.Name}` : "Unknown Rice";
      }

      res.render("partials/ricereport", {
        items,
        selectedRice: riceId,
        riceName,
        details: detailResults,
        formatNumber: (num) => {
          if (num == null) return "";
          return new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(num);
        }
      });
    });
  });
});

// Initial load
app.get("/reports/daily-report", (req, res) => {
  const date = req.query.date || new Date().toISOString().split("T")[0];

  const sql = `SELECT 
      a.AgentId,
      a.AgentName,
      o.OrderId, 
      o.Date, 
      s.ShopName, 
      s.Place, 
      s.PhoneNumber,
      r.RiceType AS ItemName, 
      b.BrandName AS Brand, 
      oi.Bags, 
      oi.Kgs,
      oi.Bags * oi.Kgs / 100 AS Quintals,
      oi.Rate, 
      (oi.Bags * oi.Kgs / 100) * oi.Rate AS Amount,
      oi.Condition, 
      st.Status
    FROM Orders o
    LEFT JOIN Shop s ON o.ShopId = s.ShopId
    LEFT JOIN Agent a ON s.AgentId = a.AgentId
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE o.DeliveryDate IS NOT NULL AND o.DeliveryDate = ?
    ORDER BY a.AgentId, o.OrderId, s.ShopId`;

  db.all(sql, [date], (err, rows) => {
    if (err){ return res.status(500).send(err.message);
      console.log(err);
    }
         res.render("partials/dailyReport", {orders: rows, selectedDate: date});
    });
});

app.get("/reports/daily-report/:date", (req, res) => {
  const date = req.query.date;

  console.log("Fetching daily report for date:", date);

  const sql = `
    SELECT 
      a.AgentId,
      a.AgentName,
      o.OrderId, 
      o.Date, 
      s.ShopName, 
      s.Place, 
      s.PhoneNumber,
      r.RiceType AS ItemName, 
      b.BrandName AS Brand, 
      oi.Bags, 
      oi.Kgs,
      oi.Bags * oi.Kgs / 100 AS Quintals,
      oi.Rate, 
      (oi.Bags * oi.Kgs / 100) * oi.Rate AS Amount,
      oi.Condition, 
      st.Status
    FROM Orders o
    LEFT JOIN Shop s ON o.ShopId = s.ShopId
    LEFT JOIN Agent a ON s.AgentId = a.AgentId
    LEFT JOIN OrderItem oi ON o.OrderId = oi.OrderId
    LEFT JOIN Item i ON i.ItemId = oi.ItemId
    LEFT JOIN Rice r ON r.RiceId = i.RiceId
    LEFT JOIN Brand b ON b.BrandId = i.BrandId
    LEFT JOIN Status st ON st.StatusId = oi.StatusId
    WHERE o.DeliveryDate IS NOT NULL AND o.DeliveryDate = ?
    ORDER BY a.AgentId, o.OrderId, s.ShopId
  `;

  db.all(sql, [date], (err, rows) => {
    if (err) return res.status(500).send(err.message);
         res.render("partials/dailyReport", {orders: rows, selectedDate: date});
    });
});

app.post("/api/orders/delete-by-date", (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: "Date is required" });

  // Delete child OrderItems first
  const deleteItemsSql = `
    DELETE FROM OrderItem
    WHERE OrderId IN (SELECT OrderId FROM Orders WHERE DeliveryDate = ?)
  `;
  db.run(deleteItemsSql, [date], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete order items" });
    }

    // Delete parent Orders
    const deleteOrdersSql = `DELETE FROM Orders WHERE DeliveryDate = ?`;
    db.run(deleteOrdersSql, [date], function(err2) {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ error: "Failed to delete orders" });
      }

      res.json({ message: `Deleted ${this.changes} orders for ${date}` });
    });
  });
});

function formatNumber(num) {
  if (num == null) return "";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

createCrudRoutes("Orders", "OrderId");
createCrudRoutes("OrderItem", "OrderItemId");

// Start server
app.listen(PORT,  "0.0.0.0",  () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
