-- DROP TABLE IF EXISTS OrderItem; 
-- DROP TABLE IF EXISTS Orders;
-- DROP TABLE IF EXISTS Shop;
-- DROP TABLE IF EXISTS Item;
-- DROP TABLE IF EXISTS Status;    
-- DROP TABLE IF EXISTS Agent;

--INSERT INTO Status (Status) VALUES ('Ordered'), ('Pending'), ('Completed'), ('Cancelled');

-- Agent table
CREATE TABLE IF NOT EXISTS Agent (
    AgentId INTEGER PRIMARY KEY AUTOINCREMENT,
    AgentName TEXT NOT NULL
);

-- Status table
CREATE TABLE IF NOT EXISTS Status (
    StatusId INTEGER PRIMARY KEY AUTOINCREMENT,
    Status TEXT NOT NULL
);

-- Item table
CREATE TABLE IF NOT EXISTS Item (
    ItemId INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Brand TEXT,
    Ord INTEGER DEFAULT 0,
    Grp INTEGER DEFAULT 0
);

-- Shop table
CREATE TABLE IF NOT EXISTS Shop (
    ShopId INTEGER PRIMARY KEY AUTOINCREMENT,
    ShopName TEXT NOT NULL,
    Place TEXT,
    Address TEXT,
    PhoneNumber TEXT,
    GST TEXT,
    AgentId INTEGER,
    FOREIGN KEY (AgentId) REFERENCES Agent (AgentId)
);

-- Order table
CREATE TABLE IF NOT EXISTS Orders (
    OrderId INTEGER PRIMARY KEY AUTOINCREMENT,
    ShopId INTEGER,
    Date TEXT,
    DeliveryDate TEXT NULL,
    FOREIGN KEY (ShopId) REFERENCES Shop (ShopId)
);

-- OrderItem table
CREATE TABLE IF NOT EXISTS OrderItem (
    OrderItemId INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderId INTEGER,
    ItemId INTEGER,
    Bags INTEGER,
    Kgs REAL,
    Rate REAL,
    Condition TEXT,
    Notes TEXT,
    StatusId INTEGER,
    FOREIGN KEY (OrderId) REFERENCES Orders (OrderId),
    FOREIGN KEY (ItemId) REFERENCES Item (ItemId),
    FOREIGN KEY (StatusId) REFERENCES Status (StatusId)
);

CREATE TABLE IF NOT EXISTS Rice (
    RiceId INTEGER PRIMARY KEY AUTOINCREMENT,
    RiceType TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Brand (
    BrandId INTEGER PRIMARY KEY AUTOINCREMENT,
    BrandName TEXT NOT NULL
);

-- Insert into Rice Values (1, 'HMT');
-- Insert into Rice Values (2, 'RNR');
-- Insert into Rice Values (3,  'BPT');
-- Insert into Rice Values (4,  'HMT Raw');
-- Insert into Rice Values (5, 'Swarna');
-- Insert into Rice Values (6, 'PL');
-- Insert into Rice Values (7, 'RJL');

-- Insert into Brand Values (1, 'Tirumala');
-- Insert into Brand Values (2, 'Butterfly');
-- Insert into Brand Values (3, 'Other');