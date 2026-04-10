import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, Instagram, Check, Globe, ChevronDown, X, Share2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { WhatsAppIcon } from './WhatsAppIcon';

interface Lead {
    name: string;
    whatsapp: string;
    phone?: string;
    address: string;
    website?: string;
    instagram?: string;
    category?: string;
    city?: string;
    state?: string;
    rating?: number;
}

const CATEGORIAS = [
    'Academia', 'Advogado', 'Agência de Marketing', 'Agência de Viagens', 'Arquiteto',
    'Auto Escola', 'Auto Peças', 'Barbearia', 'Cafeteria', 'Clínica de Estética',
    'Clínica Médica', 'Clínica Veterinária', 'Confeitaria', 'Construtora', 'Contador',
    'Dentista', 'Escola', 'Escola de Idiomas', 'Farmácia', 'Fisioterapeuta',
    'Floricultura', 'Fotógrafo', 'Hamburgueria', 'Hotel', 'Imobiliária',
    'Joalheria', 'Lavanderia', 'Loja de Calçados', 'Loja de Celular',
    'Loja de Informática', 'Loja de Materiais de Construção', 'Loja de Móveis',
    'Loja de Roupas', 'Nutricionista', 'Oficina Mecânica', 'Ótica', 'Padaria',
    'Papelaria', 'Pet Shop', 'Pizzaria', 'Pousada', 'Psicólogo', 'Restaurante',
    'Salão de Beleza', 'Sorveteria', 'Supermercado',
].sort();

/* ── Dropdown Pesquisável ───────────────────────────── */
function Dropdown({ label, value, options, onChange, disabled, loading: isLoading }: {
    label: string; value: string; options: string[]; onChange: (v: string) => void; disabled?: boolean; loading?: boolean;
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

    const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                disabled={disabled || isLoading}
                onClick={() => { if (!disabled && !isLoading) { setOpen(!open); setQuery(''); } }}
                className={`w-full flex items-center justify-between gap-2 h-12 bg-[#111] border border-white/[0.06] rounded-xl px-4 text-sm transition-all ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:border-white/15 cursor-pointer'} ${open ? 'border-cyan-500/30 ring-1 ring-cyan-500/10' : ''}`}
            >
                <span className={value ? 'text-white' : 'text-white/25'}>{isLoading ? 'Carregando...' : (value || label)}</span>
                {value && !disabled ? (
                    <X size={14} className="text-white/20 hover:text-white" onClick={(e) => { e.stopPropagation(); onChange(''); }} />
                ) : (
                    <ChevronDown size={14} className={`text-white/20 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                )}
            </button>
            {open && !disabled && (
                <div className="absolute top-full left-0 mt-1.5 w-full bg-[#161616] border border-white/[0.08] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] z-[200] overflow-hidden">
                    <div className="p-2 border-b border-white/[0.04]">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Digitar para buscar..."
                            className="w-full bg-white/[0.04] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 border-none focus:outline-none"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const first = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))[0];
                                    if (first) { onChange(first); setOpen(false); setQuery(''); }
                                }
                            }}
                        />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-white/20 text-xs">Sem resultados</div>
                        ) : filtered.map(opt => (
                            <button type="button" key={opt}
                                onClick={() => { onChange(opt); setOpen(false); setQuery(''); }}
                                className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center justify-between ${opt === value ? 'text-cyan-400 bg-cyan-500/5' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'}`}>
                                {opt}
                                {opt === value && <Check size={13} className="text-cyan-400" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Cores para categorias
const CATEGORY_COLORS = [
    { bg: 'bg-cyan-500/10 text-cyan-400', border: 'border-cyan-500/20' },
    { bg: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/20' },
    { bg: 'bg-pink-500/10 text-pink-400', border: 'border-pink-500/20' },
    { bg: 'bg-amber-500/10 text-amber-400', border: 'border-amber-500/20' },
    { bg: 'bg-purple-500/10 text-purple-400', border: 'border-purple-500/20' },
    { bg: 'bg-blue-500/10 text-blue-400', border: 'border-blue-500/20' },
    { bg: 'bg-red-500/10 text-red-400', border: 'border-red-500/20' },
    { bg: 'bg-teal-500/10 text-teal-400', border: 'border-teal-500/20' },
];
function getCategoryColor(category: string) {
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
    return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

/* ── Componente Principal ─────────────────────────── */
export function Radar({ onAddToQueue }: { onAddToQueue: (lead: any) => void }) {
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [categoria, setCategoria] = useState('');
    const [estado, setEstado] = useState('');
    const [cidade, setCidade] = useState('');
    const [buscaLivre, setBuscaLivre] = useState('');
    const [limite, setLimite] = useState(20);
    const [loadingStep, setLoadingStep] = useState(0);
    const [revealCount, setRevealCount] = useState(0);

    // IBGE data
    const [estados, setEstados] = useState<{ sigla: string; nome: string }[]>([]);
    const [cidades, setCidades] = useState<string[]>([]);
    const [loadingCidades, setLoadingCidades] = useState(false);

    // IBGE data fallback
    const ESTADOS_BR = [
        { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
        { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
        { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
        { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
        { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
        { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
        { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
        { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
        { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' }
    ];

    // Buscar estados do IBGE
    useEffect(() => {
        axios.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
            .then(res => {
                const data = res.data.map((e: any) => ({ sigla: e.sigla, nome: e.nome }));
                if (data.length > 0) setEstados(data);
                else setEstados(ESTADOS_BR);
            })
            .catch(() => setEstados(ESTADOS_BR));
    }, []);

    // Buscar cidades quando estado muda
    useEffect(() => {
        if (!estado) { setCidades([]); return; }
        setLoadingCidades(true);
        setCidade('');
        const uf = estados.find(e => e.sigla === estado || e.nome === estado);
        const sigla = uf?.sigla || estado;
        axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/municipios?orderBy=nome`)
            .then(res => setCidades(res.data.map((c: any) => c.nome)))
            .catch(() => setCidades([]))
            .finally(() => setLoadingCidades(false));
    }, [estado, estados]);

    const estadoOptions = estados.map(e => e.sigla);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const keyword = categoria || buscaLivre;
        if (!keyword) return toast.error("Selecione uma categoria ou digite o nicho");
        const location = [cidade, estado].filter(Boolean).join(', ');

        setLoading(true);
        setLeads([]);
        setRevealCount(0);
        setLoadingStep(0);

        // Simular steps de progresso
        const stepTimers = [
            setTimeout(() => setLoadingStep(1), 2000),
            setTimeout(() => setLoadingStep(2), 5000),
            setTimeout(() => setLoadingStep(3), 10000),
        ];

        try {
            const query = location ? `${keyword} em ${location}` : keyword;
            const res = await axios.post('/api/scraper/maps', { query, limit: limite });
            const results = res.data.leads || [];
            setLoading(false);
            stepTimers.forEach(clearTimeout);

            // Revelar leads um a um
            setLeads(results);
            for (let i = 1; i <= results.length; i++) {
                await new Promise(r => setTimeout(r, 120));
                setRevealCount(i);
            }
            toast.success(`${results.length} leads encontrados`);
        } catch (err: any) {
            stepTimers.forEach(clearTimeout);
            toast.error(err?.response?.data?.error || "Erro ao buscar leads");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Busca */}
            <div className="bg-[#131313] border border-white/[0.06] rounded-2xl p-6 md:p-8 space-y-5">
                <h2 className="text-lg font-semibold text-white">Buscar Leads</h2>

                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Dropdown label="Selecionar categoria" value={categoria} options={CATEGORIAS} onChange={setCategoria} />
                        <Dropdown label="Selecionar estado" value={estado} options={estadoOptions} onChange={setEstado} />
                        <Dropdown label={estado ? 'Selecionar cidade' : 'Selecione o estado primeiro'} value={cidade} options={cidades} onChange={setCidade} disabled={!estado} loading={loadingCidades} />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/15" />
                            <input
                                type="text"
                                placeholder="Ou busca livre (ex: hamburgueria artesanal)"
                                className="w-full h-12 bg-[#111] border border-white/[0.06] rounded-xl pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/15 transition-all"
                                value={buscaLivre}
                                onChange={e => setBuscaLivre(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3 h-12 bg-[#111] border border-white/[0.06] rounded-xl px-4 flex-1">
                            <span className="text-white/25 text-xs whitespace-nowrap">Qtd:</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    className="w-10 bg-transparent border-none p-0 text-sm font-semibold text-white focus:ring-0 text-center hide-number-spin"
                                    value={limite}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === '') setLimite('' as any);
                                        else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setLimite(num);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="h-12 px-8 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 shadow-[0_4px_20px_rgba(6,182,212,0.25)]"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <><Search size={15} /> Buscar Leads</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Resultados */}
            {leads.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/60">{revealCount < leads.length ? `${revealCount}/${leads.length} leads carregando...` : `${leads.length} leads encontrados`}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {leads.map((lead, idx) => {
                            return (
                                <div key={idx}
                                    className={`bg-[#131313] border border-white/[0.06] rounded-2xl p-5 flex flex-col hover:border-white/10 transition-all duration-300 group ${idx < revealCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}>
                                    <div className="mb-4">
                                        {lead.category && (() => {
                                            const c = getCategoryColor(lead.category);
                                            return <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold mb-2 ${c.bg}`}>{lead.category}</span>;
                                        })()}
                                        <h4 className="text-[15px] font-semibold text-white leading-snug">{lead.name}</h4>
                                        <p className="text-white/25 text-xs mt-1.5 flex items-start gap-1.5 leading-relaxed">
                                            <MapPin size={12} className="shrink-0 mt-0.5" />
                                            {[lead.city, lead.state].filter(Boolean).join(', ') || lead.address || '—'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/[0.04]">
                                        {(() => {
                                            const rawPhone = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
                                            if (!rawPhone || rawPhone.length < 8) {
                                                return (
                                                    <div className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 text-white/30 text-xs font-medium cursor-not-allowed" title="Sem WhatsApp Válido">
                                                        <WhatsAppIcon size={14} /> WhatsApp
                                                    </div>
                                                );
                                            }
                                            return (
                                                <a href={`https://wa.me/${rawPhone}`} target="_blank" rel="noreferrer"
                                                    className="h-9 px-3 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 flex items-center gap-2 hover:bg-[#25D366]/20 transition-all text-[#25D366] text-xs font-medium">
                                                    <WhatsAppIcon size={14} /> WhatsApp
                                                </a>
                                            );
                                        })()}
                                        {lead.instagram && lead.instagram !== 'Não Listado' && lead.instagram !== "" && (
                                            <a href={`https://instagram.com/${lead.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"
                                                className="w-9 h-9 rounded-lg bg-pink-500/10 border border-pink-500/15 flex items-center justify-center text-pink-400 hover:bg-pink-500/20 transition-all">
                                                <Instagram size={14} />
                                            </a>
                                        )}
                                        {lead.website && lead.website !== 'Não Listado' && lead.website !== "" && (
                                            <a href={lead.website} target="_blank" rel="noreferrer"
                                                className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all">
                                                <Globe size={14} />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => onAddToQueue(lead)}
                                            className="ml-auto w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all"
                                            title="Adicionar à fila do disparador"
                                        >
                                            <Share2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-[#161616] border border-white/[0.08] rounded-2xl p-10 flex flex-col items-center gap-5 shadow-2xl w-[340px]">
                        <Loader2 size={28} className="text-cyan-500 animate-spin" />
                        <p className="text-sm font-semibold text-white">Buscando leads...</p>
                        <div className="w-full space-y-2.5">
                            {['Conectando ao Google', 'Pesquisando empresas', 'Extraindo contatos', 'Validando dados'].map((step, i) => (
                                <div key={i} className={`flex items-center gap-2.5 text-xs transition-all duration-500 ${loadingStep >= i ? 'text-cyan-400' : 'text-white/15'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${loadingStep >= i ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]' : 'bg-white/10'}`} />
                                    {step}{loadingStep === i && '...'}
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-white/20">Buscando até {limite} resultados</p>
                    </div>
                </div>
            )}
        </div>
    );
}
