import { useState, useEffect, useRef } from 'react';
import { Database, Clock, Instagram, Search, PlusCircle, MinusCircle, ExternalLink, CheckCircle2, AlertCircle, XCircle, ChevronDown, Check, Filter, Tag, MapPin, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

// Ícone do WhatsApp Premium Customizado
const WhatsAppIcon = ({ size = 18, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.3 8.38 8.38 0 0 1 3.8.9l5.7-1.1-1.1 5.7Z" />
        <path d="M11 11a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
    </svg>
);

const STATUS_CONFIG: any = {
    'Novo': { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: AlertCircle },
    'Em Negociação': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
    'Fechado': { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 },
    'Perdido': { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle },
};

function CustomSelect({ label, value, options, onChange, icon: Icon }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<any>(null);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative flex-1" ref={ref}>
            <label className="block text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-3 ml-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-left flex items-center justify-between group transition-all duration-300 ${isOpen ? 'border-cyan-500/50 ring-4 ring-cyan-500/5 hover:bg-white/[0.05]' : 'hover:border-white/10 hover:bg-white/[0.02]'}`}
            >
                <div className="flex items-center gap-4">
                    <Icon size={16} className={`transition-colors ${isOpen ? 'text-cyan-400' : 'text-white/20'}`} />
                    <span className="text-xs font-bold text-white/70 truncate">{value || 'Todas'}</span>
                </div>
                <ChevronDown size={14} className={`text-white/10 transition-transform duration-500 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.9)] overflow-hidden backdrop-blur-3xl"
                    >
                        <div className="max-h-72 overflow-y-auto custom-scrollbar p-3 space-y-1">
                            {options.map((opt: string) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => { onChange(opt); setIsOpen(false); }}
                                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${opt === value ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <span className="truncate">{opt}</span>
                                    {opt === value && <Check size={14} />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

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
            toast.success(`Pipeline: ${newStatus}`);
            setData((prev: any) => ({
                ...prev,
                leads: prev.leads.map((l: any) => l.id === id ? { ...l, status: newStatus } : l)
            }));
        } catch (e) {
            toast.error("Erro no Pipeline");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-64 space-y-10">
            <div className="relative">
                <div className="w-24 h-24 rounded-full border-t-2 border-cyan-500 animate-spin" />
                <Database size={32} className="absolute inset-0 m-auto text-cyan-400 animate-pulse" />
            </div>
            <div className="text-white/20 font-black font-mono text-xs tracking-[1em] uppercase ml-4">Decrypting Data Lake...</div>
        </div>
    );

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
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-5 duration-1000 pb-40">
            {/* Lead Intelligence Hub Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {[
                    { label: 'Deep Data Lake', val: data.leads.length, color: 'cyan', icon: Database, desc: 'Alvos interceptados' },
                    { label: 'Conversão Real', val: data.leads.filter((l: any) => l.status === 'Fechado').length, color: 'green', icon: CheckCircle2, desc: 'Negócios finalizados' },
                    { label: 'Funil Ativo', val: data.leads.filter((l: any) => l.status === 'Em Negociação').length, color: 'amber', icon: Clock, desc: 'Leads em aquecimento' }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-[#050505] p-12 rounded-[4rem] border border-white/5 shadow-2xl flex flex-col gap-10 hover:border-white/10 hover:bg-white/[0.01] transition-all group relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-48 h-48 bg-${kpi.color}-500 opacity-[0.02] blur-[80px] group-hover:opacity-[0.05] transition-opacity`} />
                        <div className="flex justify-between items-start">
                            <div className={`w-20 h-20 rounded-[2.5rem] bg-${kpi.color}-500/10 flex items-center justify-center text-${kpi.color}-400 border border-${kpi.color}-500/20 group-hover:scale-110 transition-transform duration-500 shadow-lg`}>
                                <kpi.icon size={36} strokeWidth={1.5} />
                            </div>
                            <div className="text-right">
                                <p className="text-white/20 text-[10px] uppercase tracking-[0.4em] font-black mb-2">{kpi.label}</p>
                                <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{kpi.desc}</p>
                            </div>
                        </div>
                        <h2 className="text-7xl font-black tracking-tighter text-white italic leading-none">{kpi.val}</h2>
                    </div>
                ))}
            </div>

            {/* Tactical Control Center */}
            <div className="relative">
                {/* Filters Board - NO OVERFLOW HIDDEN HERE to allow dropdowns */}
                <div className="bg-[#050505] rounded-[4.5rem] border border-white/10 shadow-[0_60px_120px_rgba(0,0,0,0.9)] relative z-50">
                    <div className="p-16 lg:p-24 pb-12">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-16 mb-20">
                            <div>
                                <h3 className="font-black text-6xl text-white uppercase tracking-tighter italic leading-none">Dossiê de Alvos</h3>
                                <div className="flex items-center gap-6 mt-8">
                                    <div className="h-0.5 w-24 bg-cyan-500/40" />
                                    <p className="text-white/20 text-[11px] font-black uppercase tracking-[0.6em]">Comando River Tactical</p>
                                </div>
                            </div>
                            <div className="relative w-full lg:w-[550px] group/search">
                                <Search size={22} className="absolute left-8 top-1/2 -translate-y-1/2 text-white/10 group-hover/search:text-cyan-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Interceptar nome, fone ou origem..."
                                    value={filter}
                                    onChange={e => setFilter(e.target.value)}
                                    className="bg-black/40 border border-white/5 rounded-[2.5rem] py-8 pl-20 pr-10 text-base font-bold text-white focus:outline-none focus:ring-4 ring-cyan-500/5 w-full transition-all hover:bg-white/[0.04] hover:border-white/10"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                            <CustomSelect label="Filtrar Nicho" value={categoryFilter} options={categories} onChange={setCategoryFilter} icon={Tag} />
                            <CustomSelect label="Filtrar Estado" value={stateFilter} options={states} onChange={setStateFilter} icon={MapPin} />
                            <CustomSelect label="Filtrar Cidade" value={cityFilter} options={cities} onChange={setCityFilter} icon={Globe} />
                            <CustomSelect label="Filtrar Pipeline" value={statusFilter} options={statuses} onChange={setStatusFilter} icon={Filter} />
                        </div>
                    </div>

                    {/* Table Container - WITH OVERFLOW HIDDEN AND ROUNDED BOTTOM */}
                    <div className="mt-12 overflow-hidden rounded-b-[4.5rem] border-t border-white/5 bg-black/40 backdrop-blur-3xl">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[1300px]">
                                <thead>
                                    <tr className="border-b border-white/10 text-white/15 text-[11px] uppercase tracking-[0.5em] font-black italic bg-white/[0.01]">
                                        <th className="py-14 px-16">Identificação Tática</th>
                                        <th className="py-14 px-16">Matriz de Contatos</th>
                                        <th className="py-14 px-16">Status do Pipeline</th>
                                        <th className="py-14 px-16 text-right">Comando Operacional</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {filteredLeads.map((l: any, i: number) => {
                                        const inQueue = isInQueue(l.whatsapp);
                                        const config = STATUS_CONFIG[l.status || 'Novo'] || STATUS_CONFIG['Novo'];
                                        const StatusIcon = config.icon;

                                        return (
                                            <tr key={i} className="hover:bg-white/[0.03] transition-all group border-b border-transparent">
                                                <td className="py-14 px-16">
                                                    <div className="font-black text-white text-2xl group-hover:text-cyan-400 transition-colors uppercase tracking-tight italic leading-tight mb-4">{l.name}</div>
                                                    <div className="flex gap-4">
                                                        <span className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-white/40 font-black uppercase text-[9px] tracking-[0.2em]">{l.category || 'Geral'}</span>
                                                        <span className="px-5 py-2.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-400/60 font-black uppercase text-[9px] tracking-[0.2em]">{l.source?.split(' em ').pop() || 'Global'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-14 px-16">
                                                    <div className="space-y-6">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shadow-lg shadow-green-500/5"><WhatsAppIcon size={22} /></div>
                                                            <div className="font-mono font-black text-base text-white/80 tracking-tight">{l.whatsapp}</div>
                                                        </div>
                                                        {l.instagram && l.instagram !== 'Não Listado' && (
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500 shadow-lg shadow-pink-500/5"><Instagram size={22} /></div>
                                                                <div className="font-mono font-black text-sm text-white/60 tracking-tight">{l.instagram}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-14 px-16">
                                                    <div className="flex flex-col gap-6">
                                                        <div className={`w-fit px-8 py-4 rounded-[2rem] flex items-center gap-5 ${config.bg} ${config.border} border ${config.color} shadow-2xl transition-all group/status`}>
                                                            <StatusIcon size={20} strokeWidth={2.5} className="animate-pulse" />
                                                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">{l.status || 'Novo'}</span>
                                                        </div>
                                                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                                                            {Object.keys(STATUS_CONFIG).map(s => s !== (l.status || 'Novo') && (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => updateStatus(l.id, s)}
                                                                    className={`w-12 h-12 rounded-[1.2rem] bg-black border border-white/5 flex items-center justify-center transition-all hover:scale-110 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${STATUS_CONFIG[s].color} hover:border-white/20 hover:bg-white/5`}
                                                                    title={`Mover para ${s}`}
                                                                >
                                                                    {(() => { const Icon = STATUS_CONFIG[s].icon; return <Icon size={20} />; })()}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-14 px-16 text-right">
                                                    <div className="flex justify-end gap-5 items-center opacity-40 group-hover:opacity-100 transition-all duration-500">
                                                        <button
                                                            onClick={() => inQueue ? onRemove(l.whatsapp) : onQueue(l)}
                                                            className={`w-18 h-18 rounded-[2rem] border flex items-center justify-center transition-all duration-300 relative group/queue ${inQueue ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-white/5 text-white/30 border-white/5 hover:bg-cyan-500 hover:text-black hover:border-cyan-500 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)]'}`}
                                                        >
                                                            {inQueue ? <MinusCircle size={32} strokeWidth={2.5} /> : <PlusCircle size={32} strokeWidth={2.5} />}
                                                        </button>

                                                        <a
                                                            href={`https://wa.me/${l.whatsapp}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="w-18 h-18 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:bg-green-500 hover:text-white hover:border-green-500 hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] transition-all duration-300"
                                                        >
                                                            <ExternalLink size={30} strokeWidth={2} />
                                                        </a>

                                                        {(l.instagram && l.instagram !== 'Não Listado') && (
                                                            <a
                                                                href={`https://instagram.com/${l.instagram.replace('@', '')}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="w-18 h-18 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 hover:text-white hover:border-pink-500 hover:shadow-[0_0_40px_rgba(219,39,119,0.4)] transition-all duration-300"
                                                            >
                                                                <Instagram size={30} strokeWidth={2} />
                                                            </a>
                                                        )}
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
            </div>
        </div>
    );
}
