import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Users, Upload, Trash2, Loader2, ArrowLeft, Image as ImageIcon, Video, Folder, Calendar, FileText, Pencil, Eye, EyeOff, Copy, Download } from 'lucide-react';
import toast from 'react-hot-toast';

type Client = {
    id: number;
    username: string;
    niche?: string | null;
    avatar_url: string | null;
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

type Demand = {
    id: number;
    client_name: string;
    total_videos: number;
    duration_seconds: string | null;
    has_material: number;
    material_link?: string | null;
    description: string | null;
    assigned_videos: number;
    status: 'pending' | 'partial' | 'completed';
    created_by: number;
    created_by_username: string;
    created_at: string;
};

type DemandMaterial = {
    id: number;
    demand_id: number;
    media_type: 'image' | 'video' | 'text';
    media_url: string | null;
    content: string | null;
    title: string | null;
    created_at: string;
};

const getMediaUrl = (url?: string | null) => {
    if (!url) return '';
    return url.startsWith('http') ? url : (axios.defaults.baseURL || '') + url;
};

export default function AdminClients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [content, setContent] = useState<Content[]>([]);
    const [contentLoading, setContentLoading] = useState(false);

    // Demands state
    const [demands, setDemands] = useState<Demand[]>([]);
    const [demandsLoading, setDemandsLoading] = useState(false);
    const [demandMaterialsMap, setDemandMaterialsMap] = useState<Record<number, DemandMaterial[]>>({});

    // Create / Edit Modal State
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [clientFormId, setClientFormId] = useState<number | null>(null);
    const [clientForm, setClientForm] = useState({ username: '', password: '', niche: '' });
    const [clientAvatar, setClientAvatar] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [clientSaving, setClientSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');

    const navigate = useNavigate();

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadData, setUploadData] = useState({ title: '', category: '', product: '', week_date: '' });
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
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

    const fetchDemands = async (username: string) => {
        setDemandsLoading(true);
        try {
            const res = await axios.get('/api/demands');
            const clientDemands = res.data.filter((d: Demand) => d.client_name === username);
            setDemands(clientDemands);
            const ids = clientDemands.map((d: Demand) => d.id);
            const materialsRes = await Promise.all(ids.map((id: number) => axios.get(`/api/demands/${id}/materials`).catch(() => ({ data: [] }))));
            const map: Record<number, DemandMaterial[]> = {};
            ids.forEach((id: number, i: number) => { map[id] = materialsRes[i]?.data ?? []; });
            setDemandMaterialsMap(map);
        } catch (error) {
            console.error('Erro ao buscar demandas.');
        } finally {
            setDemandsLoading(false);
        }
    };

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
        fetchContent(client.id);
        fetchDemands(client.username);
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setClientFormId(null);
        setClientForm({ username: '', password: '', niche: '' });
        setClientAvatar(null);
        setPreviewUrl(null);
        setIsClientModalOpen(true);
    };

    const openEditModal = (client: Client, e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setClientFormId(client.id);
        setClientForm({ username: client.username, password: '', niche: client.niche || '' });
        setClientAvatar(null);
        setPreviewUrl(getMediaUrl(client.avatar_url));
        setIsClientModalOpen(true);
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setClientSaving(true);

        try {
            const formData = new FormData();
            formData.append('username', clientForm.username);
            formData.append('niche', clientForm.niche);

            // Password only required if creating. If editing, it's optional
            if (clientForm.password) {
                formData.append('password', clientForm.password);
            } else if (!isEditing) {
                toast.error('Senha é obrigatória para novos clientes.');
                setClientSaving(false);
                return;
            }

            if (clientAvatar) {
                formData.append('avatarFile', clientAvatar);
            }

            if (isEditing && clientFormId) {
                await axios.put(`/api/admin/clients/${clientFormId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Cliente atualizado!');
                if (selectedClient && selectedClient.id === clientFormId) {
                    setSelectedClient({ ...selectedClient, username: clientForm.username });
                }
            } else {
                await axios.post('/api/admin/clients', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Cliente criado!');
            }

            setIsClientModalOpen(false);
            fetchClients();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao salvar cliente.');
        } finally {
            setClientSaving(false);
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
            toast.error('Erro ao excluir.');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>;

    return (
        <div className="min-h-screen font-sans text-white relative bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">

            <nav className="fixed top-0 left-0 right-0 z-50 pt-4 md:pt-6 px-4 md:px-10 pointer-events-auto">
                <div className="max-w-[1500px] mx-auto">
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 md:py-2.5 px-4 rounded-[1.5rem] md:rounded-full isolate">
                        <div className="absolute inset-0 bg-[#141414] border border-white/5 rounded-[1.5rem] md:rounded-full -z-10 overflow-hidden" />

                        {!selectedClient ? (
                            <>
                                <div className="flex items-center gap-4 group">
                                    <button onClick={() => navigate('/admin')} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10  shrink-0 text-white/50 hover:text-cyan-400">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div className="hidden sm:flex w-10 h-10 rounded-full bg-cyan-500/10 items-center justify-center ring-1 ">
                                        <Users className="w-5 h-5 text-cyan-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-lg font-display font-bold text-white tracking-widest uppercase mb-[-2px]">Portal de Clientes</span>
                                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Painel Administrativo</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Buscar cliente ou nicho..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full md:w-64 bg-black/40 border border-white/10 rounded-full px-5 py-2.5 text-white text-xs outline-none focus:border-cyan-400/50 focus:bg-white/10  font-light placeholder:text-white/30 truncate"
                                    />
                                    <button onClick={openCreateModal} className="bg-white/5 hover:bg-white/10 border border-white/20 text-white font-medium text-xs px-5 py-2.5 rounded-full flex items-center gap-2  group shrink-0">
                                        <Plus className="w-4 h-4 opacity-70 group-hover:text-cyan-400 group-hover:rotate-90  " /> <span className="hidden sm:inline">Novo Cliente</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 group">
                                    <button onClick={() => setSelectedClient(null)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10  shrink-0 text-white/50 hover:text-cyan-400">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div className="flex items-center gap-3">
                                        {selectedClient.avatar_url ? (
                                            <img src={getMediaUrl(selectedClient.avatar_url)} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="Avatar" style={{ imageRendering: 'high-quality' as any }} decoding="async" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-white/10 flex items-center justify-center font-bold uppercase">{selectedClient.username.charAt(0)}</div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-lg font-display font-bold text-white tracking-widest uppercase mb-[-2px]">{selectedClient.username}</span>
                                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{selectedClient.niche || 'Área Secundária'}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsUploadModalOpen(true)} className="bg-white/5 hover:bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-full font-medium text-xs  flex items-center gap-2 group shrink-0">
                                    <Upload className="w-4 h-4 opacity-70 group-hover:text-cyan-400 " /> <span className="hidden sm:inline">Enviar Entrega</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 pt-[120px] lg:pt-[130px] min-h-[100dvh] relative z-10 pb-12 flex flex-col items-center lg:items-start">

                {!selectedClient ? (
                    <div className="w-full flex flex-col items-center mt-6">

                        {clients.filter(c => c.username.toLowerCase().includes(searchQuery.toLowerCase()) || c.niche?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                            <div className="bg-white/5 border border-white/10 border-dashed rounded-[3rem] w-full max-w-[1500px] py-20 flex flex-col items-center justify-center text-center">
                                <Users className="w-12 h-12 text-white/20 mb-4" />
                                <span className="text-sm text-white/40 tracking-widest uppercase">Nenhum cliente encontrado</span>
                            </div>
                        ) : (
                            <div className="w-full max-w-[1500px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                {clients.filter(c => c.username.toLowerCase().includes(searchQuery.toLowerCase()) || c.niche?.toLowerCase().includes(searchQuery.toLowerCase())).map(client => (
                                    <div key={client.id} className="relative group bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:bg-white/10 hover:border-white/20  cursor-pointer overflow-hidden " onClick={() => handleSelectClient(client)}>
                                        <div className="flex flex-col h-full z-10 relative">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-white/10 flex items-center justify-center relative overflow-hidden group-hover:scale-105  ">
                                                    {client.avatar_url ? (
                                                        <img src={getMediaUrl(client.avatar_url)} alt="Profile" className="w-full h-full object-cover" style={{ imageRendering: 'high-quality' as any }} decoding="async" />
                                                    ) : (
                                                        <span className="text-xl font-display font-bold text-white/80 uppercase">{client.username.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={(e) => openEditModal(client, e)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-cyan-400 hover:bg-white/10 ">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/20 ">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-bold text-white tracking-wider truncate uppercase">{client.username}</h3>
                                            <p className="text-[10px] text-cyan-400/80 mt-1 uppercase tracking-widest font-bold">
                                                {client.niche || 'Área Secundária'}
                                            </p>
                                            <p className="text-[10px] text-white/30 mt-2 tracking-widest uppercase">
                                                Inscrito em: {new Date(client.created_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center mt-6">

                        {/* Demands Section */}
                        <div className="w-full max-w-[1500px] mb-12">
                            <h3 className="text-sm font-display font-medium text-white/50 tracking-widest uppercase mb-6 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Demandas do Cliente</h3>
                            {demandsLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                            ) : demands.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center">
                                    <span className="text-xs text-white/40 tracking-widest uppercase">Nenhuma demanda registrada para este cliente.</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {demands.map(demand => (
                                        <div key={demand.id} className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-6 flex flex-col relative group">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-lg font-bold text-white tracking-wider truncate uppercase">{demand.client_name}</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
                                                    <span className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Restam</span>
                                                    <span className="text-xl font-display font-bold text-cyan-400">{demand.total_videos - demand.assigned_videos} <span className="text-[10px] text-white/30 font-medium">/ {demand.total_videos} vlog</span></span>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
                                                    <span className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Formatos</span>
                                                    <span className="text-[11px] font-display font-medium text-emerald-400 break-words line-clamp-2">{demand.duration_seconds || '--'}</span>
                                                </div>
                                            </div>
                                            {demand.description && <p className="text-xs text-white/50 mb-4 line-clamp-3 leading-relaxed">{demand.description}</p>}
                                            {((demandMaterialsMap[demand.id]?.length ?? 0) > 0 || (demand.has_material === 1 && demand.material_link)) && (
                                                <div className="mb-4 space-y-2">
                                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Material de apoio</span>
                                                    <div className="space-y-2 max-h-28 overflow-y-auto custom-scrollbar">
                                                        {(demandMaterialsMap[demand.id] ?? []).map(m => (
                                                            <div key={m.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2 group/m">
                                                                {m.media_type === 'image' && m.media_url && (
                                                                    <a href={m.media_url} target="_blank" rel="noreferrer" className="shrink-0 w-10 h-10 rounded overflow-hidden bg-white/5">
                                                                        <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                                                                    </a>
                                                                )}
                                                                {m.media_type === 'video' && m.media_url && (
                                                                    <div className="shrink-0 w-10 h-10 rounded bg-white/5 flex items-center justify-center"><Video className="w-5 h-5 text-white/50" /></div>
                                                                )}
                                                                {m.media_type === 'text' && (
                                                                    <div className="shrink-0 w-10 h-10 rounded bg-white/5 flex items-center justify-center"><FileText className="w-5 h-5 text-white/50" /></div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[10px] text-white/70 truncate">{m.media_type === 'text' ? (m.content || '').slice(0, 35) + '...' : (m.media_url || '').slice(-25)}</div>
                                                                </div>
                                                                <div className="flex items-center gap-0.5 opacity-0 group-hover/m:opacity-100">
                                                                    {m.media_type === 'text' ? (
                                                                        <button onClick={() => { navigator.clipboard.writeText(m.content || ''); toast.success('Copiado!'); }} className="p-1.5 rounded bg-white/10 hover:bg-white/20" title="Copiar"><Copy className="w-3 h-3" /></button>
                                                                    ) : m.media_url ? (
                                                                        <>
                                                                            <button onClick={() => { navigator.clipboard.writeText(m.media_url!); toast.success('Link copiado!'); }} className="p-1.5 rounded bg-white/10 hover:bg-white/20" title="Copiar"><Copy className="w-3 h-3" /></button>
                                                                            <a href={m.media_url} download target="_blank" rel="noreferrer" className="p-1.5 rounded bg-white/10 hover:bg-white/20" title="Baixar"><Download className="w-3 h-3" /></a>
                                                                        </>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {demand.has_material === 1 && demand.material_link && !(demandMaterialsMap[demand.id]?.length) && (
                                                            <a href={demand.material_link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 underline block truncate">Link legado</a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${demand.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : demand.status === 'partial' ? 'bg-amber-400/10 text-amber-500 border border-amber-400/20' : 'bg-white/5 text-white/50 border border-white/10'}`}>
                                                    {demand.status === 'completed' ? 'Concluída' : demand.status === 'partial' ? 'Em Progresso' : 'Pendente'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="w-full max-w-[1500px] flex items-center gap-2 mb-6">
                            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                            <h3 className="text-sm font-display font-medium text-white/50 tracking-widest uppercase">Entregas de Conteúdo</h3>
                        </div>

                        {contentLoading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mt-20" />
                        ) : content.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 border-dashed rounded-[3rem] w-full max-w-[1500px] py-32 flex flex-col items-center justify-center text-center mt-4">
                                <Folder className="w-16 h-16 text-white/20 mb-6" />
                                <span className="text-sm text-white/40 tracking-widest uppercase mb-4">Pasta Vazia</span>
                                <p className="text-xs text-white/30 max-w-md leading-relaxed">Nenhum conteúdo foi entregue para este cliente ainda. Clique em "Enviar Entrega" para organizar os arquivos gerados.</p>
                            </div>
                        ) : (
                            <div className="w-full max-w-[1500px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {content.map(item => (
                                    <div key={item.id} className="group relative bg-[#0A0A0A] border border-white/10 rounded-[2rem] overflow-hidden hover:border-white/20  hover: flex flex-col pb-4">

                                        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 ">
                                            <button onClick={() => handleDeleteContent(item.id)} className="w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500 hover:scale-110 ">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="aspect-[4/5] bg-white/5 relative flex items-center justify-center group-hover:scale-105  ">
                                            {item.media_type === 'video' ? (
                                                <div className="w-full h-full relative">
                                                    <video src={getMediaUrl(item.media_url)} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="w-12 h-12 rounded-full bg-black/40 border border-white/20 flex items-center justify-center">
                                                            <Video className="w-5 h-5 text-white/80" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img src={getMediaUrl(item.media_url)} alt={item.title} className="w-full h-full object-cover" />
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

            {/* Create/Edit Client Modal */}
            {isClientModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[8px] backdrop-blur-sm " onClick={() => !clientSaving && setIsClientModalOpen(false)} />
                    <div className="relative bg-[#080808]/90 ring-1 ring-inset ring-white/10 rounded-[3rem] w-full max-w-md transform flex flex-col mx-auto my-auto overflow-hidden">
                        {!clientSaving && <button type="button" onClick={() => setIsClientModalOpen(false)} className="absolute top-5 right-5 z-20 text-white/30 hover:text-white bg-white/5 p-3 rounded-full border border-transparent hover:border-white/10 opacity-70 hover:opacity-100 transition-all"><X className="w-5 h-5" /></button>}

                        <div className="p-[clamp(1.5rem,4vh,2.5rem)] flex-1 relative z-10 w-full flex flex-col items-center gap-[clamp(1rem,3vh,1.5rem)] overflow-y-auto custom-scrollbar max-h-[90vh]">
                            <div className="w-full text-center shrink-0">
                                <h2 className="text-[clamp(1.25rem,4vh,1.5rem)] font-display font-medium text-white mb-1 tracking-widest uppercase mt-4">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                                <p className="text-[10px] sm:text-xs text-white/40 mb-2 tracking-wider">{isEditing ? 'Atualize as informações do acesso.' : 'Crie um acesso para a Área Secundária.'}</p>
                            </div>

                            <form onSubmit={handleSaveClient} className="w-full flex flex-col gap-[clamp(0.75rem,2vh,1.25rem)]">
                                {/* Avatar File Upload / Preview */}
                                {previewUrl ? (
                                    <div className="w-full relative rounded-2xl overflow-hidden group border border-white/10 p-2 bg-white/5 flex flex-col items-center shrink-0">
                                        <div className="absolute inset-0 z-0">
                                            <img src={previewUrl} className="w-full h-full object-cover blur-xl opacity-40 scale-125" alt="blur-bg" />
                                        </div>
                                        <div className="relative z-10 w-[clamp(5rem,12vh,7rem)] h-[clamp(5rem,12vh,7rem)] rounded-full overflow-hidden border-2 border-cyan-400 my-2">
                                            <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                                        </div>
                                        <div className="relative z-10 flex gap-2 justify-center pb-2 w-full px-2">
                                            <label className="flex-1 text-center text-[9px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 py-2 rounded-full cursor-pointer transition-colors">
                                                Trocar
                                                <input type="file" accept="image/*" onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) { setClientAvatar(file); setPreviewUrl(URL.createObjectURL(file)); }
                                                }} className="hidden" />
                                            </label>
                                            <button type="button" onClick={() => { setClientAvatar(null); setPreviewUrl(null); }} className="flex-1 text-[9px] font-bold uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 py-2 rounded-full transition-colors">
                                                Remover
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="w-full bg-white/[0.02] border border-dashed border-white/10 hover:border-cyan-400/50 rounded-2xl p-[clamp(1rem,3vh,2rem)] flex flex-col items-center justify-center cursor-pointer group shrink-0 transition-all">
                                        <input type="file" accept="image/*" onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) { setClientAvatar(file); setPreviewUrl(URL.createObjectURL(file)); }
                                        }} className="hidden" />
                                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-all">
                                            <ImageIcon className="w-4 h-4 text-white/30 group-hover:text-cyan-400" />
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/50 group-hover:text-cyan-400">Subir Foto</span>
                                    </label>
                                )}

                                <div className="space-y-[clamp(0.5rem,1.5vh,1rem)]">
                                    <input required type="text" value={clientForm.username} onChange={e => setClientForm({ ...clientForm, username: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-[clamp(0.75rem,2.5vh,1rem)] text-white text-center text-sm outline-none focus:border-cyan-400/50 focus:bg-white/10 font-light placeholder:text-white/20 transition-all" placeholder="Nome do Cliente" />

                                    <input type="text" value={clientForm.niche} onChange={e => setClientForm({ ...clientForm, niche: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-[clamp(0.75rem,2.5vh,1rem)] text-white text-center text-sm outline-none focus:border-cyan-400/50 focus:bg-white/10 font-light placeholder:text-white/20 transition-all" placeholder="Nicho / Ramo de Atuação" />

                                    <div className="relative w-full">
                                        <input required={!isEditing} type={showPassword ? "text" : "password"} value={clientForm.password} onChange={e => setClientForm({ ...clientForm, password: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-[clamp(0.75rem,2.5vh,1rem)] text-white text-center text-sm outline-none focus:border-cyan-400/50 focus:bg-white/10 font-light placeholder:text-white/20 transition-all" placeholder={isEditing ? "Senha" : "Senha de Acesso"} autoComplete="new-password" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white p-2">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={clientSaving} className="w-full mt-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 disabled:opacity-50 disabled:pointer-events-none font-bold uppercase tracking-widest text-[clamp(0.6rem,1.5vh,0.7rem)] py-[clamp(1rem,2.8vh,1.25rem)] rounded-xl flex justify-center items-center transition-all">
                                    {clientSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Criar Acesso')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Content Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[8px] backdrop-blur-sm " onClick={() => !uploading && setIsUploadModalOpen(false)} />
                    <div className="relative bg-[#080808]/90 ring-1 ring-inset ring-white/10 rounded-[3rem] w-full max-w-lg transform  flex flex-col mx-auto my-auto overflow-hidden">
                        {!uploading && <button type="button" onClick={() => setIsUploadModalOpen(false)} className="absolute top-5 right-5 z-20 text-white/30 hover:text-white bg-white/5 p-3 rounded-full z-20 border border-transparent hover:border-white/10 opacity-70 hover:opacity-100 transition-all"><X className="w-5 h-5" /></button>}

                        <div className="p-[clamp(1.5rem,4vh,2.5rem)] flex-1 relative z-10 w-full flex flex-col items-center gap-[clamp(1rem,3vh,1.5rem)] overflow-y-auto custom-scrollbar max-h-[90vh]">
                            <div className="w-full text-center shrink-0 mb-[clamp(0.5rem,2vh,1rem)]">
                                <h2 className="text-[clamp(1.25rem,4vh,1.5rem)] font-display font-medium text-white mb-1 tracking-wide uppercase">Subir Arquivo</h2>
                                <p className="text-[10px] sm:text-xs text-white/40 tracking-wider">Organize a entrega para {selectedClient?.username}</p>
                            </div>

                            <form onSubmit={handleUploadContent} className="w-full flex flex-col gap-[clamp(0.75rem,2.5vh,1.25rem)]">
                                <div className="flex gap-4">
                                    <input required type="text" value={uploadData.category} onChange={e => setUploadData({ ...uploadData, category: e.target.value })} className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-[clamp(0.75rem,2.5vh,1rem)] text-white text-sm outline-none focus:border-emerald-400/50 font-light placeholder:text-white/20 transition-all" placeholder="Categoria (ex: Feed, Reels)" />
                                    <input required type="text" value={uploadData.week_date} onChange={e => setUploadData({ ...uploadData, week_date: e.target.value })} className="w-1/3 bg-white/5 border border-white/10 rounded-2xl px-5 py-[clamp(0.75rem,2.5vh,1rem)] text-white text-sm outline-none focus:border-emerald-400/50 font-light placeholder:text-white/20 transition-all" placeholder="Semana/Data" />
                                </div>
                                <input required type="text" value={uploadData.product} onChange={e => setUploadData({ ...uploadData, product: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-[clamp(0.75rem,2.5vh,1rem)] text-white text-sm outline-none focus:border-emerald-400/50 font-light placeholder:text-white/20 transition-all" placeholder="Produto Referente" />
                                <input type="text" value={uploadData.title} onChange={e => setUploadData({ ...uploadData, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-[clamp(0.75rem,2.5vh,1rem)] text-white text-sm outline-none focus:border-emerald-400/50 font-light placeholder:text-white/20 transition-all" placeholder="Título (Opcional)" />

                                <label className="w-full bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-emerald-400/50 rounded-3xl p-[clamp(1.5rem,4vh,2.5rem)] flex flex-col items-center justify-center cursor-pointer group transition-all shrink-0">
                                    <input type="file" required accept="image/*,video/*" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="hidden" />
                                    {uploadFile ? (
                                        <div className="flex flex-col items-center">
                                            <FileText className="w-8 h-8 text-emerald-400 mb-2" />
                                            <span className="text-xs font-medium text-white/80 text-center max-w-[200px] truncate">{uploadFile.name}</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <div className="flex gap-4 mb-2 text-white/30 group-hover:text-emerald-400/70 transition-colors">
                                                <ImageIcon className="w-6 h-6" />
                                                <Video className="w-6 h-6" />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 group-hover:text-emerald-400">Selecionar Arquivo</span>
                                        </div>
                                    )}
                                </label>

                                <button type="submit" disabled={uploading} className="w-full mt-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400 disabled:opacity-50 text-emerald-400 font-bold uppercase tracking-widest text-[clamp(0.6rem,1.5vh,0.7rem)] py-[clamp(1rem,2.8vh,1.25rem)] rounded-xl flex justify-center items-center transition-all">
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Começar Upload'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
