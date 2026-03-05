import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import db, { initDb } from './db';
import { authenticate, generateToken } from './auth';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Init Supabase Client
const supabaseUrl = 'https://tctzbsjmuariwylrfbuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdHpic2ptdWFyaXd5bHJmYnV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY3NjQ0MywiZXhwIjoyMDg4MjUyNDQzfQ.Xnm8Yu-N8PLUuvimDGpr9IdodeAW_qL9ZJszKTJVcFk';
const supabase = createClient(supabaseUrl, supabaseKey);

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB limit

async function initSupabaseStorage() {
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        if (!buckets?.find(b => b.name === 'rivertasks')) {
            await supabase.storage.createBucket('rivertasks', { public: true });
            console.log("Supabase storage bucket 'rivertasks' criado.");
        }
    } catch (err) {
        console.error("Erro ao configurar Supabase Storage:", err);
    }
}

// Initialize Database & Storage
(async () => {
    await initDb();
    await initSupabaseStorage();
})();

// Generic Admin Login
app.post('/api/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const userRes = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = userRes.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = generateToken({ id: user.id, username: user.username });
        res.json({ token, user: { id: user.id, username: user.username } });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Get all users (for assigning tasks)
app.get('/api/users', authenticate, async (req: Request, res: Response) => {
    try {
        const users = await db.query('SELECT id, username FROM users');
        res.json(users.rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Tasks CRUD
app.get('/api/tasks', authenticate, async (req: Request, res: Response) => {
    try {
        const tasks = await db.query(`
            SELECT t.*, u.username as assigned_to_username, creator.username as created_by_username
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN users creator ON t.created_by = creator.id
            ORDER BY t.created_at DESC
        `);
        res.json(tasks.rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/tasks', authenticate, async (req: Request, res: Response) => {
    const { title, description, urgency, status, assigned_to } = req.body;
    const created_by = (req as any).user.id;

    try {
        const result = await db.query(`
            INSERT INTO tasks (title, description, urgency, status, assigned_to, created_by)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        `, [
            title,
            description || '',
            urgency || 'MEDIUM',
            status || 'TODO',
            assigned_to || created_by,
            created_by
        ]);
        res.json({ id: result.rows[0].id, success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/tasks/:id', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, urgency, status, assigned_to } = req.body;

    try {
        await db.query(`
            UPDATE tasks 
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                urgency = COALESCE($3, urgency),
                status = COALESCE($4, status),
                assigned_to = COALESCE($5, assigned_to),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
        `, [title, description, urgency, status, assigned_to, id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/tasks/:id', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Demands CRUD
app.get('/api/demands', authenticate, async (req: Request, res: Response) => {
    try {
        const demands = await db.query(`
            SELECT d.*, creator.username as created_by_username
            FROM demands d
            LEFT JOIN users creator ON d.created_by = creator.id
            ORDER BY d.created_at DESC
        `);
        res.json(demands.rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/demands', authenticate, async (req: Request, res: Response) => {
    const { client_name, total_videos, duration_seconds, has_material, material_link, description } = req.body;
    const created_by = (req as any).user.id;

    try {
        const result = await db.query(`
            INSERT INTO demands (client_name, total_videos, duration_seconds, has_material, material_link, description, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `, [
            client_name,
            total_videos,
            duration_seconds || null,
            has_material ? 1 : 0,
            material_link || null,
            description || '',
            created_by
        ]);
        res.json({ id: result.rows[0].id, success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/demands/:id', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM demands WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Endpoint to allocate tasks from a demand
app.post('/api/demands/:id/allocate', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { assigned_to, videos_count, urgency, notes } = req.body;
    const created_by = (req as any).user.id;

    try {
        const demandRes = await db.query('SELECT * FROM demands WHERE id = $1', [id]);
        const demand = demandRes.rows[0];
        if (!demand) return res.status(404).json({ error: 'Demand not found' });

        const title = `Demanda: ${demand.client_name} - ${videos_count} vídeo(s) de ${demand.duration_seconds || '?'}s`;
        let desc = `Ref Demanda #${id}.\n`;
        if (demand.has_material && demand.material_link) desc += `Material: ${demand.material_link}\n`;
        if (demand.description) desc += `Instruções: ${demand.description}\n`;
        if (notes) desc += `Notas (p/ Admin): ${notes}`;

        await db.query(`
            INSERT INTO tasks (title, description, urgency, status, assigned_to, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [title, desc.trim(), urgency || 'MEDIUM', 'TODO', assigned_to, created_by]);

        const newAssignedCount = (demand.assigned_videos || 0) + parseInt(videos_count, 10);
        const newStatus = newAssignedCount >= demand.total_videos ? 'completed' : 'partial';

        await db.query(`
            UPDATE demands
            SET assigned_videos = $1, status = $2
            WHERE id = $3
        `, [newAssignedCount, newStatus, id]);

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Transactions CRUD
app.get('/api/transactions', authenticate, async (req: Request, res: Response) => {
    try {
        const transactions = await db.query(`
            SELECT t.*, creator.username as created_by_username
            FROM transactions t
            LEFT JOIN users creator ON t.created_by = creator.id
            ORDER BY t.date DESC, t.created_at DESC
        `);
        res.json(transactions.rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/transactions', authenticate, async (req: Request, res: Response) => {
    const { type, amount, description, date, client_name } = req.body;
    const created_by = (req as any).user.id;

    try {
        const result = await db.query(`
            INSERT INTO transactions (type, amount, description, date, created_by, client_name)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        `, [type, amount, description, date, created_by, client_name || null]);
        res.json({ id: result.rows[0].id, success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/transactions/:id', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, amount, description, date, client_name } = req.body;

    try {
        await db.query(`
            UPDATE transactions 
            SET type = COALESCE($1, type),
                amount = COALESCE($2, amount),
                description = COALESCE($3, description),
                date = COALESCE($4, date),
                client_name = $5
            WHERE id = $6
        `, [type, amount, description, date, client_name || null, id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/transactions/:id', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM transactions WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// CLIENT PORTAL ROUTES
// ==========================================

// Client Login Endpoint
app.post('/api/clients/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const clientRes = await db.query('SELECT * FROM clients WHERE username = $1', [username]);
        const client = clientRes.rows[0];

        if (!client) return res.status(401).json({ error: 'Client not found' });
        if (!bcrypt.compareSync(password, client.password)) return res.status(401).json({ error: 'Invalid password' });

        const token = generateToken({ id: client.id, username: client.username, role: 'client' });
        res.json({ token, client: { id: client.id, username: client.username, avatar_url: client.avatar_url } });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Client: Get their own content
app.get('/api/client/content', authenticate, async (req: Request, res: Response) => {
    const clientId = (req as any).user.id;
    try {
        const content = await db.query('SELECT * FROM client_content WHERE client_id = $1 ORDER BY created_at DESC', [clientId]);
        res.json(content.rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Get all clients
app.get('/api/admin/clients', authenticate, async (req: Request, res: Response) => {
    try {
        const clients = await db.query('SELECT id, username, avatar_url, created_at FROM clients ORDER BY created_at DESC');
        res.json(clients.rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Get specific client content
app.get('/api/admin/clients/:clientId/content', authenticate, async (req: Request, res: Response) => {
    const { clientId } = req.params;
    try {
        const content = await db.query('SELECT * FROM client_content WHERE client_id = $1 ORDER BY created_at DESC', [clientId]);
        res.json(content.rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Helper for Supabase Upload
async function uploadToSupabase(file: Express.Multer.File): Promise<string> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
    const path = `uploads/${uniqueSuffix}-${safeName}`;

    const { data, error } = await supabase.storage.from('rivertasks').upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false
    });

    if (error) throw error;

    const { data: publicData } = supabase.storage.from('rivertasks').getPublicUrl(path);
    return publicData.publicUrl;
}

// Admin: Create client
app.post('/api/admin/clients', authenticate, upload.single('avatarFile'), async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        let finalAvatarUrl = null;
        if (req.file) {
            finalAvatarUrl = await uploadToSupabase(req.file);
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = await db.query('INSERT INTO clients (username, password, avatar_url) VALUES ($1, $2, $3) RETURNING id', [username, hash, finalAvatarUrl]);
        res.json({ id: result.rows[0].id, success: true, avatar_url: finalAvatarUrl });
    } catch (e: any) {
        if (e.message.includes('unique') || e.code === '23505') return res.status(400).json({ error: 'Username already exists' });
        res.status(500).json({ error: e.message });
    }
});

// Admin: Edit client
app.put('/api/admin/clients/:id', authenticate, upload.single('avatarFile'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, password } = req.body;

    try {
        let updateQuery = 'UPDATE clients SET username = $1';
        let params: any[] = [username];
        let paramCounter = 2;

        if (password) {
            const hash = bcrypt.hashSync(password, 10);
            updateQuery += `, password = $${paramCounter}`;
            params.push(hash);
            paramCounter++;
        }

        if (req.file) {
            const finalAvatarUrl = await uploadToSupabase(req.file);
            updateQuery += `, avatar_url = $${paramCounter}`;
            params.push(finalAvatarUrl);
            paramCounter++;
        }

        updateQuery += ` WHERE id = $${paramCounter}`;
        params.push(id);

        await db.query(updateQuery, params);
        res.json({ success: true });
    } catch (e: any) {
        if (e.message.includes('unique') || e.code === '23505') return res.status(400).json({ error: 'Username already exists' });
        res.status(500).json({ error: e.message });
    }
});

// Admin: Delete client
app.delete('/api/admin/clients/:id', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM client_content WHERE client_id = $1', [id]); // cascade manual
        await db.query('DELETE FROM clients WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Upload / Create Content for Client
app.post('/api/admin/clients/:clientId/content', authenticate, upload.single('mediaFile'), async (req: Request, res: Response) => {
    const { clientId } = req.params;
    const { title, category, product, week_date, media_url, media_type } = req.body;

    try {
        let finalMediaUrl = media_url;
        let finalMediaType = media_type;

        if (req.file) {
            finalMediaUrl = await uploadToSupabase(req.file);
            finalMediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
        }

        if (!finalMediaUrl) return res.status(400).json({ error: 'Media URL or File is required' });

        const result = await db.query(`
            INSERT INTO client_content (client_id, title, category, product, week_date, media_url, media_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `, [clientId, title || '', category || '', product || '', week_date || '', finalMediaUrl, finalMediaType || 'image']);

        res.json({ id: result.rows[0].id, success: true, url: finalMediaUrl });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Delete Client Content
app.delete('/api/admin/content/:contentId', authenticate, async (req: Request, res: Response) => {
    const { contentId } = req.params;
    try {
        await db.query('DELETE FROM client_content WHERE id = $1', [contentId]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`RiverTasks API running on port ${PORT}`);
});
