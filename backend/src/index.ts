import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import db, { initDb } from './db';
import { authenticate, generateToken } from './auth';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// Setup static serving for uploads
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Initialize Database
initDb();

// Generic Admin Login
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

// ==========================================
// CLIENT PORTAL ROUTES
// ==========================================

// Client Login Endpoint
app.post('/api/clients/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const client = db.prepare('SELECT * FROM clients WHERE username = ?').get(username) as any;

    if (!client) return res.status(401).json({ error: 'Client not found' });
    if (!bcrypt.compareSync(password, client.password)) return res.status(401).json({ error: 'Invalid password' });

    const token = generateToken({ id: client.id, username: client.username, role: 'client' });
    res.json({ token, client: { id: client.id, username: client.username } });
});

// Client: Get their own content
app.get('/api/client/content', authenticate, (req: Request, res: Response) => {
    // We assume authenticate middleware just decodes and attaches user/client ID.
    const clientId = (req as any).user.id;
    const content = db.prepare('SELECT * FROM client_content WHERE client_id = ? ORDER BY created_at DESC').all(clientId);
    res.json(content);
});

// Admin: Get all clients
app.get('/api/admin/clients', authenticate, (req: Request, res: Response) => {
    const clients = db.prepare('SELECT id, username, created_at FROM clients ORDER BY created_at DESC').all();
    res.json(clients);
});

// Admin: Get specific client content
app.get('/api/admin/clients/:clientId/content', authenticate, (req: Request, res: Response) => {
    const { clientId } = req.params;
    const content = db.prepare('SELECT * FROM client_content WHERE client_id = ? ORDER BY created_at DESC').all(clientId);
    res.json(content);
});

// Admin: Create client
app.post('/api/admin/clients', authenticate, (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const hash = bcrypt.hashSync(password, 10);
    try {
        const insert = db.prepare('INSERT INTO clients (username, password) VALUES (?, ?)');
        const result = insert.run(username, hash);
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e: any) {
        if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already exists' });
        res.status(500).json({ error: e.message });
    }
});

// Admin: Delete client
app.delete('/api/admin/clients/:id', authenticate, (req: Request, res: Response) => {
    const { id } = req.params;
    db.prepare('DELETE FROM client_content WHERE client_id = ?').run(id); // cascade manual
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    res.json({ success: true });
});

// Admin: Upload / Create Content for Client
app.post('/api/admin/clients/:clientId/content', authenticate, upload.single('mediaFile'), (req: Request, res: Response) => {
    const { clientId } = req.params;
    // Fields can be sent via multipart/form-data
    const { title, category, product, week_date, media_url, media_type } = req.body;

    let finalMediaUrl = media_url;
    let finalMediaType = media_type;

    if (req.file) {
        finalMediaUrl = `/uploads/${req.file.filename}`;
        finalMediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    }

    if (!finalMediaUrl) return res.status(400).json({ error: 'Media URL or File is required' });

    const insert = db.prepare(`
        INSERT INTO client_content (client_id, title, category, product, week_date, media_url, media_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        const result = insert.run(clientId, title || '', category || '', product || '', week_date || '', finalMediaUrl, finalMediaType || 'image');
        res.json({ id: result.lastInsertRowid, success: true, url: finalMediaUrl });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Delete Client Content
app.delete('/api/admin/content/:contentId', authenticate, (req: Request, res: Response) => {
    const { contentId } = req.params;
    db.prepare('DELETE FROM client_content WHERE id = ?').run(contentId);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`RiverTasks API running on port ${PORT}`);
});
