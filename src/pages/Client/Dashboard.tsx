import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, LogOut, Download, PlayCircle, Image as ImageIcon, Calendar, Layers, Video } from 'lucide-react';

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
    const navigate = useNavigate();

    const clientDataStr = localStorage.getItem('rivertasks_client_user');
    const clientUser = clientDataStr ? JSON.parse(clientDataStr) : null;

    useEffect(() => {
        const token = localStorage.getItem('rivertasks_client_token');
        if (!token) {
            navigate('/cliente/login');
            return;
        }

        const fetchContent = async () => {
            try {
                const res = await axios.get('/api/client/content', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setContent(res.data);
            } catch (error) {
                toast.error('Sessão expirada. Faça login novamente.');
                localStorage.removeItem('rivertasks_client_token');
                navigate('/cliente/login');
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('rivertasks_client_token');
        localStorage.removeItem('rivertasks_client_user');
        navigate('/cliente/login');
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;
    }

    const categories = ['Tudo', ...Array.from(new Set(content.map(c => c.category).filter(Boolean)))];
    const filteredContent = selectedCategory === 'Tudo' ? content : content.filter(c => c.category === selectedCategory);

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

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400  group shrink-0"
                            title="Desconectar"
                        >
                            <LogOut className="w-4 h-4 ml-0.5 opacity-80 group-hover:opacity-100" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-[1600px] mx-auto px-6 lg:px-12 pt-[140px] md:pt-[160px] min-h-[100dvh] relative z-10 pb-20">
                {/* Mobile Categories (if many, scrollable) */}
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

                {filteredContent.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 border-dashed rounded-[3rem] w-full py-32 flex flex-col items-center justify-center text-center mt-10">
                        <Layers className="w-16 h-16 text-white/20 mb-6" />
                        <span className="text-lg text-white tracking-widest uppercase mb-4 font-display font-medium">Pasta Vazia</span>
                        <p className="text-sm text-white/40 max-w-md leading-relaxed font-light">Nenhum conteúdo disponível nesta categoria no momento.</p>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                        {filteredContent.map(item => (
                            <div key={item.id} className="relative group bg-[#080808] border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-white/20   hover: break-inside-avoid">
                                {/* Media Container */}
                                <div className="relative w-full overflow-hidden bg-black flex items-center justify-center">
                                    {item.media_type === 'video' ? (
                                        <div className="w-full relative aspect-[9/16]">
                                            <video src={getMediaUrl(item.media_url)} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10 group-hover:bg-transparent ">
                                                <div className="w-16 h-16 rounded-full bg-black/40 border border-white/20 flex items-center justify-center scale-100 group-hover:scale-110 ">
                                                    <PlayCircle className="w-8 h-8 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full relative">
                                            <img src={getMediaUrl(item.media_url)} alt={item.title} className="w-full h-auto object-cover group-hover:scale-105   ease-[cubic-bezier(0.16,1,0.3,1)]" />
                                        </div>
                                    )}

                                    {/* Format Badge */}
                                    <div className="absolute top-4 left-4 z-10">
                                        <div className="bg-black/60 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                                            {item.media_type === 'video' ? <Video className="w-3.5 h-3.5 text-cyan-400" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />}
                                            <span className="text-[9px] font-bold text-white uppercase tracking-widest">{item.media_type}</span>
                                        </div>
                                    </div>

                                    {/* Action Hover */}
                                    <div className="absolute bottom-4 right-4 z-20 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0   ">
                                        <a href={getMediaUrl(item.media_url)} download target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 ">
                                            <Download className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>

                                {/* Content Details */}
                                <div className="p-6 relative z-10 bg-gradient-to-t from-[#080808] to-transparent">
                                    <div className="flex items-center justify-between mb-3 w-full pr-12">
                                        <div className="flex items-center gap-2 truncate flex-1 flex-wrap">
                                            {item.product && (
                                                <span className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-1 rounded-full uppercase tracking-wider truncate max-w-[120px]">
                                                    {item.product}
                                                </span>
                                            )}
                                            {item.week_date && (
                                                <span className="text-[9px] font-bold text-white/50 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                                                    <Calendar className="w-3 h-3" /> {item.week_date}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-display font-medium text-white tracking-wide truncate">{item.title || 'Mídia Sem Título'}</h3>

                                    <p className="text-[10px] text-white/30 tracking-widest uppercase mt-4">
                                        Adicionado {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
