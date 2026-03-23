import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, LogOut, Download, PlayCircle, Calendar, Layers, X } from 'lucide-react';

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

const getMediaUrl = (url?: string | null) => {
    if (!url) return '';
    return url.startsWith('http') ? url : (axios.defaults.baseURL || '') + url;
};

export default function ClientDashboard() {
    const [content, setContent] = useState<Content[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('Tudo');
    const [lightboxItem, setLightboxItem] = useState<Content | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxItem(null); };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, []);

    const clientDataStr = localStorage.getItem('rivertasks_client_user');
    const clientUser = clientDataStr ? JSON.parse(clientDataStr) : null;

    useEffect(() => {
        const token = localStorage.getItem('rivertasks_client_token');
        if (!token) {
            navigate('/cliente/login');
            return;
        }

        fetchContent();
    }, [navigate]);

    const fetchContent = async () => {
        const token = localStorage.getItem('rivertasks_client_token');
        if (!token) return;
        try {
            const res = await axios.get('/api/client/content', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setContent(res.data);
        } catch (error) {
            console.error('Error fetching content:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('rivertasks_client_token');
        localStorage.removeItem('rivertasks_client_user');
        navigate('/cliente/login');
    };

    const handleDownload = async (contentId: number, filename: string) => {
        const token = localStorage.getItem('rivertasks_client_token');
        if (!token) return;
        try {
            const base = axios.defaults.baseURL || '';
            const res = await fetch(`${base}/api/client/download/${contentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Erro ao baixar');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Erro ao baixar. Tente novamente.');
        }
    };




    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;
    }

    const categories = ['Tudo', ...Array.from(new Set(content.map(c => c.category).filter(Boolean)))];
    const filteredContent = selectedCategory === 'Tudo' ? content : content.filter(c => c.category === selectedCategory);
    const showCategories = categories.length > 1;

    return (
        <div className="min-h-screen font-sans text-white bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] selection:bg-cyan-500/30">

            {/* Premium Client Header */}
            <nav className="fixed top-0 left-0 right-0 z-50 pt-6 px-6 lg:px-12 pointer-events-auto">
                <div className="max-w-[1600px] mx-auto">
                    <div className="relative flex items-center justify-between py-3 px-6 rounded-full isolate bg-[#141414] ring-1 ring-inset ring-white/5">
                        {/* Logo & Welcome */}
                        <div className="flex items-center gap-4 group cursor-default">
                            <div className="relative">
                                <div className="absolute -inset-2 bg-cyan-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100  " />
                                {clientUser?.avatar_url ? (
                                    <img src={getMediaUrl(clientUser.avatar_url)} alt="Profile" className="relative h-10 w-10 object-cover rounded-full border border-white/10 group-hover:scale-105 " />
                                ) : (
                                    <div className="relative h-10 w-10 rounded-full bg-black border border-white/20 flex items-center justify-center group-hover:scale-105 ">
                                        <span className="text-lg font-display font-medium text-white tracking-widest uppercase">{clientUser?.username?.charAt(0) || 'C'}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Bem-vindo</span>
                                <span className="text-sm font-display font-medium text-white tracking-wide">{clientUser?.username || 'Cliente River'}</span>
                            </div>
                        </div>

                        {/* Centered Categories (Desktop) */}
                        {showCategories && (
                            <div className="hidden md:flex items-center gap-2 overflow-x-auto custom-scrollbar">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase   ${selectedCategory === cat ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleLogout}
                                className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400  group shrink-0"
                                title="Desconectar"
                            >
                                <LogOut className="w-4 h-4 ml-0.5 opacity-80 group-hover:opacity-100" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-[1600px] mx-auto px-6 lg:px-12 pt-[140px] md:pt-[160px] min-h-[100dvh] relative z-10 pb-20">
                {/* Mobile Categories (if many, scrollable) */}
                {showCategories && (
                    <div className="flex md:hidden items-center gap-2 overflow-x-auto custom-scrollbar mb-8 pb-4">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`whitespace-nowrap px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase   ${selectedCategory === cat ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {filteredContent.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 border-dashed rounded-[3rem] w-full py-32 flex flex-col items-center justify-center text-center mt-10">
                        <Layers className="w-16 h-16 text-white/20 mb-6" />
                        <span className="text-lg text-white tracking-widest uppercase mb-4 font-display font-medium">Pasta Vazia</span>
                        <p className="text-sm text-white/40 max-w-md leading-relaxed font-light">Nenhum conteúdo disponível nesta categoria no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {filteredContent.map(item => {
                            const url = getMediaUrl(item.media_url);
                            const ext = item.media_type === 'video' ? 'mp4' : 'jpg';
                            const filename = `${(item.title || 'arquivo').replace(/\s+/g, '-')}.${ext}`;
                            return (
                                <div key={item.id} className="relative group bg-[#080808] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 break-inside-avoid">
                                    {/* Media - clicável para abrir modal */}
                                    <div className="relative aspect-square overflow-hidden bg-black cursor-pointer" onClick={() => setLightboxItem(item)}>
                                        {item.media_type === 'video' ? (
                                            <>
                                                <video src={url} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                                                        <PlayCircle className="w-5 h-5 text-white" />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <img src={url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        )}

                                        {/* Download - stopPropagation para não abrir modal */}
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDownload(item.id, filename); }} className="absolute bottom-2 right-2 z-20 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 shadow-lg transition-transform" title="Baixar">
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Info */}
                                    <div className="p-3 bg-[#080808]">
                                        <h3 className="text-sm font-medium text-white truncate">{item.title || 'Mídia'}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {item.week_date && <span className="text-[9px] text-white/50 flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.week_date}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal de visualização */}
            {lightboxItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setLightboxItem(null)}>
                    <button type="button" onClick={() => setLightboxItem(null)} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white" aria-label="Fechar">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        {lightboxItem.media_type === 'video' ? (
                            <video src={getMediaUrl(lightboxItem.media_url)} className="max-w-full max-h-[85vh] rounded-xl object-contain" controls autoPlay playsInline />
                        ) : (
                            <img src={getMediaUrl(lightboxItem.media_url)} alt={lightboxItem.title} className="max-w-full max-h-[85vh] rounded-xl object-contain" />
                        )}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 rounded-full px-5 py-2.5">
                            <span className="text-sm text-white truncate max-w-[200px]">{lightboxItem.title || 'Mídia'}</span>
                            <button type="button" onClick={() => handleDownload(lightboxItem.id, `${(lightboxItem.title || 'arquivo').replace(/\s+/g, '-')}.${lightboxItem.media_type === 'video' ? 'mp4' : 'jpg'}`)} className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform" title="Baixar">
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
}
