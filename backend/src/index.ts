import express, { Request, Response, NextFunction } from 'express';
import { Readable } from 'node:stream';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { authenticate, generateToken } from './auth';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { runMigrations } from './migrate';
import { analyzeProductPhotos, generateVeoVideo } from './services/ai_vertex';
import { initWhatsApp, getQrCode, getStatus, sendCampaignMessage } from './services/whatsapp';
import { scrapeGoogleMaps } from './services/scraper';


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
const upload = multer({ storage });

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
    const { client_name, total_videos, duration_seconds, has_material, description } = req.body;
    const created_by = (req as any).user.id;
    try {
        const payload = {
            client_name,
            total_videos,
            duration_seconds: duration_seconds || null,
            has_material: has_material ? 1 : 0,
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

app.get('/api/demands/:id/materials', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase.from('demand_materials').select('*').eq('demand_id', parseInt(id as string)).order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/demands/:id/materials', authenticate, upload.single('file'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { media_type, content, title } = req.body;
    try {
        let media_url: string | null = null;
        let finalType = media_type || 'text';

        if (req.file) {
            media_url = await uploadFile(req.file);
            finalType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
        }

        const payload = {
            demand_id: parseInt(id as string),
            media_type: finalType,
            media_url: media_url || null,
            content: content || null,
            title: title || null
        };

        const { data, error } = await supabase.from('demand_materials').insert([payload]).select('id, media_type, media_url, content, title, created_at').single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/demands/:id/materials/text', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { content, title } = req.body;
    try {
        const payload = {
            demand_id: parseInt(id as string),
            media_type: 'text',
            media_url: null,
            content: content || '',
            title: title || null
        };
        const { data, error } = await supabase.from('demand_materials').insert([payload]).select('id, media_type, content, title, created_at').single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/demands/:demandId/materials/:materialId', authenticate, async (req: Request, res: Response) => {
    const { materialId } = req.params;
    try {
        const { error } = await supabase.from('demand_materials').delete().eq('id', parseInt(materialId as string));
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/demands/:id', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await supabase.from('demand_materials').delete().eq('demand_id', parseInt(id as string));
        const { error } = await supabase.from('demands').delete().eq('id', parseInt(id as string));
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/demands/:id/allocate', authenticate, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { assigned_to, videos_count, urgency, notes } = req.body;
    const created_by = (req as any).user.id;

    try {
        const { data: demand, error: dErr } = await supabase.from('demands').select('*').eq('id', parseInt(id as string)).single();
        if (dErr || !demand) throw new Error('Demanda não encontrada');

        const count = parseInt(videos_count) || 0;
        const newAssignedVideos = (demand.assigned_videos || 0) + count;
        let newStatus = 'partial';
        if (newAssignedVideos >= demand.total_videos) newStatus = 'completed';

        const { error: uErr } = await supabase.from('demands').update({ assigned_videos: newAssignedVideos, status: newStatus }).eq('id', parseInt(id as string));
        if (uErr) throw uErr;

        const taskPayload = {
            title: `Vídeos [${count}] - ${demand.client_name}`,
            description: `Demanda: ${demand.description || ''}\n\nNotas: ${notes || ''}`,
            urgency: urgency || 'MEDIUM',
            status: 'TODO',
            assigned_to: assigned_to || created_by,
            created_by
        };
        const { error: tErr } = await supabase.from('tasks').insert([taskPayload]);
        if (tErr) throw tErr;

        res.json({ success: true });
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

app.get('/api/client/content', authenticate, async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user?.role !== 'client') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const { data, error } = await supabase.from('client_content').select('*').eq('client_id', user.id).order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/client/download/:contentId', authenticate, async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user?.role !== 'client') return res.status(403).json({ error: 'Acesso negado' });
    const { contentId } = req.params;
    try {
        const { data, error } = await supabase.from('client_content').select('media_url, media_type, title').eq('id', parseInt(contentId as string)).eq('client_id', user.id).single();
        if (error || !data?.media_url) return res.status(404).json({ error: 'Arquivo não encontrado' });
        const ext = data.media_type === 'video' ? 'mp4' : 'jpg';
        const filename = `${(data.title || 'arquivo').replace(/\s+/g, '-')}.${ext}`;
        const fetchRes = await fetch(data.media_url);
        if (!fetchRes.ok) return res.status(502).json({ error: 'Erro ao obter arquivo' });
        const contentType = fetchRes.headers.get('content-type') || (data.media_type === 'video' ? 'video/mp4' : 'image/jpeg');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        if (fetchRes.body) Readable.fromWeb(fetchRes.body as any).pipe(res);
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

const SUPABASE_FILE_LIMIT = 50 * 1024 * 1024; // 50MB free tier

function getR2Client(): S3Client | null {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKey = process.env.R2_ACCESS_KEY_ID;
    const secretKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKey || !secretKey) return null;
    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: true
    });
}

async function uploadToR2(file: Express.Multer.File): Promise<string> {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!client || !bucket || !publicUrl) throw new Error('R2 não configurado. Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME e R2_PUBLIC_URL.');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
    const key = `uploads/${uniqueSuffix}-${safeName}`;
    await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
    }));
    const base = publicUrl.replace(/\/$/, '');
    return `${base}/${key}`;
}

async function uploadFile(file: Express.Multer.File): Promise<string> {
    const useR2First = file.size > SUPABASE_FILE_LIMIT && getR2Client();
    if (useR2First) {
        return uploadToR2(file);
    }
    try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
        const path = `uploads/${uniqueSuffix}-${safeName}`;
        const { error } = await supabase.storage.from('rivertasks').upload(path, file.buffer, { contentType: file.mimetype });
        if (error) throw error;
        const { data: publicData } = supabase.storage.from('rivertasks').getPublicUrl(path);
        return publicData.publicUrl;
    } catch (e: any) {
        const msg = (e.message || '').toLowerCase();
        if ((msg.includes('size') || msg.includes('limit') || msg.includes('413') || file.size > SUPABASE_FILE_LIMIT) && getR2Client()) {
            return uploadToR2(file);
        }
        throw e;
    }
}

app.post('/api/admin/clients', authenticate, upload.single('avatarFile'), async (req: Request, res: Response) => {
    const { username, password, niche } = req.body;
    try {
        let finalAvatarUrl = null;
        if (req.file) finalAvatarUrl = await uploadFile(req.file);
        const hash = bcrypt.hashSync(password, 10);

        const payload = { username, password: hash, niche: niche || 'Não definido', avatar_url: finalAvatarUrl };
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
        }

        if (req.file) {
            payload.avatar_url = await uploadFile(req.file);
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
        const { data, error } = await supabase.from('clients').select('id, username, avatar_url, niche, created_at').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/clients/:clientId/content', authenticate, upload.array('mediaFiles', 50), async (req: Request, res: Response) => {
    const { clientId } = req.params;
    const { title, week_date } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];
    try {
        if (files.length === 0) {
            return res.status(400).json({ error: 'Selecione pelo menos um arquivo (vídeo ou imagem).' });
        }

        const dateStr = week_date || new Date().toISOString().slice(0, 10);
        const inserted: string[] = [];

        for (const file of files) {
            const finalMediaUrl = await uploadFile(file);
            const finalMediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
            const payload = {
                client_id: parseInt(clientId as string),
                title: title || file.originalname || 'Sem título',
                category: '',
                product: '',
                week_date: dateStr,
                media_url: finalMediaUrl,
                media_type: finalMediaType
            };
            const { error } = await supabase.from('client_content').insert([payload]);
            if (error) throw error;
            inserted.push(finalMediaUrl);
        }

        res.json({ success: true, count: inserted.length, urls: inserted });
    } catch (e: any) {
        const msg = (e.message || e.error_description || String(e)).toLowerCase();
        if (msg.includes('payload too large') || msg.includes('limit') || msg.includes('size') || msg.includes('413') || msg.includes('entity too large')) {
            const hint = getR2Client() ? '' : ' Configure Cloudflare R2 no .env para vídeos > 50MB (grátis).';
            return res.status(413).json({ error: `Arquivo muito grande (Supabase free: 50MB).${hint}` });
        }
        if (msg.includes('r2 não configurado')) {
            return res.status(500).json({ error: 'Vídeo > 50MB. Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME e R2_PUBLIC_URL no .env do backend.' });
        }
        if (msg.includes('supabase') || msg.includes('storage') || msg.includes('upload')) {
            return res.status(500).json({ error: 'Erro no armazenamento. Verifique o tamanho (Supabase free: 50MB por arquivo).' });
        }
        res.status(500).json({ error: (e.message || 'Erro ao enviar').slice(0, 200) });
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

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.code === 'LIMIT_FILE_SIZE' || err?.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(413).json({ error: 'Arquivo muito grande. Tente um vídeo menor ou comprima antes.' });
    }
    res.status(500).json({ error: err?.message || 'Erro interno' });
});

// ==========================================
// RIVER VIDEO LAB (VERTEX AI - VEO 3.1)
// ==========================================

app.post('/api/river/analyze', authenticate, async (req: Request, res: Response) => {
    const { images, context } = req.body;
    try {
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Envie pelo menos uma imagem.' });
        }
        const result = await analyzeProductPhotos(images, context || '');
        res.json(result);
    } catch (e: any) {
        console.error('RIVER ANALYZE ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/river/generate', authenticate, async (req: Request, res: Response) => {
    const { prompt, image } = req.body;
    try {
        if (!prompt) return res.status(400).json({ error: 'Prompt é obrigatório.' });
        const result = await generateVeoVideo(prompt, image);
        res.json(result);
    } catch (e: any) {
        console.error('RIVER GENERATE ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});
// ==========================================
// LEAD MACHINE & WHATSAPP ROUTES
// ==========================================

app.get('/api/wa/status', authenticate, (req: Request, res: Response) => {
    res.json({ isReady: getStatus(), qr: getQrCode() });
});

app.post('/api/wa/send', authenticate, async (req: Request, res: Response) => {
    const { number, message, video, leadName } = req.body;
    if (!number || !message) return res.status(400).json({ error: "Número ou mensagem ausente" });

    try {
        const result = await sendCampaignMessage(number, message, video ? `./videos/${video}` : null);

        // Log into Supabase
        await supabase.from('sent_messages').insert([{
            name: leadName || "Desconhecido",
            number,
            status: result.success ? "Sucesso" : "Falhou (" + result.error + ")",
            created_at: new Date().toISOString()
        }]);

        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/scraper/maps', authenticate, async (req: Request, res: Response) => {
    const { query, limit } = req.body;
    if (!query) return res.status(400).json({ error: "Termo de busca ausente" });

    try {
        const leads = await scrapeGoogleMaps(query, Number(limit) || 20);

        // Save Search
        await supabase.from('searches').insert([{ query, count: leads.length, created_at: new Date().toISOString() }]);

        // Save Leads (Upsert by WhatsApp)
        for (const l of leads) {
            await supabase.from('leads').upsert({
                whatsapp: l.whatsapp,
                name: l.name,
                phone: l.phone,
                instagram: l.instagram,
                source: query,
                created_at: new Date().toISOString()
            }, { onConflict: 'whatsapp' });
        }

        res.json({ success: true, count: leads.length, leads });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/history', authenticate, async (req: Request, res: Response) => {
    try {
        const { data: searches } = await supabase.from('searches').select('*').order('created_at', { ascending: false }).limit(50);
        const { data: leads } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(500);
        const { data: sent } = await supabase.from('sent_messages').select('*').order('created_at', { ascending: false }).limit(500);

        res.json({ searches: searches || [], leads: leads || [], sent: sent || [] });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/wa/restart', authenticate, (req: Request, res: Response) => {
    try {
        initWhatsApp();
        res.json({ success: true, message: "WhatsApp reiniciado" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 10000;

(async () => {
    try {
        await runMigrations();
        await initWhatsApp(); // Wait for Baileys to prepare state
        app.listen(PORT, () => {
            console.log(`[Sales Engine] API Supabase (HTTP-Mode) rodando na porta ${PORT}`);
        });
    } catch (e) {
        console.error("[CRITICAL] Erro no boot do servidor:", e);
    }
})();
