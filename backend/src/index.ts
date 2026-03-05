import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { authenticate, generateToken } from './auth';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { runMigrations } from './migrate';

dotenv.config();

const app = express();

// CORS: allow frontend domains (Vercel + custom domain)
const allowedOrigins = [
    'https://riverdevelops.com',
    'https://www.riverdevelops.com',
    /^https:\/\/.*\.vercel\.app$/
];
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true); // same-origin or tools like Postman
        const ok = allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin));
        cb(null, ok ? origin : false);
    }
}));
app.use(express.json());

// ==========================================
// SUPABASE JS CLIENT SETUP (HTTPS - NO TCP/IPv6 ISSUES)
// ==========================================
const supabaseUrl = 'https://tctzbsjmuariwylrfbuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdHpic2ptdWFyaXd5bHJmYnV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY3NjQ0MywiZXhwIjoyMDg4MjUyNDQzfQ.Xnm8Yu-N8PLUuvimDGpr9IdodeAW_qL9ZJszKTJVcFk';
const supabase = createClient(supabaseUrl, supabaseKey);

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ==========================================
// ROTAS DO MODO INFALÍVEL
// ==========================================

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) {
            console.log(`LOGIN: Usuário [${username}] não encontrado ou erro.`, error);
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        if (!bcrypt.compareSync(password, user.password)) {
            console.log(`LOGIN: Senha INCORRETA para [${username}].`);
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        console.log(`LOGIN: Usuário [${username}] logado com sucesso!`);
        const token = generateToken({ id: user.id, username: user.username });
        res.json({ token, user: { id: user.id, username: user.username } });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/users', authenticate, async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('users').select('id, username');
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/tasks', authenticate, async (req: Request, res: Response) => {
    try {
        const { data: tasks, error: tErr } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (tErr) throw tErr;

        const { data: users } = await supabase.from('users').select('id, username');
        const userMap: any = {};
        users?.forEach(u => userMap[u.id] = u.username);

        const result = tasks.map((t: any) => ({
            ...t,
            assigned_to_username: userMap[t.assigned_to] || null,
            created_by_username: userMap[t.created_by] || null
        }));

        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/tasks', authenticate, async (req: Request, res: Response) => {
    const { title, description, urgency, status, assigned_to } = req.body;
    const created_by = (req as any).user.id;
    try {
        const payload = {
            title,
            description: description || '',
            urgency: urgency || 'MEDIUM',
            status: status || 'TODO',
            assigned_to: assigned_to || created_by,
            created_by
        };
        const { data, error } = await supabase.from('tasks').insert([payload]).select('id').single();
        if (error) throw error;
        res.json({ id: data.id, success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/tasks/:id', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, urgency, status, assigned_to } = req.body;
    try {
        const payload: any = {};
        if (title !== undefined) payload.title = title;
        if (description !== undefined) payload.description = description;
        if (urgency !== undefined) payload.urgency = urgency;
        if (status !== undefined) payload.status = status;
        if (assigned_to !== undefined) payload.assigned_to = assigned_to;
        payload.updated_at = new Date().toISOString();

        const { error } = await supabase.from('tasks').update(payload).eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/tasks/:id', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/demands', authenticate, async (req: Request, res: Response) => {
    try {
        const { data: demands, error: dErr } = await supabase.from('demands').select('*').order('created_at', { ascending: false });
        if (dErr) throw dErr;

        const { data: users } = await supabase.from('users').select('id, username');
        const userMap: any = {};
        users?.forEach(u => userMap[u.id] = u.username);

        const result = demands.map((d: any) => ({
            ...d,
            created_by_username: userMap[d.created_by] || null
        }));

        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/demands', authenticate, async (req: Request, res: Response) => {
    const { client_name, total_videos, duration_seconds, has_material, material_link, description } = req.body;
    const created_by = (req as any).user.id;
    try {
        const payload = {
            client_name,
            total_videos,
            duration_seconds: duration_seconds || null,
            has_material: has_material ? 1 : 0,
            material_link: material_link || null,
            description: description || '',
            created_by
        };
        const { data, error } = await supabase.from('demands').insert([payload]).select('id').single();
        if (error) throw error;
        res.json({ id: data.id, success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/transactions', authenticate, async (req: Request, res: Response) => {
    try {
        const { data: transactions, error: tErr } = await supabase.from('transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
        if (tErr) throw tErr;

        const { data: users } = await supabase.from('users').select('id, username');
        const userMap: any = {};
        users?.forEach(u => userMap[u.id] = u.username);

        const result = transactions.map((t: any) => ({
            ...t,
            created_by_username: userMap[t.created_by] || null
        }));

        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/transactions', authenticate, async (req: Request, res: Response) => {
    const { type, amount, description, date, client_name } = req.body;
    const created_by = (req as any).user.id;
    try {
        const payload = {
            type,
            amount,
            description,
            date,
            created_by,
            client_name: client_name || null
        };
        const { data, error } = await supabase.from('transactions').insert([payload]).select('id').single();
        if (error) throw error;
        res.json({ id: data.id, success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/clients/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const { data: client, error } = await supabase.from('clients').select('*').eq('username', username).single();
        if (error || !client || !bcrypt.compareSync(password, client.password)) {
            return res.status(401).json({ error: 'Cliente não encontrado' });
        }
        const token = generateToken({ id: client.id, username: client.username, role: 'client' });
        res.json({ token, client: { id: client.id, username: client.username, avatar_url: client.avatar_url } });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

async function uploadToSupabase(file: Express.Multer.File): Promise<string> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
    const path = `uploads/${uniqueSuffix}-${safeName}`;
    const { data, error } = await supabase.storage.from('rivertasks').upload(path, file.buffer, { contentType: file.mimetype });
    if (error) throw error;
    const { data: publicData } = supabase.storage.from('rivertasks').getPublicUrl(path);
    return publicData.publicUrl;
}

app.post('/api/admin/clients', authenticate, upload.single('avatarFile'), async (req: Request, res: Response) => {
    const { username, password, niche } = req.body;
    try {
        let finalAvatarUrl = null;
        if (req.file) finalAvatarUrl = await uploadToSupabase(req.file);
        const hash = bcrypt.hashSync(password, 10);

        const payload = { username, password: hash, password_raw: password, niche: niche || 'Não definido', avatar_url: finalAvatarUrl };
        const { data, error } = await supabase.from('clients').insert([payload]).select('id').single();
        if (error) throw error;

        res.json({ id: data.id, success: true, avatar_url: finalAvatarUrl, niche: payload.niche });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/admin/clients/:id', authenticate, upload.single('avatarFile'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, password, niche } = req.body;
    try {
        const payload: any = {};
        if (username) payload.username = username;
        if (niche) payload.niche = niche;

        if (password && password.trim() !== '') {
            payload.password = bcrypt.hashSync(password, 10);
            payload.password_raw = password;
        }

        if (req.file) {
            payload.avatar_url = await uploadToSupabase(req.file);
        }

        const { data, error } = await supabase.from('clients').update(payload).eq('id', id).select('id, username, niche, avatar_url').single();
        if (error) throw error;

        res.json({ success: true, client: data });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/clients', authenticate, async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('clients').select('id, username, avatar_url, niche, password_raw, created_at').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

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

        const payload = {
            client_id: parseInt(clientId as string),
            title: title || '',
            category: category || '',
            product: product || '',
            week_date: week_date || '',
            media_url: finalMediaUrl,
            media_type: finalMediaType || 'image'
        };

        const { error } = await supabase.from('client_content').insert([payload]);
        if (error) throw error;

        res.json({ success: true, url: finalMediaUrl });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/clients/:clientId/content', authenticate, async (req: Request, res: Response) => {
    const { clientId } = req.params;
    try {
        const { data, error } = await supabase.from('client_content').select('*').eq('client_id', parseInt(clientId as string)).order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/content/:contentId', authenticate, async (req: Request, res: Response) => {
    const { contentId } = req.params;
    try {
        const { error } = await supabase.from('client_content').delete().eq('id', parseInt(contentId as string));
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/clients/:id', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await supabase.from('client_content').delete().eq('client_id', parseInt(id as string));
        const { error } = await supabase.from('clients').delete().eq('id', parseInt(id as string));
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 10000;

(async () => {
    await runMigrations();
    app.listen(PORT, () => {
        console.log(`RiverTasks API Supabase (HTTP-Mode) em execução na porta ${PORT}`);
    });
})();
