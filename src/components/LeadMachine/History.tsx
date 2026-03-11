import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Instagram, ChevronDown, Check, Globe, Trash2, CheckSquare } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { WhatsAppIcon } from './WhatsAppIcon';

const STATUS_OPTIONS = [
    { value: 'Pendente', label: 'Pendente', dot: 'bg-amber-400', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { value: 'Chamado', label: 'Contatado', dot: 'bg-cyan-400', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    { value: 'Negociando', label: 'Negociando', dot: 'bg-purple-400', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { value: 'Fechado', label: 'Convertido', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
];

/* ── Status Badge (fixed position - abre por fora) ── */
function StatusBadge({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const current = STATUS_OPTIONS.find(s => s.value === value) || STATUS_OPTIONS[0];

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (btnRef.current?.contains(e.target as Node)) return;
            if (menuRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const handleToggle = () => {
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 4, left: rect.left });
        }
        setOpen(!open);
    };

    return (
        <>
            <button ref={btnRef} onClick={handleToggle}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:brightness-125 ${current.bg}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
                {current.label}
                <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div ref={menuRef}
                    className="fixed w-44 bg-[#161616] border border-white/[0.08] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] z-[9999] py-1"
                    style={{ top: pos.top, left: pos.left }}>
                    {STATUS_OPTIONS.map(s => (
                        <button key={s.value} onClick={() => { onChange(s.value); setOpen(false); }}
                            className={`w-full px-4 py-2.5 text-xs text-left flex items-center gap-2.5 transition-colors ${s.value === value ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'}`}>
                            <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                            <span className={s.value === value ? 'text-white font-semibold' : 'text-white/50'}>{s.label}</span>
                            {s.value === value && <Check size={12} className="text-white/40 ml-auto" />}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}

/* ── Filter Dropdown ───────────────────────────────── */
function FilterDropdown({ value, options, onChange, placeholder }: {
    value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; placeholder: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); } };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

    const selected = options.find(o => o.value === value);
    const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
    const showSearch = options.length > 8;

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => { setOpen(!open); setQuery(''); }}
                className={`flex items-center gap-2 h-10 bg-[#111] border border-white/[0.06] rounded-xl px-4 text-xs font-medium transition-all hover:border-white/15 ${open ? 'border-cyan-500/30' : ''} ${value !== 'todos' ? 'text-cyan-400' : 'text-white/40'}`}>
                {selected ? selected.label : placeholder}
                <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-[#161616] border border-white/[0.08] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] z-[100] overflow-hidden">
                    {showSearch && (
                        <div className="p-2 border-b border-white/[0.04]">
                            <input ref={inputRef} type="text" placeholder="Digitar para buscar..."
                                className="w-full bg-white/[0.04] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 border-none focus:outline-none"
                                value={query} onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const first = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))[0];
                                        if (first) { onChange(first.value); setOpen(false); setQuery(''); }
                                    }
                                }} />
                        </div>
                    )}
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar py-1">
                        {filtered.map(opt => (
                            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                                className={`w-full px-4 py-2.5 text-xs text-left transition-colors flex items-center justify-between ${opt.value === value ? 'text-cyan-400 bg-cyan-500/5 font-semibold' : 'text-white/50 hover:bg-white/[0.03] hover:text-white'}`}>
                                {opt.label}
                                {opt.value === value && <Check size={12} className="text-cyan-400" />}
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div className="px-4 py-6 text-center text-white/20 text-xs">Sem resultados</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Componente Principal ─────────────────────────── */
export function History() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', category: 'todos', status: 'todos', state: 'todos', city: 'todos' });
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);
    const [selectMode, setSelectMode] = useState(false);

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

    const deleteLead = async (id: string) => {
        if (!confirm('Excluir este lead permanentemente?')) return;
        try {
            await axios.delete(`/api/leads/${id}`);
            setLeads(leads.filter(l => l.id !== id));
            setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
            toast.success("Lead excluído");
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || "Erro desconhecido";
            toast.error(`Erro ao excluir: ${msg}`);
        }
    };

    const deleteSelected = async () => {
        if (!confirm(`Excluir ${selected.size} leads permanentemente?`)) return;
        setDeleting(true);
        let ok = 0;
        for (const id of selected) {
            try { await axios.delete(`/api/leads/${id}`); ok++; } catch { }
        }
        setLeads(prev => prev.filter(l => !selected.has(String(l.id))));
        setSelected(new Set());
        setDeleting(false);
        toast.success(`${ok} leads excluídos`);
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const toggleAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(l => String(l.id))));
        }
    };

    const categories = ['todos', ...Array.from(new Set(leads.map(l => l.category).filter(Boolean)))];
    const states = ['todos', ...Array.from(new Set(leads.map(l => l.state).filter(Boolean))).sort()];
    const citiesForState = filters.state === 'todos'
        ? ['todos', ...Array.from(new Set(leads.map(l => l.city).filter(Boolean))).sort()]
        : ['todos', ...Array.from(new Set(leads.filter(l => l.state === filters.state).map(l => l.city).filter(Boolean))).sort()];

    const categoryOpts = categories.map(c => ({ value: c, label: c === 'todos' ? 'Todas categorias' : c }));
    const statusOpts = [{ value: 'todos', label: 'Todos status' }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))];
    const stateOpts = states.map(s => ({ value: s, label: s === 'todos' ? 'Todos estados' : s }));
    const cityOpts = citiesForState.map(c => ({ value: c, label: c === 'todos' ? 'Todas cidades' : c }));

    const filtered = leads.filter(lead => {
        const s = filters.search.toLowerCase();
        const matchSearch = !s || lead.name?.toLowerCase().includes(s) || lead.whatsapp?.includes(s);
        const matchCat = filters.category === 'todos' || lead.category === filters.category;
        const matchStatus = filters.status === 'todos' || lead.status === filters.status;
        const matchState = filters.state === 'todos' || lead.state === filters.state;
        const matchCity = filters.city === 'todos' || lead.city === filters.city;
        return matchSearch && matchCat && matchStatus && matchState && matchCity;
    });

    return (
        <div className="space-y-6">
            {/* Filtros */}
            <div className="bg-[#131313] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex flex-col gap-3">
                    <div className="relative w-full">
                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/15" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            className="w-full h-10 bg-[#111] border border-white/[0.06] rounded-xl pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/15 transition-all"
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <FilterDropdown value={filters.category} options={categoryOpts} onChange={v => setFilters({ ...filters, category: v })} placeholder="Categoria" />
                        <FilterDropdown value={filters.state} options={stateOpts} onChange={v => setFilters({ ...filters, state: v, city: 'todos' })} placeholder="Estado" />
                        <FilterDropdown value={filters.city} options={cityOpts} onChange={v => setFilters({ ...filters, city: v })} placeholder="Cidade" />
                        <FilterDropdown value={filters.status} options={statusOpts} onChange={v => setFilters({ ...filters, status: v })} placeholder="Status" />
                        <span className="text-xs text-white/25 px-2 ml-auto">{filtered.length} leads</span>
                        <button onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelected(new Set()); }}
                            className={`h-9 px-4 rounded-xl text-xs font-medium flex items-center gap-2 transition-all border ${selectMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/60 hover:border-white/10'}`}>
                            <CheckSquare size={13} /> {selectMode ? 'Cancelar' : 'Selecionar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="bg-[#131313] border border-white/[0.06] rounded-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[850px]">
                        <thead className="border-b border-white/[0.04]">
                            <tr>
                                {selectMode && (
                                    <th className="pl-5 pr-2 py-3.5 w-12">
                                        <button onClick={toggleAll}
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${filtered.length > 0 && selected.size === filtered.length ? 'bg-cyan-500 border-cyan-500' : 'border-white/15 hover:border-white/30'}`}>
                                            {filtered.length > 0 && selected.size === filtered.length && <Check size={12} className="text-black" />}
                                        </button>
                                    </th>
                                )}
                                <th className="px-4 py-3.5 text-[11px] font-medium text-white/25 uppercase tracking-wider">Nome</th>
                                <th className="px-4 py-3.5 text-[11px] font-medium text-white/25 uppercase tracking-wider">Local</th>
                                <th className="px-4 py-3.5 text-[11px] font-medium text-white/25 uppercase tracking-wider">Categoria</th>
                                <th className="px-4 py-3.5 text-[11px] font-medium text-white/25 uppercase tracking-wider">Contato</th>
                                <th className="px-4 py-3.5 text-[11px] font-medium text-white/25 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3.5 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {loading ? (
                                <tr><td colSpan={7} className="py-20 text-center text-white/20 text-sm">Carregando...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="py-20 text-center text-white/20 text-sm">Nenhum lead encontrado</td></tr>
                            ) : filtered.map((lead, idx) => {
                                const location = [lead.city, lead.state].filter(Boolean).join(', ') || lead.address || '—';
                                return (
                                    <tr key={lead.id || idx} className={`transition-colors ${selected.has(String(lead.id)) ? 'bg-cyan-500/[0.04]' : 'hover:bg-white/[0.015]'}`}>
                                        {selectMode && (
                                            <td className="pl-5 pr-2 py-4">
                                                <button onClick={() => toggleSelect(String(lead.id))}
                                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selected.has(String(lead.id)) ? 'bg-cyan-500 border-cyan-500' : 'border-white/15 hover:border-white/30'}`}>
                                                    {selected.has(String(lead.id)) && <Check size={12} className="text-black" />}
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-medium text-white">{lead.name}</div>
                                            <div className="text-[11px] text-white/25 mt-0.5">{lead.whatsapp}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-white/35 text-xs max-w-[180px]">
                                                <MapPin size={12} className="shrink-0" />
                                                <span className="truncate">{location}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.category ? (() => {
                                                const colors = [
                                                    'bg-cyan-500/10 text-cyan-400', 'bg-emerald-500/10 text-emerald-400',
                                                    'bg-pink-500/10 text-pink-400', 'bg-amber-500/10 text-amber-400',
                                                    'bg-purple-500/10 text-purple-400', 'bg-blue-500/10 text-blue-400',
                                                    'bg-red-500/10 text-red-400', 'bg-teal-500/10 text-teal-400',
                                                ];
                                                let h = 0;
                                                for (let i = 0; i < lead.category.length; i++) h = lead.category.charCodeAt(i) + ((h << 5) - h);
                                                const c = colors[Math.abs(h) % colors.length];
                                                return <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-medium ${c}`}>{lead.category}</span>;
                                            })() : (
                                                <span className="text-white/15 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <a href={`https://wa.me/${lead.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                                    className="w-8 h-8 rounded-lg bg-[#25D366]/10 border border-[#25D366]/15 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/20 transition-all">
                                                    <WhatsAppIcon size={13} />
                                                </a>
                                                {lead.instagram && (
                                                    <a href={`https://instagram.com/${lead.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"
                                                        className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/15 flex items-center justify-center text-pink-400 hover:bg-pink-500/20 transition-all">
                                                        <Instagram size={13} />
                                                    </a>
                                                )}
                                                {lead.website && (
                                                    <a href={lead.website} target="_blank" rel="noreferrer"
                                                        className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all">
                                                        <Globe size={13} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge
                                                value={lead.status || 'Pendente'}
                                                onChange={(v) => updateStatus(lead.id, v)}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <button onClick={() => deleteLead(lead.id)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Barra de ação bulk */}
            {selected.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#161616] border border-white/[0.08] rounded-2xl px-6 py-3 flex items-center gap-4 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                    <span className="text-sm text-white font-medium">{selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>
                    <button onClick={() => setSelected(new Set())} className="text-xs text-white/40 hover:text-white transition-colors">Limpar</button>
                    <button onClick={deleteSelected} disabled={deleting}
                        className="h-9 px-5 bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-red-400 transition-all disabled:opacity-50">
                        <Trash2 size={13} /> {deleting ? 'Excluindo...' : 'Excluir'}
                    </button>
                </div>
            )}
        </div>
    );
}
