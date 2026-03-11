import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, Instagram, PlusCircle, MinusCircle, ChevronDown, Check, Globe, Database, Zap, Sparkles } from 'lucide-react';
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

function CustomSelect({ label, value, options, onChange, icon: Icon, placeholder = "Selecionar..." }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<any>(null);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayValue = typeof value === 'string' ? value : value?.name || value?.uf;

    return (
        <div className="relative flex-1" ref={ref}>
            <label className="block text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-3 ml-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-left flex items-center justify-between group transition-all duration-300 ${isOpen ? 'border-cyan-500/50 ring-4 ring-cyan-500/5' : 'hover:border-white/10 hover:bg-white/[0.02]'}`}
            >
                <div className="flex items-center gap-4">
                    <Icon size={18} className={`transition-colors duration-300 ${isOpen ? 'text-cyan-400' : 'text-white/20 group-hover:text-white/40'}`} />
                    <span className={`text-sm font-bold truncate ${displayValue ? 'text-white/90' : 'text-white/20'}`}>
                        {displayValue || placeholder}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-white/10 transition-transform duration-500 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute left-0 right-0 top-[calc(100%+12px)] z-[100] bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.9)] overflow-hidden backdrop-blur-3xl"
                    >
                        <div className="max-h-72 overflow-y-auto custom-scrollbar p-3 space-y-1.5 focus:outline-none">
                            {options.map((opt: any) => {
                                const optVal = typeof opt === 'string' ? opt : opt.uf || opt.name;
                                const isSelected = optVal === (typeof value === 'string' ? value : value?.uf || value?.name);
                                return (
                                    <button
                                        key={optVal}
                                        type="button"
                                        onClick={() => { onChange(opt); setIsOpen(false); }}
                                        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${isSelected ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span className="truncate">{typeof opt === 'string' ? opt : opt.name}</span>
                                        {isSelected && <Check size={14} className="flex-shrink-0" />}
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

export function Radar({ onQueue, queue, onRemove }: { onQueue: (l: any) => void, queue: any[], onRemove: (num: string) => void }) {
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
            }, 3000);
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
                toast.success(`${res.data.leads.length} alvos interceptados!`);
            } else {
                toast.error("Varredura sem resultados.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Erro na conexão tática.");
        } finally {
            setLoading(false);
        }
    };

    const isInQueue = (num: string) => queue.some(q => q.whatsapp === num);

    return (
        <div className="space-y-16 font-sans">
            {/* Main Search Panel */}
            <div className="bg-[#050505] rounded-[4rem] border border-white/10 p-12 lg:p-20 shadow-[0_50px_100px_rgba(0,0,0,0.9)] relative">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none rotate-12">
                    <Globe size={340} className="text-cyan-500" />
                </div>

                <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12 mb-20 border-b border-white/5 pb-16">
                        <div className="flex items-center gap-8">
                            <div className="w-24 h-24 bg-cyan-500/10 border border-cyan-500/20 rounded-[2.5rem] flex items-center justify-center text-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-pulse">
                                <Zap size={44} />
                            </div>
                            <div>
                                <h3 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">Deep Radar 2.0</h3>
                                <div className="flex items-center gap-4 mt-5">
                                    <div className="h-0.5 w-16 bg-cyan-500/40" />
                                    <p className="text-white/20 text-[11px] font-black uppercase tracking-[0.6em] whitespace-nowrap">Grounding AI Intelligence</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 px-10 py-5 bg-white/[0.02] border border-white/5 rounded-[2rem] backdrop-blur-xl">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Status: Operacional</span>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="space-y-16">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                            <CustomSelect label="Nicho Alvo" value={niche} options={NICHES} onChange={setNiche} icon={Database} />
                            <CustomSelect label="Região (UF)" value={stateObj} options={STATES} onChange={setStateObj} icon={MapPin} />
                            <CustomSelect label="Cidade Base" value={city} options={cities} onChange={setCity} icon={Globe} placeholder="Selecionar..." />

                            <div className="flex-1">
                                <label className="block text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-3 ml-1">Volume Final</label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-6 flex items-center text-white/10 group-hover/input:text-cyan-400 transition-colors">
                                        <Zap size={18} />
                                    </div>
                                    <input
                                        type="number"
                                        value={limit}
                                        onChange={e => setLimit(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 pl-16 pr-6 text-sm font-bold text-white focus:outline-none focus:ring-4 ring-cyan-500/5 transition-all hover:bg-white/[0.02] hide-number-spin text-center hover:border-white/10"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group/btn relative overflow-hidden bg-cyan-500 text-black font-black uppercase tracking-[0.3em] text-lg py-10 rounded-[2.5rem] transition-all shadow-[0_30px_60px_rgba(6,182,212,0.3)] hover:shadow-[0_40px_80px_rgba(6,182,212,0.4)] disabled:opacity-50 active:scale-[0.98]"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                            <div className="relative z-10 flex items-center justify-center gap-6">
                                {loading ? <Loader2 className="animate-spin" size={30} /> : <Search size={30} strokeWidth={3} />}
                                {loading ? 'EXECUTANDO VARREDURA...' : 'INICIAR RASTREAMENTO TÁTICO'}
                            </div>
                        </button>
                    </form>
                </div>
            </div>

            {/* Leads Grid Dashboard */}
            <AnimatePresence>
                {leads.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
                    >
                        {leads.map((l, i) => {
                            const inQueue = isInQueue(l.whatsapp);
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-[#050505] rounded-[3.5rem] border border-white/5 p-12 hover:border-cyan-500/30 transition-all duration-500 group relative shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex flex-col h-full"
                                >
                                    <div className="absolute top-0 right-0 px-8 py-4 bg-cyan-500/5 border-l border-b border-white/5 text-cyan-400 text-[9px] font-black uppercase tracking-[0.3em] rounded-bl-[2.5rem] opacity-40 group-hover:opacity-100 transition-opacity">
                                        Data Intercepted
                                    </div>

                                    <h4 className="font-black text-white text-2xl mb-12 truncate pr-16 uppercase tracking-tight italic group-hover:text-cyan-400 transition-colors leading-tight">{l.name}</h4>

                                    <div className="space-y-6 mb-16 flex-grow">
                                        <div className="flex items-center justify-between p-4 bg-white/[0.01] rounded-2xl border border-white/5 group/row hover:border-green-500/20 transition-all">
                                            <div className="flex items-center gap-4 text-white/20 text-[9px] font-black uppercase tracking-widest">
                                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500"><WhatsAppIcon size={18} /></div>
                                                WhatsApp
                                            </div>
                                            <a href={`https://wa.me/${l.whatsapp}`} target="_blank" rel="noreferrer" className="text-xs text-white/80 font-mono font-black hover:text-green-400 transition-colors tracking-tight">{l.phone}</a>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-white/[0.01] rounded-2xl border border-white/5 group/row hover:border-pink-500/20 transition-all">
                                            <div className="flex items-center gap-4 text-white/20 text-[9px] font-black uppercase tracking-widest">
                                                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500"><Instagram size={18} /></div>
                                                Instagram
                                            </div>
                                            {l.instagram && l.instagram !== 'Não Listado' ? (
                                                <a href={`https://instagram.com/${l.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs text-white/80 font-mono font-black hover:text-pink-400 transition-colors tracking-tight">{l.instagram}</a>
                                            ) : (
                                                <span className="text-[10px] text-white/10 uppercase tracking-widest font-black italic">No Profile</span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (inQueue) { onRemove(l.whatsapp); toast("Lead removido."); }
                                            else { onQueue(l); toast.success("Alvo na Fila!"); }
                                        }}
                                        className={`w-full flex items-center justify-center gap-4 py-6 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all border ${inQueue ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-cyan-500 hover:text-black hover:border-cyan-500 shadow-xl'}`}
                                    >
                                        {inQueue ? <MinusCircle size={22} strokeWidth={3} /> : <PlusCircle size={22} strokeWidth={3} />}
                                        {inQueue ? 'Tirar do Lançador' : 'Enviar p/ Lançador'}
                                    </button>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tactical Loading Overlay */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-12 text-center"
                    >
                        <div className="max-w-2xl w-full">
                            <div className="relative mb-24 flex justify-center scale-[1.5] lg:scale-[2]">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                                    className="w-56 h-56 rounded-full border-[2px] border-cyan-500/10 flex items-center justify-center relative"
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_30px_rgba(6,182,212,1)]" />
                                    <div className="w-48 h-48 rounded-full border-[1px] border-cyan-500/5 flex items-center justify-center" />
                                </motion.div>

                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <Sparkles className="text-cyan-400 w-12 h-12 mb-5 animate-pulse opacity-60 shadow-[0_0_20px_rgba(6,182,212,0.4)]" />
                                    <img src="/logo.webp" alt="River Logo" className="w-24 h-24 rounded-full border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)] mb-5 bg-black" />
                                    <div className="text-white font-black text-4xl tracking-tighter uppercase italic leading-none">River</div>
                                    <div className="text-[9px] text-cyan-400 font-black tracking-[0.8em] uppercase mt-3 opacity-40">Tactical Scraper v4</div>
                                </div>
                            </div>

                            <div className="space-y-12">
                                <div className="text-white font-black text-4xl lg:text-5xl uppercase tracking-tighter h-20 overflow-hidden italic leading-tight">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={loadingStage}
                                            initial={{ y: 60, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -60, opacity: 0 }}
                                            transition={{ duration: 0.8, ease: "anticipate" }}
                                        >
                                            {stages[loadingStage]}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                <div className="relative">
                                    <div className="w-full bg-white/5 h-4 rounded-full overflow-hidden border border-white/10 p-[4px] shadow-2xl">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-white shadow-[0_0_40px_rgba(6,182,212,0.8)] rounded-full"
                                            animate={{ width: `${((loadingStage + 1) / stages.length) * 100}%` }}
                                            transition={{ duration: 1.5, ease: "circOut" }}
                                        />
                                    </div>
                                    <div className="absolute -bottom-10 left-0 right-0 flex justify-between items-center text-[11px] font-black uppercase tracking-[0.5em] text-white/20 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
                                            Sincronismo Operacional
                                        </div>
                                        <span>Processamento Grounding AI</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
