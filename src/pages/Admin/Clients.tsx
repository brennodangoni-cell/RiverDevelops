import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, Users, Upload, Trash2, Loader2, ArrowLeft, Image as ImageIcon, Video, Folder, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

type Client = {
    id: number;
    username: string;
    created_at: string;
};

type Content = {
    id: number;
    title: string;
    category: string;
    product: string;
    week_date: string;
    media_url: string;
    media_type: string;
    created_at: string;
};

export default function AdminClients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [content, setContent] = useState<Content[]>([]);
    const [contentLoading, setContentLoading] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newClient, setNewClient] = useState({ username: '', password: '' });

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadData, setUploadData] = useState({ title: '', category: '', product: '', week_date: '' });
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        axios.interceptors.request.use(config => {
            const token = localStorage.getItem('rivertasks_token');
            if (token) config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await axios.get('/api/admin/clients');
            setClients(res.data);
        } catch (error) {
            toast.error('Erro ao carregar clientes.');
        } finally {
            setLoading(false);
        }
    };

    const fetchContent = async (clientId: number) => {
        setContentLoading(true);
        try {
            const res = await axios.get(`/api/admin/clients/${clientId}/content`);
            setContent(res.data);
        } catch (error) {
            toast.error('Erro ao buscar conteúdos do cliente.');
        } finally {
            setContentLoading(false);
        }
    };

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
        fetchContent(client.id);
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/clients', newClient);
            toast.success('Cliente criado!');
            setIsCreateModalOpen(false);
            setNewClient({ username: '', password: '' });
            fetchClients();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao criar cliente.');
        }
    };

    const handleDeleteClient = async (id: number) => {
        if (!confirm('Tem certeza? Isso apagará o cliente e todo os seus conteúdos.')) return;
        try {
            await axios.delete(`/api/admin/clients/${id}`);
            toast.success('Cliente excluído.');
            fetchClients();
            if (selectedClient?.id === id) setSelectedClient(null);
        } catch (error) {
            toast.error('Erro ao excluir.');
        }
    };

    const handleUploadContent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) return;
        if (!uploadFile) {
            toast.error('Selecione um arquivo.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('title', uploadData.title);
        formData.append('category', uploadData.category);
        formData.append('product', uploadData.product);
        formData.append('week_date', uploadData.week_date);
        formData.append('mediaFile', uploadFile);

        try {
            await axios.post(`/api/admin/clients/${selectedClient.id}/content`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Conteúdo enviado com sucesso!');
            setIsUploadModalOpen(false);
            setUploadData({ title: '', category: '', product: '', week_date: '' });
            setUploadFile(null);
            fetchContent(selectedClient.id);
        } catch (error) {
            toast.error('Erro ao enviar conteúdo.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteContent = async (id: number) => {
        if (!confirm('Deseja excluir este conteúdo?')) return;
        try {
            await axios.delete(`/api/admin/content/${id}`);
            toast.success('Conteúdo excluído.');
            if (selectedClient) fetchContent(selectedClient.id);
        } catch (error) {
            toast.error('Erro ao excluir conteúdo.');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#030303]"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>;

    return (
        <div className="min-h-screen font-sans text-white relative bg-[#030303]">
            {/* Background elements to match Dashboard */}
            <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'url(/bgtasks.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }} />

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 pt-[160px] lg:pt-[180px] min-h-[100dvh] relative z-10 pb-12 flex flex-col items-center lg:items-start">

                {!selectedClient ? (
                    <div className="w-full flex flex-col items-center">
                        <div className="w-full max-w-4xl flex items-center justify-between mb-10 bg-white/5 border border-white/10 rounded-full py-4 px-8 backdrop-blur-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/30">
                                    <Users className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-display font-medium text-white tracking-widest uppercase">Portal de Clientes</h1>
                                    <p className="text-xs text-white/40 tracking-wider">Gerencie os acessos e entregas</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(true)} className="bg-purple-500 hover:bg-purple-600 text-white font-bold tracking-widest uppercase text-xs px-6 py-3 rounded-full flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20">
                                <Plus className="w-4 h-4" /> Novo Cliente
                            </button>
                        </div>

                        {clients.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 border-dashed rounded-[3rem] w-full max-w-4xl py-20 flex flex-col items-center justify-center text-center">
                                <Users className="w-12 h-12 text-white/20 mb-4" />
                                <span className="text-sm text-white/40 tracking-widest uppercase">Nenhum cliente cadastrado</span>
                            </div>
                        ) : (
                            <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                {clients.map(client => (
                                    <div key={client.id} className="relative group bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer overflow-hidden backdrop-blur-xl" onClick={() => handleSelectClient(client)}>
                                        <div className="flex flex-col h-full z-10 relative">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center shadow-lg">
                                                    <span className="text-xl font-display font-bold text-white/80 uppercase">{client.username.charAt(0)}</span>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/20 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <h3 className="text-lg font-bold text-white tracking-wider truncate">{client.username}</h3>
                                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">
                                                Inscrito: {new Date(client.created_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center">
                        <div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between mb-8 gap-6 bg-black/40 border border-white/10 rounded-[3rem] p-6 md:p-8 backdrop-blur-xl">
                            <div className="flex items-center gap-6">
                                <button onClick={() => setSelectedClient(null)} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <h2 className="text-2xl font-display font-bold tracking-widest text-white uppercase">{selectedClient.username}</h2>
                                    <p className="text-xs text-white/40 tracking-wider">Gestão de entregas (Fotos & Vídeos)</p>
                                </div>
                            </div>
                            <button onClick={() => setIsUploadModalOpen(true)} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold tracking-widest uppercase text-xs px-8 py-4 rounded-full flex items-center gap-3 transition-all shadow-lg shadow-cyan-500/20 shrink-0">
                                <Upload className="w-4 h-4" /> Subir Conteúdo
                            </button>
                        </div>

                        {contentLoading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mt-20" />
                        ) : content.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 border-dashed rounded-[3rem] w-full max-w-7xl py-32 flex flex-col items-center justify-center text-center mt-4">
                                <Folder className="w-16 h-16 text-white/20 mb-6" />
                                <span className="text-sm text-white/40 tracking-widest uppercase mb-4">Pasta Vazia</span>
                                <p className="text-xs text-white/30 max-w-md leading-relaxed">Nenhum conteúdo foi entregue para este cliente ainda. Clique em "Subir Conteúdo" para organizar os arquivos gerados.</p>
                            </div>
                        ) : (
                            <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {content.map(item => (
                                    <div key={item.id} className="group relative bg-[#0A0A0A] border border-white/10 rounded-[2rem] overflow-hidden hover:border-white/20 transition-all hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col pb-4">

                                        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDeleteContent(item.id)} className="w-8 h-8 rounded-full bg-red-500/80 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 hover:scale-110 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="aspect-[4/5] bg-white/5 relative flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
                                            {item.media_type === 'video' ? (
                                                <div className="w-full h-full relative">
                                                    <video src={(axios.defaults.baseURL || '') + item.media_url} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center">
                                                            <Video className="w-5 h-5 text-white/80" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img src={(axios.defaults.baseURL || '') + item.media_url} alt={item.title} className="w-full h-full object-cover" />
                                            )}
                                        </div>

                                        <div className="px-5 pt-5 flex flex-col z-10 bg-[#0A0A0A]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full uppercase tracking-wider">{item.category}</span>
                                                <span className="text-[9px] font-bold text-white/50 bg-white/10 px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.week_date}</span>
                                            </div>
                                            <h4 className="text-white font-medium text-sm truncate tracking-wide">{item.title || 'Sem título'}</h4>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Prod: {item.product || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Create Client Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)} />
                    <div className="relative bg-[#080808]/90 backdrop-blur-2xl ring-1 ring-inset ring-white/10 rounded-[3rem] w-full max-w-md shadow-2xl p-10 flex flex-col items-center">
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="absolute top-5 right-5 text-white/30 hover:text-white bg-white/5 p-3 rounded-full"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-display font-medium text-white mb-2 tracking-wide uppercase">Novo Cliente</h2>
                        <p className="text-xs text-white/40 mb-8 tracking-wider text-center">Crie o acesso para a Área Membros.</p>
                        <form onSubmit={handleCreateClient} className="w-full flex flex-col gap-4">
                            <input required type="text" value={newClient.username} onChange={e => setNewClient({ ...newClient, username: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-6 py-4 text-white text-center text-sm outline-none focus:border-purple-400/50 focus:bg-white/10 transition-all font-medium placeholder:text-white/20" placeholder="Nome de Usuário (Login)" />
                            <input required type="password" value={newClient.password} onChange={e => setNewClient({ ...newClient, password: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-6 py-4 text-white text-center text-sm outline-none focus:border-purple-400/50 focus:bg-white/10 transition-all font-medium placeholder:text-white/20" placeholder="Senha" />
                            <button type="submit" className="w-full mt-4 bg-purple-500 hover:bg-purple-600 text-white font-bold uppercase tracking-widest text-xs py-4 rounded-full transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]">Criar Acesso</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload Content Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !uploading && setIsUploadModalOpen(false)} />
                    <div className="relative bg-[#080808]/90 backdrop-blur-2xl ring-1 ring-inset ring-white/10 rounded-[3rem] w-full max-w-lg shadow-2xl p-8 sm:p-10 flex flex-col">
                        {!uploading && <button type="button" onClick={() => setIsUploadModalOpen(false)} className="absolute top-5 right-5 text-white/30 hover:text-white bg-white/5 p-3 rounded-full z-10"><X className="w-5 h-5" /></button>}

                        <div className="text-center mb-8 relative z-0">
                            <h2 className="text-xl font-display font-medium text-white mb-2 tracking-wide uppercase">Subir Arquivo</h2>
                            <p className="text-xs text-white/40 tracking-wider">Organize a entrega para {selectedClient?.username}</p>
                        </div>

                        <form onSubmit={handleUploadContent} className="w-full flex flex-col gap-4 relative z-0">
                            <div className="flex gap-4">
                                <input required type="text" value={uploadData.category} onChange={e => setUploadData({ ...uploadData, category: e.target.value })} className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-cyan-400/50 transition-all" placeholder="Categoria (ex: Feed, Reels)" />
                                <input required type="text" value={uploadData.week_date} onChange={e => setUploadData({ ...uploadData, week_date: e.target.value })} className="w-1/3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-cyan-400/50 transition-all" placeholder="Semana/Data" />
                            </div>
                            <input required type="text" value={uploadData.product} onChange={e => setUploadData({ ...uploadData, product: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-cyan-400/50 transition-all" placeholder="Produto Referente" />
                            <input type="text" value={uploadData.title} onChange={e => setUploadData({ ...uploadData, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-cyan-400/50 transition-all" placeholder="Título (Opcional)" />

                            <label className="w-full mt-2 bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-cyan-400/50 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group">
                                <input type="file" required accept="image/*,video/*" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="hidden" />
                                {uploadFile ? (
                                    <div className="flex flex-col items-center">
                                        <FileText className="w-10 h-10 text-cyan-400 mb-2" />
                                        <span className="text-sm font-medium text-white/80 text-center max-w-[200px] truncate">{uploadFile.name}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="flex gap-4 mb-4 text-white/30 group-hover:text-cyan-400/70 transition-colors">
                                            <ImageIcon className="w-8 h-8" />
                                            <Video className="w-8 h-8" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-white/50 group-hover:text-cyan-400 transition-colors">Selecionar Arquivo</span>
                                    </div>
                                )}
                            </label>

                            <button type="submit" disabled={uploading} className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-900 disabled:opacity-50 text-white font-bold uppercase tracking-widest text-xs py-4 rounded-full transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] flex justify-center items-center">
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Começar Upload'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

