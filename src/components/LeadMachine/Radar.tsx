import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Phone, MapPin, Instagram, PlusCircle, ChevronDown, Check, Globe, Database, Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

const NICHES = [
    'Academias', 'Restaurantes', 'Clínicas de Estética', 'Pet Shops',
    'Imobiliárias', 'Auto Escolas', 'Escritórios de Advocacia', 'Contabilidades',
    'Salões de Beleza', 'Oficinas Mecânicas', 'Lojas de Roupas', 'Dentistas'
];

const STATES = [
    { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' },
    { uf: 'GO', name: 'Goiás' }, { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' },
    { uf: 'MS', name: 'Mato Grosso do Sul' }, { uf: 'MG', name: 'Minas Gerais' },
    { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' }, { uf: 'PR', name: 'Paraná' },
    { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' }, { uf: 'RJ', name: 'Rio de Janeiro' },
    { uf: 'RN', name: 'Rio Grande do Norte' }, { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' }
];

function Select({ label, value, options, onChange, icon: Icon }: any) {
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
            <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-white/30 mb-2 ml-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl px-5 py-4 text-left flex items-center justify-between group hover:border-cyan-500/50 transition-all"
            >
                <div className="flex items-center gap-3">
                    <Icon size={18} className="text-white/20 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-sm font-bold text-white/90 truncate">
                        {typeof value === 'string' ? value || 'Selecionar...' : value?.name || value?.uf || 'Selecionar...'}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-white/20 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                    >
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                            {options.map((opt: any) => {
                                const isSelected = (typeof opt === 'string' ? opt : opt.uf || opt.name) === (typeof value === 'string' ? value : value?.uf || value?.name);
                                return (
                                    <button
                                        key={typeof opt === 'string' ? opt : opt.uf || opt.name}
                                        type="button"
                                        onClick={() => { onChange(opt); setIsOpen(false); }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-bold transition-all mb-1 ${isSelected ? 'bg-cyan-500 text-black' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
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
    const [loadingStage, setLoadingStage] = useState(0);

    const stages = [
        "Sincronizando com Satélites...",
        "Acessando Grounding AI Protocol...",
        "Escaneando Digital Footprint...",
        "Extraindo Metadados de Contato...",
        "Validando Canais de WhatsApp...",
        "Mapeando Perfis Instagram...",
        "Finalizando Dossiê Estratégico..."
    ];

    useEffect(() => {
        if (!stateObj) return;
        setCity('');
        axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateObj.uf}/municipios`)
            .then(res => setCities(res.data.map((c: any) => c.nome)))
            .catch(() => { });
    }, [stateObj]);

    useEffect(() => {
        let interval: any;
        if (loading) {
            interval = setInterval(() => {
                setLoadingStage(prev => (prev + 1) % stages.length);
            }, 3500);
        } else {
            setLoadingStage(0);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!city) { toast.error("Selecione a cidade!"); return; }

        const query = `${niche} em ${city} ${stateObj?.uf}`;
        setLoading(true);
        setLeads([]);

        try {
            const res = await axios.post('/api/scraper/maps', { query, limit });

            if (res.data.success && res.data.leads?.length > 0) {
                setLeads(res.data.leads);
                toast.success(`${res.data.leads.length} leads extraídos com sucesso!`);
            } else {
                toast.error("Busca concluída, mas 0 resultados retornaram.");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "Tempo limite excedido ou erro na conexão.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10">
            {/* Form Glass Card */}
            <div className="bg-[#0A0A0A] rounded-[2.5rem] border border-white/10 p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Globe size={180} className="text-cyan-500 rotate-12" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400">
                            <Zap size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Deep Radar 2.0</h3>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Grounding AI Search Engine (Alpha)</p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="flex flex-col gap-8">
                        <div className="flex flex-col lg:flex-row gap-6">
                            <Select label="Nicho / Atividade" value={niche} options={NICHES} onChange={setNiche} icon={Database} />
                            <Select label="Estado" value={stateObj} options={STATES} onChange={setStateObj} icon={MapPin} />
                            <Select label="Cidade Próxima" value={city} options={cities} onChange={setCity} icon={Globe} />
                            <div className="lg:w-32">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-white/30 mb-2 ml-1">Volume</label>
                                <input
                                    type="number"
                                    value={limit}
                                    onChange={e => setLimit(e.target.value)}
                                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white hover:border-cyan-500/50 transition-all focus:outline-none focus:ring-2 ring-cyan-500/30"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase tracking-[0.2em] text-sm py-6 rounded-3xl transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] flex items-center justify-center gap-3 active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                            {loading ? 'EXECUTANDO VARREDURA PROFUNDA...' : 'INICIAR RASTREAMENTO'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Leads Grid */}
            <AnimatePresence>
                {leads.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {leads.map((l, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-[#0A0A0A] rounded-[2rem] border border-white/10 p-6 hover:border-cyan-500/40 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 px-4 py-2 bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                                    Top Lead
                                </div>

                                <h4 className="font-black text-white text-lg mb-4 truncate pr-10 uppercase tracking-tight">{l.name}</h4>

                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center gap-3 text-white/60 text-sm font-medium">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30"><Phone size={14} /></div>
                                        {l.phone}
                                    </div>
                                    <div className="flex items-center gap-3 text-white/60 text-sm font-medium">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30"><Instagram size={14} /></div>
                                        {l.instagram || 'Não listado'}
                                    </div>
                                </div>

                                <button
                                    onClick={() => { onQueue(l); toast.success("Adicionado ao Lançador!"); }}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all"
                                >
                                    <PlusCircle size={16} /> Enviar p/ Lançador
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading Overlay */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 text-center"
                    >
                        <div className="max-w-md w-full">
                            <div className="relative mb-12 flex justify-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                                    className="w-48 h-48 rounded-full border-[1px] border-cyan-500/20 flex items-center justify-center relative"
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
                                    <div className="w-40 h-40 rounded-full border-[1px] border-cyan-500/10 flex items-center justify-center">
                                        <div className="w-32 h-32 rounded-full border-[1px] border-cyan-500/5" />
                                    </div>
                                </motion.div>

                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <Sparkles className="text-cyan-400 w-12 h-12 mb-2 animate-pulse" />
                                    <div className="text-cyan-400 font-black text-3xl tracking-tighter italic uppercase">River</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="text-white font-black text-xl uppercase tracking-tighter h-8 overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={loadingStage}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -20, opacity: 0 }}
                                        >
                                            {stages[loadingStage]}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/10">
                                    <motion.div
                                        className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                        animate={{ width: `${((loadingStage + 1) / stages.length) * 100}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                                    <span>Sistema Ativo</span>
                                    <span>Deep Search Engine v3.1</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
