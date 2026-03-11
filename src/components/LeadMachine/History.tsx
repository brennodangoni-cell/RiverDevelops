import { useState, useEffect, useRef } from 'react';
import {
    Search, MapPin, Instagram, PlusCircle, MinusCircle,
    ChevronDown, Check, Globe, Tag,
    TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { WhatsAppIcon } from './WhatsAppIcon';

const STATUS_OPTIONS = [
    { value: 'Pendente', label: 'Pendente', color: 'text-amber-500' },
    { value: 'Chamado', label: 'Contatado', color: 'text-cyan-500' },
    { value: 'Negociando', label: 'Negociando', color: 'text-purple-500' },
    { value: 'Fechado', label: 'Convertidos', color: 'text-green-500' },
];

const FilterSelect = ({ icon: Icon, value, options, onChange, placeholder }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find((opt: any) => opt.value === value);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all min-w-[180px] justify-between group"
            >
                <div className="flex items-center gap-3">
                    <Icon size={14} className="text-cyan-500" />
                    <span className="truncate max-w-[120px]">{selectedOption ? selectedOption.label : placeholder}</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 w-full bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden py-2"
                    >
                        {options.map((opt: any) => (
                            <button
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className="w-full px-6 py-3 text-[10px] font-black uppercase tracking-widest text-left hover:bg-white/5 transition-colors flex items-center justify-between group"
                            >
                                <span className={opt.value === value ? 'text-cyan-400' : 'text-white/40 group-hover:text-white'}>{opt.label}</span>
                                {opt.value === value && <Check size={12} className="text-cyan-400" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export function History({ onQueue, queue, onRemove }: { onQueue: (l: any) => void; queue: any[]; onRemove: (num: string) => void }) {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        category: 'todos',
        status: 'todos'
    });

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const res = await axios.get('/api/history');
            setLeads(Array.isArray(res.data) ? res.data : (res.data?.leads || []));
        } catch (err) {
            toast.error("Erro ao carregar banco de leads");
        } finally {
            setLoading(false);
        }
    };

    const updateLeadStatus = async (id: string, newStatus: string) => {
        try {
            await axios.patch(`/api/leads/${id}/status`, { status: newStatus });
            setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
            toast.success("Status atualizado");
        } catch (err) {
            toast.error("Erro ao atualizar status");
        }
    };

    const categories = ['todos', ...Array.from(new Set(leads.map(l => l.category).filter(Boolean)))];
    const categoryOptions = categories.map(cat => ({ value: cat, label: cat === 'todos' ? 'Categorias' : cat }));
    const statusOptions = [{ value: 'todos', label: 'Status' }, ...STATUS_OPTIONS];

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
            lead.whatsapp?.includes(filters.search);
        const matchesCategory = filters.category === 'todos' || lead.category === filters.category;
        const matchesStatus = filters.status === 'todos' || lead.status === filters.status;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-32">
            {/* Neural Control Strip */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="flex flex-col xl:flex-row gap-6 items-center">
                    <div className="relative flex-1 group w-full">
                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                            <Search className="text-white/20 group-focus-within:text-cyan-500 transition-colors" size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Pesquisar por nome ou WhatsApp na matriz..."
                            className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-5 pl-16 pr-8 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/30 transition-all placeholder:text-white/10 placeholder:uppercase placeholder:tracking-widest"
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                        <FilterSelect
                            icon={Tag}
                            value={filters.category}
                            options={categoryOptions}
                            onChange={(val: string) => setFilters({ ...filters, category: val })}
                            placeholder="Categoria"
                        />
                        <FilterSelect
                            icon={Activity}
                            value={filters.status}
                            options={statusOptions}
                            onChange={(val: string) => setFilters({ ...filters, status: val })}
                            placeholder="Status"
                        />
                        <div className="h-10 w-px bg-white/5 mx-2 hidden xl:block" />
                        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10">
                            <TrendingUp size={16} className="text-cyan-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Market Density:</span>
                            <span className="text-xs font-black text-white">{filteredLeads.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Matrix Grid */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="pb-8 overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-10 py-8 text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Identidade</th>
                                <th className="px-10 py-8 text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Localização</th>
                                <th className="px-10 py-8 text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Mídias</th>
                                <th className="px-10 py-8 text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Status</th>
                                <th className="px-10 py-8 text-[10px] font-black text-white/20 uppercase tracking-[0.4em] text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center text-white/10 font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando Leads...</td>
                                </tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center text-white/10 font-black uppercase tracking-[0.4em]">Nenhum lead detectado na matriz</td>
                                </tr>
                            ) : filteredLeads.map((lead, idx) => {
                                const inQueue = queue.some(l => l.whatsapp === lead.whatsapp);
                                const statusColor = STATUS_OPTIONS.find(s => s.value === lead.status)?.color || 'text-white/20';

                                return (
                                    <motion.tr
                                        key={lead.id || idx}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.02 }}
                                        className="group hover:bg-white/[0.01] transition-all"
                                    >
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-black text-white uppercase italic tracking-tighter group-hover:text-cyan-400 transition-colors">{lead.name}</span>
                                                <span className="text-[10px] font-bold text-white/30 tracking-[0.2em]">{lead.whatsapp}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-start gap-3 text-white/30 max-w-[250px]">
                                                <MapPin size={14} className="mt-1 shrink-0" />
                                                <span className="text-[10px] font-black uppercase leading-relaxed tracking-widest">{lead.city}, {lead.state}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-3">
                                                <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-[#25D366]/10 hover:border-[#25D366]/20 transition-all group/wa">
                                                    <WhatsAppIcon size={14} className="text-white/20 group-hover/wa:text-[#25D366]" />
                                                </a>
                                                {lead.instagram && (
                                                    <a href={`https://instagram.com/${lead.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-pink-500/10 hover:border-pink-500/20 transition-all text-white/20 hover:text-pink-500">
                                                        <Instagram size={14} />
                                                    </a>
                                                )}
                                                {lead.website && (
                                                    <a href={lead.website} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all text-white/20 hover:text-cyan-400">
                                                        <Globe size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <select
                                                value={lead.status || 'Pendente'}
                                                onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                                                className={`bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-[0.2em] focus:ring-0 ${statusColor} cursor-pointer hover:brightness-125 transition-all`}
                                            >
                                                {STATUS_OPTIONS.map(s => (
                                                    <option key={s.value} value={s.value} className="bg-[#0A0A0A] text-white">{s.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <button
                                                onClick={() => inQueue ? onRemove(lead.whatsapp) : onQueue(lead)}
                                                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${inQueue ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-white text-black hover:bg-cyan-400'}`}
                                            >
                                                {inQueue ? <><MinusCircle size={14} /> Remover</> : <><PlusCircle size={14} /> Fila</>}
                                            </button>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function Activity({ className, size }: { className?: string, size?: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 24}
            height={size || 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}
