import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Phone, MapPin, Instagram, PlusCircle, ChevronDown, Check, Minus, Plus } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const NICHES = [
    "Clínica de Estética", "Loja de Roupas", "Petshop", "Academia",
    "Barbearia", "Dentista", "Escritório de Advocacia", "Corretor de Imóveis",
    "Loja de Suplementos", "Concessionária de Carros", "Restaurante", "Pizzaria", "Ótica"
];

const STATES = [
    { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' }, { uf: 'AM', name: 'Amazonas' },
    { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' }, { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' },
    { uf: 'GO', name: 'Goiás' }, { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' }, { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' }, { uf: 'PR', name: 'Paraná' },
    { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' }, { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' },
    { uf: 'RS', name: 'Rio Grande do Sul' }, { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' }
];

function CustomDropdown({ options, value, onChange, placeholder, isSearchable = false }: any) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = isSearchable
        ? options.filter((o: any) => typeof o === 'string' ? o.toLowerCase().includes(search.toLowerCase()) : o.name.toLowerCase().includes(search.toLowerCase()))
        : options;

    return (
        <div ref={wrapperRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between bg-[#121214] border border-[#27272A] hover:border-[#3f3f46] rounded-xl h-[48px] px-4 text-[#FAFAFA] focus:outline-none focus:ring-2 ring-primary/50 transition-colors text-sm font-medium"
            >
                <span className="truncate">{typeof value === 'string' ? value : value?.name || placeholder}</span>
                <ChevronDown size={16} className={`text-[#A1A1AA] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden"
                    >
                        {isSearchable && (
                            <div className="p-2 border-b border-[#27272A] bg-[#121214]">
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg py-2 px-3 text-sm text-[#FAFAFA] focus:outline-none focus:border-primary/50"
                                    placeholder="Buscar..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="max-h-60 overflow-y-auto p-1 scroll-smooth">
                            {filteredOptions.length === 0 && <div className="p-3 text-center text-xs text-[#A1A1AA]">Nenhum resultado.</div>}
                            {filteredOptions.map((opt: any, i: number) => {
                                const isSelected = typeof opt === 'string' ? value === opt : value?.uf === opt.uf;
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
                                        className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none ${isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-[#D4D4D8] hover:bg-[#27272A] hover:text-white'}`}
                                    >
                                        <span className="truncate">{typeof opt === 'string' ? opt : opt.name}</span>
                                        {isSelected && <Check size={14} />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function Radar({ onQueue, queueCount }: { onQueue: (l: any) => void, queueCount: number }) {
    const [niche, setNiche] = useState(NICHES[0]);
    const [stateObj, setStateObj] = useState(STATES.find(s => s.uf === 'SP'));
    const [cities, setCities] = useState<string[]>([]);
    const [city, setCity] = useState('');
    const [limit, setLimit] = useState<number | string>(20);

    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState<any[]>([]);

    useEffect(() => {
        if (!stateObj) return;
        setCity('');
        axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateObj.uf}/municipios`)
            .then(res => setCities(res.data.map((c: any) => c.nome)))
            .catch(() => { });
    }, [stateObj]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!city) { alert("Você precisa selecionar a cidade!"); return; }

        const query = `${niche} em ${city} ${stateObj?.uf}`;
        setLoading(true);

        const apiKey = localStorage.getItem('google_places_api_key') || "";

        try {
            const res = await axios.post('http://localhost:3001/api/scraper/maps', { query, limit, apiKey });
            if (res.data.error) throw new Error(res.data.error);
            setLeads(res.data.leads || []);
        } catch (err: any) {
            alert("Ocorreu um erro na extração: " + (err.response?.data?.error || err.message));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="glass-panel p-6 md:p-8 rounded-3xl relative">
                <h3 className="text-xl md:text-2xl font-bold mb-2 tracking-tight">Painel de Escaneamento</h3>
                <p className="text-[#A1A1AA] text-sm md:text-base mb-8 max-w-2xl">Use filtros absolutos para extrair contatos de negócios. O sistema puxa Nomes, WhatsApps e Instagrams cruzando bancos de dados do Maps com os municípios oficiais do IBGE.</p>

                <form onSubmit={handleSearch} className="relative z-10 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 items-end">
                        <div className="w-full">
                            <label className="block text-xs font-bold mb-2 text-[#A1A1AA] uppercase tracking-wider">Segmento do Lead</label>
                            <CustomDropdown options={NICHES} value={niche} onChange={setNiche} isSearchable />
                        </div>

                        <div className="w-full">
                            <label className="block text-xs font-bold mb-2 text-[#A1A1AA] uppercase tracking-wider">Unidade Federativa (UF)</label>
                            <CustomDropdown options={STATES} value={stateObj} onChange={setStateObj} isSearchable />
                        </div>

                        <div className="relative w-full">
                            <label className="block text-xs font-bold mb-2 text-[#A1A1AA] uppercase tracking-wider">Município Foco</label>
                            {cities.length === 0 ? (
                                <div className="h-[48px] rounded-xl bg-[#121214] border border-[#27272A] flex items-center px-4 animate-pulse"><span className="text-[#52525B] text-sm">Atualizando IBGE...</span></div>
                            ) : (
                                <CustomDropdown options={cities} value={city} onChange={setCity} placeholder="Selecionar..." isSearchable />
                            )}
                        </div>

                        <div className="w-full">
                            <label className="block text-xs font-bold mb-2 text-[#A1A1AA] uppercase tracking-wider">Limite de Extração</label>
                            <input
                                type="number"
                                value={limit}
                                min="1"
                                max="200"
                                onChange={e => setLimit(e.target.value === '' ? '' : Math.min(200, Math.max(1, Number(e.target.value))))}
                                className="w-full h-[48px] bg-[#121214] border border-[#27272A] hover:border-[#3f3f46] rounded-xl px-4 text-[#FAFAFA] text-sm font-medium focus:outline-none focus:ring-2 ring-primary/50 transition-colors text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-8">
                        <button
                            type="submit"
                            disabled={loading || !city}
                            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center min-w-[220px] shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5"
                        >
                            {loading ? <><Loader2 className="animate-spin w-5 h-5 mr-3" /> Iniciando Varredura...</> : <><Search size={18} className="mr-2.5" /> Começar Extração</>}
                        </button>
                    </div>
                </form>
            </div>

            <AnimatePresence>
                {leads.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel overflow-hidden border border-[#27272A] rounded-3xl"
                    >
                        <div className="px-6 md:px-8 py-5 border-b border-[#27272A] flex flex-col md:flex-row items-center justify-between bg-[#121214] gap-4">
                            <h4 className="font-semibold text-base flex items-center gap-3">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[#FAFAFA]">Resultado: {leads.length} Leads Validados</span>
                            </h4>

                            <button
                                onClick={() => { leads.forEach(l => onQueue(l)); alert("Múltiplos itens adicionados ao Lançador!"); }}
                                className="w-full md:w-auto px-5 py-2.5 bg-[#18181B] hover:bg-[#27272A] border border-[#3F3F46] rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <PlusCircle size={16} className="text-primary" /> Adicionar Todos ao Disparador
                            </button>
                        </div>

                        <div className="divide-y divide-[#27272A] bg-[#09090B]">
                            {leads.map((lead, i) => (
                                <div key={i} className="p-4 md:p-6 hover:bg-[#121214] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h5 className="font-bold text-base flex items-center gap-2 text-[#FAFAFA]">
                                            {lead.name}
                                        </h5>
                                        <div className="text-sm mt-2 flex flex-wrap items-center gap-3">
                                            <span className="flex items-center gap-1.5 text-[#A1A1AA]"><MapPin size={14} /> {city}-{stateObj?.uf}</span>
                                            {lead.instagram && lead.instagram !== "Não Listado" ? (
                                                <a href={`https://instagram.com/${lead.instagram.replace('@', '')}`} target="_blank" className="flex items-center gap-1.5 text-pink-500 font-medium hover:underline bg-pink-500/10 px-2.5 py-1 rounded-md"><Instagram size={14} /> {lead.instagram}</a>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-[#71717A] bg-[#18181B] border border-[#27272A] px-2.5 py-1 rounded-md"><Instagram size={14} /> Sem Instagram</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                                        <div className="flex flex-col md:items-end gap-1">
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-green-500" />
                                                <span className="font-mono text-base tracking-wider font-semibold text-[#FAFAFA]">{lead.whatsapp}</span>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] font-bold">Contato Extraído</span>
                                        </div>

                                        <button
                                            onClick={() => onQueue(lead)}
                                            className="w-12 h-12 rounded-xl bg-[#18181B] group-hover:bg-primary group-hover:border-primary border border-[#27272A] flex items-center justify-center transition-all text-[#A1A1AA] group-hover:text-white"
                                            title="Adicionar à fila"
                                        >
                                            <PlusCircle size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
