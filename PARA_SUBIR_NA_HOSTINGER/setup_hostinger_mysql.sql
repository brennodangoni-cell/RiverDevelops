-- Arquivo de Configuração SQL para Hostinger (MySQL)
-- Nome do Banco: u689348922_river

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    username VARCHAR(255) UNIQUE, 
    password TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    title TEXT, 
    description TEXT,
    urgency VARCHAR(50),
    status VARCHAR(50), 
    assigned_to INTEGER, 
    created_by INTEGER, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    type VARCHAR(50), 
    amount FLOAT, 
    description TEXT, 
    client_name VARCHAR(255),
    date TIMESTAMP NULL, 
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    username VARCHAR(255) UNIQUE, 
    password TEXT, 
    password_raw TEXT, 
    niche TEXT, 
    avatar_url TEXT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS demands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(255),
    total_videos INT,
    assigned_videos INT DEFAULT 0,
    duration_seconds INT,
    has_material TINYINT(1),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS demand_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    demand_id INT,
    media_type VARCHAR(50),
    media_url TEXT,
    content TEXT,
    title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT,
    title VARCHAR(255),
    category VARCHAR(100),
    product VARCHAR(100),
    week_date VARCHAR(50),
    media_url TEXT,
    media_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS searches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query TEXT,
    count INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    whatsapp VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    phone VARCHAR(50),
    instagram VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(50),
    address TEXT,
    website TEXT,
    source TEXT,
    category VARCHAR(255),
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sent_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT,
    status VARCHAR(50),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir usuário padrão (admin / admin123)
-- A senha 'admin123' hasheada em bcrypt: $2a$10$3nE2X2.f1F1A4G5H6I7J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z
-- Mas o script initDb do Node fará isso automaticamente.
