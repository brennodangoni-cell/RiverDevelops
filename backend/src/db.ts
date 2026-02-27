import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../rivertasks.db');
const db = new Database(dbPath);

export function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            urgency TEXT, 
            status TEXT, 
            assigned_to INTEGER,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(assigned_to) REFERENCES users(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            date DATETIME NOT NULL,
            created_by INTEGER,
            client_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(created_by) REFERENCES users(id)
        );
    `);

    // Migration for existing databases
    try {
        db.exec(`ALTER TABLE transactions ADD COLUMN client_name TEXT;`);
    } catch (e) {
        // column probably already exists
    }

    const users = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (users.count === 0) {
        // Seed initial users
        const hash = bcrypt.hashSync('admin123', 10);
        const insert = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');

        insert.run('Turbalada', hash);
        insert.run('Floripa', hash);
        insert.run('Brenno', hash);
    }
}

export default db;
