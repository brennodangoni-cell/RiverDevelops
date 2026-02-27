import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import db, { initDb } from './db';
import { authenticate, generateToken } from './auth';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Database
initDb();

// Login
app.post('/api/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    const token = generateToken({ id: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username } });
});

// Get all users (for assigning tasks)
app.get('/api/users', authenticate, (req: Request, res: Response) => {
    const users = db.prepare('SELECT id, username FROM users').all();
    res.json(users);
});

// Tasks CRUD
app.get('/api/tasks', authenticate, (req: Request, res: Response) => {
    const tasks = db.prepare(`
        SELECT t.*, u.username as assigned_to_username, creator.username as created_by_username
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN users creator ON t.created_by = creator.id
        ORDER BY t.created_at DESC
    `).all();
    res.json(tasks);
});

app.post('/api/tasks', authenticate, (req: Request, res: Response) => {
    const { title, description, urgency, status, assigned_to } = req.body;
    const created_by = (req as any).user.id;

    const insert = db.prepare(`
        INSERT INTO tasks (title, description, urgency, status, assigned_to, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
        title,
        description || '',
        urgency || 'MEDIUM',
        status || 'TODO',
        assigned_to || created_by,
        created_by
    );

    res.json({ id: result.lastInsertRowid, success: true });
});

app.put('/api/tasks/:id', authenticate, (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, urgency, status, assigned_to } = req.body;

    const update = db.prepare(`
        UPDATE tasks 
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            urgency = COALESCE(?, urgency),
            status = COALESCE(?, status),
            assigned_to = COALESCE(?, assigned_to),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);

    update.run(title, description, urgency, status, assigned_to, id);
    res.json({ success: true });
});

app.delete('/api/tasks/:id', authenticate, (req: Request, res: Response) => {
    const { id } = req.params;
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.json({ success: true });
});

// Transactions CRUD
app.get('/api/transactions', authenticate, (req: Request, res: Response) => {
    const transactions = db.prepare(`
        SELECT t.*, creator.username as created_by_username
        FROM transactions t
        LEFT JOIN users creator ON t.created_by = creator.id
        ORDER BY t.date DESC, t.created_at DESC
    `).all();
    res.json(transactions);
});

app.post('/api/transactions', authenticate, (req: Request, res: Response) => {
    const { type, amount, description, date, client_name } = req.body;
    const created_by = (req as any).user.id;

    const insert = db.prepare(`
        INSERT INTO transactions (type, amount, description, date, created_by, client_name)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(type, amount, description, date, created_by, client_name || null);
    res.json({ id: result.lastInsertRowid, success: true });
});

app.put('/api/transactions/:id', authenticate, (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, amount, description, date, client_name } = req.body;

    const update = db.prepare(`
        UPDATE transactions 
        SET type = COALESCE(?, type),
            amount = COALESCE(?, amount),
            description = COALESCE(?, description),
            date = COALESCE(?, date),
            client_name = ?
        WHERE id = ?
    `);

    update.run(type, amount, description, date, client_name || null, id);
    res.json({ success: true });
});

app.delete('/api/transactions/:id', authenticate, (req: Request, res: Response) => {
    const { id } = req.params;
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`RiverTasks API running on port ${PORT}`);
});
