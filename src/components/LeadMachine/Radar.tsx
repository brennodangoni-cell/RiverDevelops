import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, Instagram, PlusCircle, MinusCircle, Check, Globe, ChevronDown } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { WhatsAppIcon } from './WhatsAppIcon';

interface Lead {
    name: string;
    whatsapp: string;
    address: string;
    website?: string;
    instagram?: string;
    category?: string;
    city?: string;
    state?: string;
    rating?: number;
    user_ratings_total?: number;
}

const ESTADOS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const CATEGORIAS = [
    'Loja de Roupas', 'Clínica de Estética', 'Barbearia', 'Restaurante',
    'Pizzaria', 'Academia', 'Pet Shop', 'Salão de Beleza', 'Dentista',
    'Clínica Médica', 'Imobiliária', 'Loja de Móveis', 'Oficina Mecânica',
    'Padaria', 'Farmácia', 'Advogado', 'Contador', 'Fotógrafo',
    'Loja de Celular', 'Floricultura', 'Hotel', 'Pousada',
    'Escola', 'Auto Escola', 'Loja de Materiais de Construção',
    'Supermercado', 'Ótica', 'Joalheria', 'Loja de Calçados',
    'Agência de Marketing', 'Loja de Informática', 'Café', 'Hamburgueria',
    'Construtora', 'Arquiteto', 'Nutricionista', 'Psicólogo',
    'Fisioterapeuta', 'Veterinário', 'Lavanderia',
];

const CIDADES: Record<string, string[]> = {
    'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Uberaba', 'Governador Valadares', 'Ipatinga', 'Sete Lagoas', 'Divinópolis', 'Poços de Caldas', 'Patos de Minas', 'Pouso Alegre', 'Varginha', 'Araguari', 'Itabira', 'Passos', 'Muriaé', 'Ituiutaba', 'Lavras', 'Nova Lima', 'Itajubá', 'Araxá', 'Caratinga', 'Ubá', 'Curvelo', 'Patrocínio', 'Alfenas', 'Viçosa', 'Formiga', 'João Monlevade'],
    'SP': ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'São José dos Campos', 'Osasco', 'Sorocaba', 'Ribeirão Preto', 'Santos', 'São José do Rio Preto', 'Jundiaí', 'Piracicaba', 'Bauru', 'Franca', 'Limeira', 'Marília', 'Americana', 'Araraquara', 'Presidente Prudente', 'Botucatu', 'São Carlos', 'Barueri', 'Indaiatuba'],
    'RJ': ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Campos dos Goytacazes', 'Petrópolis', 'Volta Redonda', 'Macaé', 'Cabo Frio', 'Nova Friburgo', 'Angra dos Reis', 'Maricá', 'Resende', 'Teresópolis'],
    'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'Foz do Iguaçu', 'Guarapuava', 'Paranaguá', 'Toledo', 'Apucarana', 'Campo Mourão', 'Umuarama', 'Francisco Beltrão', 'Paranavaí'],
    'RS': ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande', 'Passo Fundo', 'Santa Cruz do Sul', 'Bento Gonçalves', 'Erechim', 'Bagé', 'Uruguaiana'],
    'SC': ['Joinville', 'Florianópolis', 'Blumenau', 'São José', 'Chapecó', 'Itajaí', 'Criciúma', 'Jaraguá do Sul', 'Lages', 'Balneário Camboriú', 'Brusque', 'Tubarão', 'Palhoça', 'Navegantes'],
    'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna', 'Juazeiro', 'Ilhéus', 'Jequié', 'Barreiras', 'Alagoinhas', 'Porto Seguro', 'Teixeira de Freitas'],
    'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 'Valparaíso de Goiás', 'Itumbiara', 'Catalão', 'Jataí', 'Caldas Novas'],
    'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Garanhuns', 'Serra Talhada'],
    'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Iguatu', 'Quixadá'],
    'PA': ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal', 'Parauapebas', 'Abaetetuba'],
    'DF': ['Brasília'],
    'MA': ['São Luís', 'Imperatriz', 'Timon', 'Caxias', 'Codó', 'Açailândia', 'Bacabal'],
    'AM': ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru'],
    'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Sorriso', 'Lucas do Rio Verde'],
    'MS': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Naviraí'],
    'PB': ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Cabedelo'],
    'RN': ['Natal', 'Mossoró', 'Parnamirim', 'Caicó'],
    'AL': ['Maceió', 'Arapiraca', 'Rio Largo', 'Palmeira dos Índios'],
    'PI': ['Teresina', 'Parnaíba', 'Picos', 'Floriano'],
    'SE': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana'],
    'ES': ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Cachoeiro de Itapemirim', 'Linhares', 'São Mateus', 'Colatina'],
    'RO': ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal'],
    'TO': ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional'],
    'AC': ['Rio Branco', 'Cruzeiro do Sul'],
    'AP': ['Macapá', 'Santana'],
    'RR': ['Boa Vista'],
};

/* ── Dropdown Reutilizável ─────────────────────────── */
function Dropdown({ label, value, options, onChange, disabled }: {
    label: string; value: string; options: string[]; onChange: (v: string) => void; disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen(!open)}
                className={`w-full flex items-center justify-between gap-2 bg-[#141414] border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-left transition-all hover:border-white/10 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span className={value ? 'text-white font-medium' : 'text-white/30'}>{value || label}</span>
                <ChevronDown size={16} className={`text-white/20 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-2 w-full bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {options.length > 8 && (
                        <div className="p-2 border-b border-white/5">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="w-full bg-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 border-none focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                    <div className="max-h-[220px] overflow-y-auto custom-scrollbar py-1">
                        {value && (
                            <button type="button" onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                                className="w-full px-5 py-2.5 text-xs text-red-400/70 hover:bg-red-500/5 text-left transition-colors font-medium">
                                Limpar
                            </button>
                        )}
                        {filtered.map(opt => (
                            <button type="button" key={opt}
                                onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
                                className={`w-full px-5 py-2.5 text-sm text-left hover:bg-white/5 transition-colors flex items-center justify-between ${opt === value ? 'text-cyan-400 font-semibold' : 'text-white/60'}`}>
                                {opt}
                                {opt === value && <Check size={14} className="text-cyan-400" />}
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div className="px-5 py-6 text-center text-white/20 text-sm">Nenhum resultado</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Componente Principal ─────────────────────────── */
export function Radar({ onQueue, queue, onRemove }: { onQueue: (l: any) => void; queue: any[]; onRemove: (num: string) => void }) {
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [categoria, setCategoria] = useState('');
    const [estado, setEstado] = useState('');
    const [cidade, setCidade] = useState('');
    const [buscaLivre, setBuscaLivre] = useState('');
    const [limite, setLimite] = useState(20);

    const cidades = estado ? (CIDADES[estado] || []) : [];

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const keyword = categoria || buscaLivre;
        if (!keyword) return toast.error("Selecione uma categoria ou digite o nicho");

        const location = [cidade, estado].filter(Boolean).join(', ');

        setLoading(true);
        try {
            const res = await axios.post('/api/scraper/maps', { keyword, location, limit: limite });
            setLeads(res.data.leads || []);
            toast.success(`${res.data.leads?.length || 0} leads encontrados`);
        } catch {
            toast.error("Erro ao buscar leads");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Formulário de Busca */}
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 md:p-8">
                <h2 className="text-lg font-bold text-white mb-6">Buscar Leads</h2>
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Dropdown label="Categoria" value={categoria} options={CATEGORIAS} onChange={setCategoria} />
                        <Dropdown label="Estado" value={estado} options={ESTADOS} onChange={(v) => { setEstado(v); setCidade(''); }} />
                        <Dropdown label="Cidade" value={cidade} options={cidades} onChange={setCidade} disabled={!estado} />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                            <input
                                type="text"
                                placeholder="Ou busca livre (ex: hamburgueria artesanal)"
                                className="w-full bg-[#0e0e0e] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/10 transition-all"
                                value={buscaLivre}
                                onChange={e => setBuscaLivre(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3 bg-[#0e0e0e] border border-white/5 rounded-2xl px-4">
                            <span className="text-white/30 text-xs font-medium whitespace-nowrap">Quantidade:</span>
                            <input
                                type="number"
                                className="w-14 bg-transparent border-none p-0 text-sm font-bold text-white focus:ring-0 text-center hide-number-spin"
                                value={limite}
                                onChange={e => setLimite(parseInt(e.target.value) || 20)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-cyan-500 text-black h-12 px-8 rounded-2xl font-bold text-sm hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 shrink-0"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Search size={16} /> Buscar</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Resultados */}
            {leads.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white">{leads.length} leads encontrados</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {leads.map((lead, idx) => {
                            const inQueue = queue.some(l => l.whatsapp === lead.whatsapp);
                            return (
                                <div key={idx} className="bg-[#141414] border border-white/5 rounded-2xl p-5 flex flex-col hover:border-white/10 transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-white truncate">{lead.name}</h4>
                                            <p className="text-white/30 text-xs mt-1 flex items-center gap-1.5 truncate">
                                                <MapPin size={12} className="shrink-0" /> {lead.address}
                                            </p>
                                        </div>
                                        {lead.category && (
                                            <span className="ml-2 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-[10px] font-bold shrink-0">
                                                {lead.category}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/5">
                                        <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                            className="h-9 px-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 hover:bg-[#25D366]/10 hover:border-[#25D366]/20 transition-all text-white/40 hover:text-[#25D366] text-xs font-medium">
                                            <WhatsAppIcon size={14} /> WhatsApp
                                        </a>
                                        {lead.instagram && (
                                            <a href={`https://instagram.com/${lead.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"
                                                className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-pink-500/10 hover:border-pink-500/20 transition-all text-white/30 hover:text-pink-500">
                                                <Instagram size={14} />
                                            </a>
                                        )}
                                        {lead.website && (
                                            <a href={lead.website} target="_blank" rel="noreferrer"
                                                className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-blue-500/10 hover:border-blue-500/20 transition-all text-white/30 hover:text-blue-400">
                                                <Globe size={14} />
                                            </a>
                                        )}
                                        <div className="flex-1" />
                                        <button
                                            onClick={() => inQueue ? onRemove(lead.whatsapp) : onQueue(lead)}
                                            className={`h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${inQueue ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' : 'bg-cyan-500 text-black hover:bg-cyan-400'}`}
                                        >
                                            {inQueue ? <><MinusCircle size={14} /> Remover</> : <><PlusCircle size={14} /> Fila</>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Loading overlay */}
            {loading && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-10 flex flex-col items-center gap-4 shadow-2xl">
                        <Loader2 size={32} className="text-cyan-500 animate-spin" />
                        <p className="text-sm font-bold text-white">Buscando leads...</p>
                        <p className="text-xs text-white/30">Extraindo dados do Google Maps</p>
                    </div>
                </div>
            )}
        </div>
    );
}
