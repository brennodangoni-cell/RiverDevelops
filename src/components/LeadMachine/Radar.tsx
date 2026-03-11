import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Phone, MapPin, Instagram, PlusCircle, ChevronDown, Check } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

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
                className="w-full flex items-center justify-between bg-[#0A0A0A] border border-white/10 hover:border-white/20 rounded-xl h-[48px] px-4 text-white focus:outline-none focus:ring-2 ring-cyan-500/50 transition-colors text-sm font-medium"
            >
                <span className="truncate">{typeof value === 'string' ? value : value?.name || placeholder}</span>
                <ChevronDown size={16} className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                        {isSearchable && (
                            <div className="p-2 border-b border-white/10 bg-[#0A0A0A]">
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full bg-[#111] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                                    placeholder="Buscar..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="max-h-60 overflow-y-auto p-1 scroll-smooth">
                            {filteredOptions.length === 0 && <div className="p-3 text-center text-xs text-white/40">Nenhum resultado.</div>}
                            {filteredOptions.map((opt: any, i: number) => {
                                const isSelected = typeof opt === 'string' ? value === opt : value?.uf === opt.uf;
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
                                        className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none ${isSelected ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
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

export function Radar({ onQueue }: { onQueue: (l: any) => void, queueCount: number }) {
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
        if (!city) { toast.error("Selecione a cidade!"); return; }

        const query = `${niche} em ${city} ${stateObj?.uf}`;
        setLoading(true);

        try {
            const res = await axios.post('/api/scraper/maps', { query, limit });
            setLeads(res.data.leads || []);
            toast.success(`${res.data.leads?.length || 0} leads extraídos!`);
        } catch (err: any) {
            toast.error("Erro na extração: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="bg-[#0A0A0A] p-6 md:p-8 rounded-3xl border border-white/10">
                <h3 className="text-xl md:text-2xl font-bold mb-2 tracking-tight text-white">Painel de Escaneamento</h3>
                <p className="text-white/40 text-sm md:text-base mb-8 max-w-2xl">Extraia contatos cruzando Google Maps com dados oficiais do IBGE.</p>

                <form onSubmit={handleSearch} className="relative z-10 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 items-end">
                        <div className="w-full">
                            <label className="block text-xs font-bold mb-2 text-white/40 uppercase tracking-wider">Segmento</label>
                            <CustomDropdown options={NICHES} value={niche} onChange={setNiche} isSearchable />
                        </div>

                        <div className="w-full">
                            <label className="block text-xs font-bold mb-2 text-white/40 uppercase tracking-wider">Estado (UF)</label>
                            <CustomDropdown options={STATES} value={stateObj} onChange={setStateObj} isSearchable />
                        </div>

                        <div className="relative w-full">
                            <label className="block text-xs font-bold mb-2 text-white/40 uppercase tracking-wider">Município</label>
                            {cities.length === 0 ? (
                                <div className="h-[48px] rounded-xl bg-[#0A0A0A] border border-white/10 flex items-center px-4 animate-pulse"><span className="text-white/20 text-sm">Atualizando IBGE...</span></div>
                            ) : (
                                <CustomDropdown options={cities} value={city} onChange={setCity} placeholder="Selecionar..." isSearchable />
                            )}
                        </div>

                        <div className="w-full">
                            <label className="block text-xs font-bold mb-2 text-white/40 uppercase tracking-wider">Limite</label>
                            <input
                                type="number"
                                value={limit}
                                min="1"
                                max="200"
                                onChange={e => setLimit(e.target.value === '' ? '' : Math.min(200, Math.max(1, Number(e.target.value))))}
                                className="w-full h-[48px] bg-[#0A0A0A] border border-white/10 hover:border-white/20 rounded-xl px-4 text-white text-sm font-medium focus:outline-none focus:ring-2 ring-cyan-500/50 transition-colors text-center"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-8">
                        <button
                            type="submit"
                            disabled={loading || !city}
                            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[220px]"
                        >
                            {loading ? <><Loader2 className="animate-spin w-5 h-5 mr-3" /> Extraindo...</> : <><Search size={18} className="mr-2" /> Começar Extração</>}
                        </button>
                    </div>
                </form>
            </div>

            <AnimatePresence>
                {leads.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden"
                    >
                        <div className="px-6 md:px-8 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <h4 className="font-semibold text-base flex items-center gap-3">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-white">Resultado: {leads.length} Leads</span>
                            </h4>

                            <button
                                onClick={() => { leads.forEach(l => onQueue(l)); toast.success("Adicionados ao Lançador!"); }}
                                className="px-5 py-2.5 bg-[#111] hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <PlusCircle size={16} className="text-cyan-400" /> Adicionar Todos
                            </button>
                        </div>

                        <div className="divide-y divide-white/5">
                            {leads.map((lead, i) => (
                                <div key={i} className="p-4 md:p-6 hover:bg-white/5 transition-colors flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h5 className="font-bold text-base text-white">{lead.name}</h5>
                                        <div className="text-sm mt-1 flex items-center gap-3 text-white/40">
                                            <span className="flex items-center gap-1.5"><MapPin size={14} /> {city}-{stateObj?.uf}</span>
                                            {lead.instagram && lead.instagram !== "Não Listado" && (
                                                <span className="text-pink-400 flex items-center gap-1"><Instagram size={14} /> {lead.instagram}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <div className="flex items-center gap-2 text-green-400 font-mono font-bold">
                                                <Phone size={14} />
                                                <span>{lead.whatsapp}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => { onQueue(lead); toast.success("Adicionado!"); }}
                                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-cyan-500 hover:text-black border border-white/10 flex items-center justify-center transition-all"
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
