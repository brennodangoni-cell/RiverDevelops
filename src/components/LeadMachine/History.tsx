import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Instagram, PlusCircle, MinusCircle, ChevronDown, Check, Globe, TrendingUp } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { WhatsAppIcon } from './WhatsAppIcon';

const STATUS_OPTIONS = [
    { value: 'Pendente', label: 'Pendente', color: 'text-amber-400 bg-amber-500/10' },
    { value: 'Chamado', label: 'Contatado', color: 'text-cyan-400 bg-cyan-500/10' },
    { value: 'Negociando', label: 'Negociando', color: 'text-purple-400 bg-purple-500/10' },
    { value: 'Fechado', label: 'Convertido', color: 'text-emerald-400 bg-emerald-500/10' },
];

function FilterDropdown({ value, options, onChange, placeholder }: {
    value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; placeholder: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const selected = options.find(o => o.value === value);

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setOpen(!open)}
                className="flex items-center gap-2 bg-[#0e0e0e] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-medium text-white/50 hover:text-white hover:border-white/10 transition-all">
                {selected ? selected.label : placeholder}
                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button onClick={() => { onChange('todos'); setOpen(false); }}
                        className={`w-full px-4 py-2.5 text-xs text-left hover:bg-white/5 transition-colors ${value === 'todos' ? 'text-cyan-400 font-semibold' : 'text-white/50'}`}>
                        Todos
                    </button>
                    {options.filter(o => o.value !== 'todos').map(opt => (
                        <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`w-full px-4 py-2.5 text-xs text-left hover:bg-white/5 transition-colors flex items-center justify-between ${opt.value === value ? 'text-cyan-400 font-semibold' : 'text-white/50'}`}>
                            {opt.label}
                            {opt.value === value && <Check size={12} className="text-cyan-400" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function History({ onQueue, queue, onRemove }: { onQueue: (l: any) => void; queue: any[]; onRemove: (num: string) => void }) {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', category: 'todos', status: 'todos' });

    useEffect(() => { fetchLeads(); }, []);

    const fetchLeads = async () => {
        try {
            const res = await axios.get('/api/history');
            setLeads(Array.isArray(res.data) ? res.data : (res.data?.leads || []));
        } catch { toast.error("Erro ao carregar leads"); }
        finally { setLoading(false); }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await axios.patch(`/api/leads/${id}/status`, { status });
            setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
            toast.success("Status atualizado");
        } catch { toast.error("Erro ao atualizar"); }
    };

    const categories = ['todos', ...Array.from(new Set(leads.map(l => l.category).filter(Boolean)))];
    const categoryOptions = categories.map(c => ({ value: c, label: c === 'todos' ? 'Todas' : c }));
    const statusOptions = [{ value: 'todos', label: 'Todos' }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))];

    const filtered = leads.filter(lead => {
        const search = filters.search.toLowerCase();
        const matchSearch = !search || lead.name?.toLowerCase().includes(search) || lead.whatsapp?.includes(search);
        const matchCat = filters.category === 'todos' || lead.category === filters.category;
        const matchStatus = filters.status === 'todos' || lead.status === filters.status;
        return matchSearch && matchCat && matchStatus;
    });

    return (
        <div className="space-y-6">
            {/* Filtros */}
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou telefone..."
                        className="w-full bg-[#0e0e0e] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/10 transition-all"
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <FilterDropdown value={filters.category} options={categoryOptions} onChange={v => setFilters({ ...filters, category: v })} placeholder="Categoria" />
                    <FilterDropdown value={filters.status} options={statusOptions} onChange={v => setFilters({ ...filters, status: v })} placeholder="Status" />
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0e0e0e] border border-white/5 rounded-xl">
                        <TrendingUp size={14} className="text-cyan-400" />
                        <span className="text-xs font-bold text-white">{filtered.length}</span>
                        <span className="text-xs text-white/30">leads</span>
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="bg-[#141414] border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[900px]">
                        <thead className="border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-white/30">Nome</th>
                                <th className="px-6 py-4 text-xs font-semibold text-white/30">Local</th>
                                <th className="px-6 py-4 text-xs font-semibold text-white/30">Contato</th>
                                <th className="px-6 py-4 text-xs font-semibold text-white/30">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-white/30 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {loading ? (
                                <tr><td colSpan={5} className="py-16 text-center text-white/20 text-sm">Carregando...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="py-16 text-center text-white/20 text-sm">Nenhum lead encontrado</td></tr>
                            ) : filtered.map((lead, idx) => {
                                const inQueue = queue.some(l => l.whatsapp === lead.whatsapp);
                                const currentStatus = STATUS_OPTIONS.find(s => s.value === lead.status) || STATUS_OPTIONS[0];
                                return (
                                    <tr key={lead.id || idx} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-white">{lead.name}</div>
                                            <div className="text-[11px] text-white/30 mt-0.5">{lead.whatsapp}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-white/40 text-xs">
                                                <MapPin size={12} /> {lead.city}{lead.state ? `, ${lead.state}` : ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <a href={`https://wa.me/${lead.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-[#25D366]/10 transition-all text-white/30 hover:text-[#25D366]">
                                                    <WhatsAppIcon size={14} />
                                                </a>
                                                {lead.instagram && (
                                                    <a href={`https://instagram.com/${lead.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"
                                                        className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-pink-500/10 transition-all text-white/30 hover:text-pink-500">
                                                        <Instagram size={14} />
                                                    </a>
                                                )}
                                                {lead.website && (
                                                    <a href={lead.website} target="_blank" rel="noreferrer"
                                                        className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-blue-500/10 transition-all text-white/30 hover:text-blue-400">
                                                        <Globe size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={lead.status || 'Pendente'}
                                                onChange={e => updateStatus(lead.id, e.target.value)}
                                                className={`bg-transparent border border-white/5 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-0 focus:outline-none cursor-pointer ${currentStatus.color}`}
                                            >
                                                {STATUS_OPTIONS.map(s => (
                                                    <option key={s.value} value={s.value} className="bg-[#1a1a1a] text-white">{s.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => inQueue ? onRemove(lead.whatsapp) : onQueue(lead)}
                                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${inQueue ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-cyan-500 text-black hover:bg-cyan-400'}`}
                                            >
                                                {inQueue ? <><MinusCircle size={13} /> Remover</> : <><PlusCircle size={13} /> Fila</>}
                                            </button>
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
