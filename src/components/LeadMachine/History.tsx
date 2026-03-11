import { useState, useEffect, useRef } from 'react';
import { Database, Clock, Instagram, Search, PlusCircle, MinusCircle, ExternalLink, CheckCircle2, AlertCircle, XCircle, ChevronDown, Check, Filter, Tag, MapPin, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

// Ícone do WhatsApp Premium Customizado
const WhatsAppIcon = ({ size = 18, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
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
            <label className="block text-[9px] uppercase tracking-[0.3em] font-black text-white/20 mb-2.5 ml-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#080808] border border-white/5 rounded-2xl px-5 py-4 text-left flex items-center justify-between group hover:border-cyan-500/30 transition-all"
            >
                <div className="flex items-center gap-3">
                    <Icon size={16} className="text-white/10 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-xs font-bold text-white/70 truncate">
                        {value || 'Todas'}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-white/10 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-2xl"
                    >
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {options.map((opt: string) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => { onChange(opt); setIsOpen(false); }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-[11px] font-black uppercase tracking-widest transition-all ${opt === value ? 'bg-cyan-500 text-black' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <span className="truncate">{opt}</span>
                                    {opt === value && <Check size={12} />}
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
            toast.success(`Status: ${newStatus}`);
            setData((prev: any) => ({
                ...prev,
                leads: prev.leads.map((l: any) => l.id === id ? { ...l, status: newStatus } : l)
            }));
        } catch (e) {
            toast.error("Erro ao atualizar");
        }
    };

    if (loading) return <div className="text-white/40 animate-pulse text-center py-32 font-black font-mono text-[10px] tracking-[0.5em] uppercase">Mapeando Satélites de Dados...</div>;

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
        <div className="space-y-12 animate-in fade-in duration-700 pb-32">
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'Leads Totais', val: data.leads.length, color: 'cyan', icon: Database },
                    { label: 'Fechamentos', val: data.leads.filter((l: any) => l.status === 'Fechado').length, color: 'green', icon: CheckCircle2 },
                    { label: 'Negociações', val: data.leads.filter((l: any) => l.status === 'Em Negociação').length, color: 'amber', icon: Clock }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-[#050505] p-10 rounded-[3rem] border border-white/5 shadow-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                        <div>
                            <p className="text-white/20 text-[9px] uppercase tracking-[0.4em] font-black mb-3">{kpi.label}</p>
                            <h2 className="text-5xl font-black tracking-tighter text-white italic">{kpi.val}</h2>
                        </div>
                        <div className={`w-16 h-16 rounded-[1.5rem] bg-${kpi.color}-500/5 flex items-center justify-center text-${kpi.color}-400 border border-${kpi.color}-500/10 group-hover:scale-110 transition-transform`}><kpi.icon size={28} /></div>
                    </div>
                ))}
            </div>

            {/* Filter Hub */}
            <div className="bg-[#050505] rounded-[3.5rem] border border-white/10 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12">
                    <Database size={300} className="text-cyan-500" />
                </div>

                <div className="p-12 lg:p-16 relative z-10 border-b border-white/5">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12 mb-16">
                        <div>
                            <h3 className="font-black text-4xl lg:text-5xl text-white uppercase tracking-tighter italic leading-none">Dossiê Estratégico</h3>
                            <div className="flex items-center gap-3 mt-4 ml-1">
                                <div className="h-0.5 w-12 bg-cyan-500/30" />
                                <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em]">Inteligência Comercial River</p>
                            </div>
                        </div>
                        <div className="relative w-full lg:w-[450px]">
                            <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" />
                            <input
                                type="text"
                                placeholder="Interceptação de dados..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className="bg-black border border-white/5 rounded-3xl py-6 pl-16 pr-8 text-sm font-bold text-white focus:outline-none focus:ring-2 ring-cyan-500/20 w-full transition-all hover:bg-white/[0.02]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <CustomSelect label="Nicho / Atividade" value={categoryFilter} options={categories} onChange={setCategoryFilter} icon={Tag} />
                        <CustomSelect label="Estado (UF)" value={stateFilter} options={states} onChange={setStateFilter} icon={MapPin} />
                        <CustomSelect label="Cidade Base" value={cityFilter} options={cities} onChange={setCityFilter} icon={Globe} />
                        <CustomSelect label="Funil de Vendas" value={statusFilter} options={statuses} onChange={setStatusFilter} icon={Filter} />
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar bg-black/40">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="border-b border-white/5 text-white/10 text-[10px] uppercase tracking-[0.4em] font-black italic">
                                <th className="py-10 px-12">Alvo / Identidade</th>
                                <th className="py-10 px-12">Canais de Contato</th>
                                <th className="py-10 px-12">Ciclo de Vida</th>
                                <th className="py-10 px-12 text-right">Ações de Campo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {filteredLeads.map((l: any, i: number) => {
                                const inQueue = isInQueue(l.whatsapp);
                                const config = STATUS_CONFIG[l.status || 'Novo'] || STATUS_CONFIG['Novo'];
                                const StatusIcon = config.icon;

                                return (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-all group border-b border-transparent hover:border-cyan-500/5">
                                        <td className="py-10 px-12">
                                            <div className="font-black text-white text-xl group-hover:text-cyan-400 transition-colors uppercase tracking-tight italic">{l.name}</div>
                                            <div className="flex gap-3 mt-3.5">
                                                <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-white/20 font-black uppercase text-[8px] tracking-widest">{l.category || 'Geral'}</span>
                                                <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-white/20 font-black uppercase text-[8px] tracking-widest">{l.source?.split(' em ').pop() || 'Global'}</span>
                                            </div>
                                        </td>
                                        <td className="py-10 px-12">
                                            <div className="space-y-4">
                                                <div className="text-green-500 font-mono font-black text-sm flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center"><WhatsAppIcon size={18} /></div>
                                                    {l.whatsapp}
                                                </div>
                                                {l.instagram && l.instagram !== 'Não Listado' && (
                                                    <div className="text-pink-500 font-mono font-black text-xs flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center"><Instagram size={18} /></div>
                                                        {l.instagram}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-10 px-12">
                                            <div className="flex flex-col gap-4">
                                                <div className={`w-fit px-5 py-2.5 rounded-2xl flex items-center gap-3 ${config.bg} ${config.border} border ${config.color} text-[10px] font-black uppercase tracking-[0.2em] shadow-lg`}>
                                                    <StatusIcon size={16} /> {l.status || 'Novo'}
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    {Object.keys(STATUS_CONFIG).map(s => s !== (l.status || 'Novo') && (
                                                        <button
                                                            key={s}
                                                            onClick={() => updateStatus(l.id, s)}
                                                            className={`w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:scale-110 shadow-xl ${STATUS_CONFIG[s].color} hover:bg-white/10`}
                                                            title={`Mover para ${s}`}
                                                        >
                                                            {(() => { const Icon = STATUS_CONFIG[s].icon; return <Icon size={16} />; })()}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-10 px-12 text-right">
                                            <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-all items-center">
                                                <button
                                                    onClick={() => inQueue ? onRemove(l.whatsapp) : onQueue(l)}
                                                    className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all ${inQueue ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-white/5 text-white/30 border-white/5 hover:bg-cyan-500 hover:text-black hover:border-cyan-500'}`}
                                                >
                                                    {inQueue ? <MinusCircle size={24} /> : <PlusCircle size={24} />}
                                                </button>

                                                <a
                                                    href={`https://wa.me/${l.whatsapp}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/30 hover:bg-green-500 hover:text-white hover:border-green-500 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-all"
                                                >
                                                    <ExternalLink size={22} />
                                                </a>

                                                {(l.instagram && l.instagram !== 'Não Listado') && (
                                                    <a
                                                        href={`https://instagram.com/${l.instagram.replace('@', '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/30 hover:bg-pink-600 hover:text-white hover:border-pink-500 hover:shadow-[0_0_30px_rgba(219,39,119,0.3)] transition-all"
                                                    >
                                                        <Instagram size={22} />
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
    );
}
