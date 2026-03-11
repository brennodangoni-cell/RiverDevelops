import { useState, useEffect } from 'react';
import { Database, Clock, MessageCircle, Instagram, Search, PlusCircle, MinusCircle, ExternalLink, Globe, MapPin, Tag, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const STATUS_CONFIG: any = {
    'Novo': { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: AlertCircle },
    'Em Negociação': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
    'Fechado': { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 },
    'Perdido': { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle },
};

export function History({ onQueue, queue, onRemove }: { onQueue: (l: any) => void, queue: any[], onRemove: (num: string) => void }) {
    const [data, setData] = useState<any>({ searches: [], leads: [], sent: [] });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todas');
    const [stateFilter, setStateFilter] = useState('Todos');
    const [cityFilter, setCityFilter] = useState('Todas');
    const [statusFilter, setStatusFilter] = useState('Todos');

    const loadData = () => {
        axios.get('/api/history')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadData();
    }, []);

    const updateStatus = async (id: number, newStatus: string) => {
        try {
            await axios.patch(`/api/leads/${id}/status`, { status: newStatus });
            toast.success(`Status atualizado: ${newStatus}`);
            setData((prev: any) => ({
                ...prev,
                leads: prev.leads.map((l: any) => l.id === id ? { ...l, status: newStatus } : l)
            }));
        } catch (e) {
            toast.error("Falha ao atualizar status");
        }
    };

    if (loading) return <div className="text-white/40 animate-pulse text-center py-24 font-black font-mono text-xs tracking-[0.3em] uppercase">Sincronizando Banco de Dados Central...</div>;

    const categories = ['Todas', ...Array.from(new Set(data.leads.map((l: any) => l.category || 'Geral')))] as string[];
    const states = ['Todos', ...Array.from(new Set(data.leads.map((l: any) => l.source?.split(' ').pop()).filter(Boolean)))] as string[];
    const cities = ['Todas', ...Array.from(new Set(data.leads.map((l: any) => l.source?.match(/em (.*) [A-Z]{2}$/)?.[1]).filter(Boolean)))] as string[];
    const statuses = ['Todos', 'Novo', 'Em Negociação', 'Fechado', 'Perdido'];

    const filteredLeads = data.leads.filter((l: any) => {
        const searchStr = (l.name + l.whatsapp + (l.source || '')).toLowerCase();
        const matchesSearch = searchStr.includes(filter.toLowerCase());
        const matchesCategory = categoryFilter === 'Todas' || (l.category || 'Geral') === categoryFilter;

        const leadState = l.source?.split(' ').pop();
        const matchesState = stateFilter === 'Todos' || leadState === stateFilter;

        const leadCity = l.source?.match(/em (.*) [A-Z]{2}$/)?.[1];
        const matchesCity = cityFilter === 'Todas' || leadCity === cityFilter;
        const matchesStatus = statusFilter === 'Todos' || (l.status || 'Novo') === statusFilter;

        return matchesSearch && matchesCategory && matchesState && matchesCity && matchesStatus;
    });

    const isInQueue = (num: string) => queue.some(q => q.whatsapp === num);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 font-sans">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-[#050505] p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-2xl group transition-all hover:border-cyan-500/20">
                    <div className="relative z-10">
                        <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black mb-3">Leads Totais</p>
                        <h2 className="text-5xl font-black tracking-tighter text-white italic leading-none">{data.leads.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform"><Database size={28} /></div>
                </div>
                <div className="bg-[#050505] p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-2xl group transition-all hover:border-green-500/20">
                    <div className="relative z-10">
                        <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black mb-3">Fechamentos</p>
                        <h2 className="text-5xl font-black tracking-tighter text-white italic leading-none">{data.leads.filter((l: any) => l.status === 'Fechado').length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 border border-green-500/20 group-hover:scale-110 transition-transform"><CheckCircle2 size={28} /></div>
                </div>
                <div className="bg-[#050505] p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-2xl group transition-all hover:border-amber-500/20">
                    <div className="relative z-10">
                        <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black mb-3">Negociações</p>
                        <h2 className="text-5xl font-black tracking-tighter text-white italic leading-none">{data.leads.filter((l: any) => l.status === 'Em Negociação').length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform"><Clock size={28} /></div>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="bg-[#050505] rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-10 lg:p-14 border-b border-white/10 bg-white/[0.01]">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 mb-12">
                        <div>
                            <h3 className="font-black text-3xl text-white uppercase tracking-tighter italic leading-none">Dossiê Estratégico</h3>
                            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.5em] mt-3 ml-1 opacity-60">Inteligência Comercial Centralizada</p>
                        </div>
                        <div className="relative w-full lg:w-[400px]">
                            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                            <input
                                type="text"
                                placeholder="Buscar nos registros táticos..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className="bg-black border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:ring-2 ring-cyan-500/30 w-full transition-all placeholder:text-white/10 hover:border-white/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Nicho</label>
                            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl py-4.5 px-6 text-sm font-bold text-white focus:ring-2 ring-cyan-500/30 appearance-none cursor-pointer">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">UF</label>
                            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl py-4.5 px-6 text-sm font-bold text-white focus:ring-2 ring-cyan-500/30 appearance-none cursor-pointer">
                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Cidade</label>
                            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl py-4.5 px-6 text-sm font-bold text-white focus:ring-2 ring-cyan-500/30 appearance-none cursor-pointer">
                                {cities.map(c => <option key={c} value={c}>{c || 'Todas'}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Status da Pipeline</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl py-4.5 px-6 text-sm font-bold text-white focus:ring-2 ring-cyan-500/30 appearance-none cursor-pointer">
                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead className="bg-black">
                            <tr className="border-b border-white/10 text-white/20 text-[10px] uppercase tracking-[0.3em] font-black italic">
                                <th className="py-8 px-10">Empresa / Identidade</th>
                                <th className="py-8 px-10">Ponto de Contato</th>
                                <th className="py-8 px-10">Status do Funil</th>
                                <th className="py-8 px-10 text-right">Ações Táticas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredLeads.map((l: any, i: number) => {
                                const inQueue = isInQueue(l.whatsapp);
                                const currentStatus = l.status || 'Novo';
                                const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['Novo'];
                                const StatusIcon = config.icon;

                                return (
                                    <tr key={i} className="hover:bg-white/[0.01] transition-all group">
                                        <td className="py-8 px-10">
                                            <div className="font-extrabold text-white text-lg group-hover:text-cyan-400 transition-colors uppercase tracking-tight italic">{l.name}</div>
                                            <div className="flex gap-2 mt-2.5">
                                                <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-white/20 font-black uppercase text-[8px] tracking-widest">{l.category || 'Geral'}</span>
                                                <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-white/20 font-black uppercase text-[8px] tracking-widest">{l.source?.split(' em ').pop() || 'Global'}</span>
                                            </div>
                                        </td>
                                        <td className="py-8 px-10">
                                            <div className="space-y-2">
                                                <div className="text-green-400 font-mono font-bold text-xs flex items-center gap-2">
                                                    <MessageCircle size={14} /> {l.whatsapp}
                                                </div>
                                                {l.instagram && l.instagram !== 'Não Listado' && (
                                                    <div className="text-pink-400 font-mono font-bold text-xs flex items-center gap-2">
                                                        <Instagram size={14} /> {l.instagram}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-8 px-10">
                                            <div className="relative group/status flex items-center gap-3">
                                                <div className={`px-4 py-2 rounded-xl flex items-center gap-2.5 ${config.bg} ${config.border} border ${config.color} text-[9px] font-black uppercase tracking-widest transition-all cursor-default`}>
                                                    <StatusIcon size={14} /> {currentStatus}
                                                </div>
                                                <div className="flex gap-1.5 opacity-0 group-hover/status:opacity-100 transition-all">
                                                    {Object.keys(STATUS_CONFIG).map(s => s !== currentStatus && (
                                                        <button
                                                            key={s}
                                                            onClick={() => updateStatus(l.id, s)}
                                                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/20 hover:text-white transition-all shadow-xl"
                                                            title={`Mudar para ${s}`}
                                                        >
                                                            {(() => { const Icon = STATUS_CONFIG[s].icon; return <Icon size={14} />; })()}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-8 px-10 text-right">
                                            <div className="flex justify-end gap-3 opacity-20 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => inQueue ? onRemove(l.whatsapp) : onQueue(l)}
                                                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${inQueue ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-white/5 text-white/40 border-white/10 hover:bg-cyan-500 hover:text-black hover:border-cyan-500'}`}
                                                >
                                                    {inQueue ? <MinusCircle size={22} /> : <PlusCircle size={22} />}
                                                </button>
                                                <a href={`https://wa.me/${l.whatsapp}`} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-green-500 hover:text-white transition-all">
                                                    <ExternalLink size={20} />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
