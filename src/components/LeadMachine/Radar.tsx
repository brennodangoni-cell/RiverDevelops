import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, Instagram, PlusCircle, MinusCircle, Check, Globe, Database, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    'Fisioterapeuta', 'Veterinário', 'Lavanderia', 'Lotérica',
];

const CIDADES_POR_ESTADO: Record<string, string[]> = {
    'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares', 'Ipatinga', 'Sete Lagoas', 'Divinópolis', 'Santa Luzia', 'Ibirité', 'Poços de Caldas', 'Patos de Minas', 'Teófilo Otoni', 'Pouso Alegre', 'Barbacena', 'Sabará', 'Varginha', 'Conselheiro Lafaiete', 'Araguari', 'Itabira', 'Passos', 'Coronel Fabriciano', 'Muriaé', 'Ituiutaba', 'Lavras', 'Nova Lima', 'Itajubá', 'Nova Serrana', 'Manhuaçu', 'Araxá', 'Caratinga', 'Ubá', 'Curvelo', 'Patrocínio', 'São João del-Rei', 'Alfenas', 'Três Corações', 'Viçosa', 'Januária', 'Cataguases', 'Formiga', 'Itaúna', 'João Monlevade'],
    'SP': ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'São José dos Campos', 'Osasco', 'Sorocaba', 'Ribeirão Preto', 'Mauá', 'Santos', 'São José do Rio Preto', 'Mogi das Cruzes', 'Diadema', 'Jundiaí', 'Piracicaba', 'Carapicuíba', 'Bauru', 'Itaquaquecetuba', 'São Vicente', 'Franca', 'Praia Grande', 'Guarujá', 'Taubaté', 'Limeira', 'Suzano', 'Taboão da Serra', 'Sumaré', 'Barueri', 'Embu das Artes', 'Indaiatuba', 'Marília', 'Americana', 'Araraquara', 'Presidente Prudente', 'Jacareí', 'Cotia', 'Hortolândia', 'São Carlos', 'Itapevi', 'Valinhos', 'Araçatuba', 'Ferraz de Vasconcelos', 'Francisco Morato', 'Botucatu'],
    'RJ': ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Belford Roxo', 'Campos dos Goytacazes', 'São João de Meriti', 'Petrópolis', 'Volta Redonda', 'Magé', 'Macaé', 'Itaboraí', 'Mesquita', 'Cabo Frio', 'Nova Friburgo', 'Barra Mansa', 'Angra dos Reis', 'Teresópolis', 'Resende', 'Nilópolis', 'Queimados', 'Araruama', 'São Pedro da Aldeia', 'Maricá', 'Três Rios'],
    'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava', 'Paranaguá', 'Araucária', 'Toledo', 'Apucarana', 'Campo Largo', 'Pinhais', 'Arapongas', 'Almirante Tamandaré', 'Umuarama', 'Cambé', 'Piraquara', 'Campo Mourão', 'Sarandi', 'Fazenda Rio Grande', 'Francisco Beltrão', 'Paranavaí'],
    'RS': ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria', 'Gravataí', 'Viamão', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande', 'Alvorada', 'Passo Fundo', 'Sapucaia do Sul', 'Cachoeirinha', 'Uruguaiana', 'Santa Cruz do Sul', 'Bagé', 'Bento Gonçalves', 'Erechim', 'Guaíba', 'Lajeado', 'Sapiranga', 'Ijuí', 'Alegrete', 'Esteio', 'Santo Ângelo'],
    'SC': ['Joinville', 'Florianópolis', 'Blumenau', 'São José', 'Chapecó', 'Itajaí', 'Criciúma', 'Jaraguá do Sul', 'Lages', 'Palhoça', 'Balneário Camboriú', 'Brusque', 'Tubarão', 'São Bento do Sul', 'Caçador', 'Concórdia', 'Camboriú', 'Navegantes', 'Rio do Sul', 'Araranguá'],
    'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna', 'Juazeiro', 'Lauro de Freitas', 'Ilhéus', 'Jequié', 'Teixeira de Freitas', 'Barreiras', 'Alagoinhas', 'Porto Seguro', 'Simões Filho', 'Paulo Afonso', 'Eunápolis', 'Santo Antônio de Jesus', 'Valença', 'Candeias', 'Guanambi'],
    'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 'Águas Lindas de Goiás', 'Valparaíso de Goiás', 'Trindade', 'Formosa', 'Novo Gama', 'Itumbiara', 'Senador Canedo', 'Catalão', 'Jataí', 'Planaltina', 'Caldas Novas'],
    'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Cabo de Santo Agostinho', 'Camaragibe', 'Garanhuns', 'Vitória de Santo Antão', 'Igarassu', 'São Lourenço da Mata', 'Abreu e Lima', 'Serra Talhada', 'Araripina'],
    'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Itapipoca', 'Maranguape', 'Iguatu', 'Quixadá', 'Pacatuba', 'Aquiraz', 'Canindé', 'Russas', 'Tianguá'],
    'PA': ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal', 'Parauapebas', 'Abaetetuba', 'Cametá', 'Marituba', 'Bragança', 'Altamira', 'Barcarena', 'Tucuruí', 'Itaituba'],
    'DF': ['Brasília', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Plano Piloto', 'Águas Claras', 'Recanto das Emas', 'Gama', 'Guará', 'Santa Maria', 'Sobradinho'],
    'MA': ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias', 'Codó', 'Paço do Lumiar', 'Açailândia', 'Bacabal', 'Balsas'],
    'AM': ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tefé', 'Tabatinga', 'Maués'],
    'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Cáceres', 'Sorriso', 'Lucas do Rio Verde', 'Primavera do Leste', 'Barra do Garças'],
    'MS': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Naviraí', 'Nova Andradina', 'Aquidauana', 'Sidrolândia', 'Maracaju'],
    'PB': ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Cabedelo', 'Sousa', 'Cajazeiras', 'Guarabira', 'Sapé'],
    'RN': ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba', 'Ceará-Mirim', 'Caicó', 'Açu', 'Currais Novos', 'São José de Mipibu'],
    'AL': ['Maceió', 'Arapiraca', 'Rio Largo', 'Palmeira dos Índios', 'União dos Palmares', 'Penedo', 'São Miguel dos Campos', 'Coruripe', 'Delmiro Gouveia', 'Marechal Deodoro'],
    'PI': ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Campo Maior', 'Barras', 'União', 'Pedro II', 'Oeiras'],
    'SE': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'São Cristóvão', 'Estância', 'Tobias Barreto', 'Simão Dias', 'Capela', 'Itabaianinha'],
    'ES': ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Cachoeiro de Itapemirim', 'Linhares', 'São Mateus', 'Colatina', 'Guarapari', 'Aracruz'],
    'RO': ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal', 'Rolim de Moura', 'Jaru', 'Guajará-Mirim'],
    'TO': ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Guaraí', 'Colinas do Tocantins', 'Dianópolis'],
    'AC': ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó', 'Brasileia'],
    'AP': ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão', 'Porto Grande'],
    'RR': ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre', 'Pacaraima', 'Cantá'],
};

const SelectDropdown = ({ icon: Icon, value, options, onChange, placeholder }: {
    icon: any; value: string; options: string[]; onChange: (v: string) => void; placeholder: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-left hover:border-white/10 transition-all"
            >
                <Icon size={16} className="text-cyan-500 shrink-0" />
                <span className={`text-sm font-bold flex-1 truncate ${value ? 'text-white' : 'text-white/20'}`}>
                    {value || placeholder}
                </span>
                <ChevronDown size={14} className={`text-white/20 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute top-full left-0 mt-2 w-full bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden"
                    >
                        {options.length > 10 && (
                            <div className="p-3 border-b border-white/5">
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="w-full bg-white/5 border-none rounded-xl px-4 py-2.5 text-xs font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}
                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar py-1">
                            {value && (
                                <button
                                    type="button"
                                    onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
                                    className="w-full px-5 py-3 text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:bg-red-500/5 text-left transition-colors"
                                >
                                    Limpar Filtro
                                </button>
                            )}
                            {filtered.map(opt => (
                                <button
                                    type="button"
                                    key={opt}
                                    onClick={() => { onChange(opt); setIsOpen(false); setSearch(''); }}
                                    className="w-full px-5 py-3 text-xs font-bold text-left hover:bg-white/5 transition-colors flex items-center justify-between"
                                >
                                    <span className={opt === value ? 'text-cyan-400' : 'text-white/50 hover:text-white'}>{opt}</span>
                                    {opt === value && <Check size={12} className="text-cyan-400" />}
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <div className="px-5 py-6 text-center text-white/10 text-[10px] font-black uppercase tracking-widest">Nenhum resultado</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export function Radar({ onQueue, queue, onRemove }: { onQueue: (l: any) => void; queue: any[]; onRemove: (num: string) => void }) {
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [searchState, setSearchState] = useState({
        keyword: '',
        location: '',
        limit: 20
    });
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    const availableCities = selectedState ? (CIDADES_POR_ESTADO[selectedState] || []) : [];

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        const keyword = selectedCategory || searchState.keyword;
        if (!keyword) return toast.error("Selecione uma categoria ou digite o nicho");

        const location = [selectedCity, selectedState].filter(Boolean).join(', ') || searchState.location;

        setLoading(true);
        try {
            const res = await axios.post('/api/scraper/maps', {
                keyword,
                location,
                limit: searchState.limit
            });
            setLeads(res.data.leads || []);
            toast.success(`${res.data.leads?.length || 0} leads encontrados!`);
        } catch (err) {
            toast.error("Erro na extração de leads");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12 pb-32">
            {/* Busca Principal */}
            <section className="relative px-4">
                <div className="max-w-4xl mx-auto space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-3"
                    >
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-[0.9]">
                            Buscar <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Leads</span>
                        </h1>
                        <p className="text-white/20 text-xs font-bold uppercase tracking-[0.3em]">Selecione os filtros e extraia contatos verificados</p>
                    </motion.div>

                    <form onSubmit={handleSearch} className="space-y-4">
                        {/* Dropdowns Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <SelectDropdown
                                icon={Database}
                                value={selectedCategory}
                                options={CATEGORIAS}
                                onChange={setSelectedCategory}
                                placeholder="Categoria / Nicho"
                            />
                            <SelectDropdown
                                icon={MapPin}
                                value={selectedState}
                                options={ESTADOS}
                                onChange={(val) => { setSelectedState(val); setSelectedCity(''); }}
                                placeholder="Estado"
                            />
                            <SelectDropdown
                                icon={MapPin}
                                value={selectedCity}
                                options={availableCities}
                                onChange={setSelectedCity}
                                placeholder={selectedState ? 'Cidade' : 'Selecione o estado'}
                            />
                        </div>

                        {/* Busca Livre (opcional) */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-1000" />
                            <div className="relative flex flex-col md:flex-row gap-2 bg-[#0A0A0A] p-3 rounded-[2rem] border border-white/5 shadow-2xl">
                                <div className="flex-1 flex items-center px-6 gap-4">
                                    <Search className="text-white/20" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Ou digite um nicho específico (ex: Loja de Luxo em Uberlândia)"
                                        className="w-full bg-transparent border-none focus:ring-0 text-base font-bold text-white placeholder:text-white/10 py-3"
                                        value={searchState.keyword}
                                        onChange={e => setSearchState({ ...searchState, keyword: e.target.value })}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-white text-black h-[56px] px-10 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center justify-center gap-3 shadow-xl text-sm"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Buscar'}
                                </button>
                            </div>
                        </div>

                        {/* Configs */}
                        <div className="flex flex-wrap justify-center gap-4">
                            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                <Database size={14} className="text-cyan-400" />
                                <span className="text-[10px] uppercase tracking-widest font-black text-white/40">Quantidade:</span>
                                <input
                                    type="number"
                                    className="bg-transparent border-none w-12 p-0 text-sm font-black text-white focus:ring-0 text-center hide-number-spin"
                                    value={searchState.limit}
                                    onChange={e => setSearchState({ ...searchState, limit: parseInt(e.target.value) || 20 })}
                                />
                            </div>
                            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                <Check size={14} className="text-green-500" />
                                <span className="text-[10px] uppercase tracking-widest font-black text-white/40">Apenas números verificados</span>
                            </div>
                        </div>
                    </form>
                </div>
            </section>

            {/* Resultados */}
            <AnimatePresence>
                {leads.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-4"
                    >
                        <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6 max-w-7xl mx-auto">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-8 bg-cyan-500 rounded-full" />
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Resultados</h3>
                                    <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-black mt-1">Dados extraídos do Google Maps</p>
                                </div>
                            </div>
                            <span className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[11px] font-black text-white/40 uppercase tracking-widest">
                                {leads.length} leads
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                            {leads.map((lead, idx) => {
                                const inQueue = queue.some(l => l.whatsapp === lead.whatsapp);
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        className="group bg-[#0A0A0A] border border-white/5 hover:border-cyan-500/30 rounded-[2rem] p-7 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col h-full overflow-hidden relative"
                                    >
                                        <div className="mb-6 relative z-10">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase tracking-widest border border-cyan-500/20">
                                                    {lead.category || 'Lead'}
                                                </span>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <div key={star} className={`w-1 h-3 rounded-full ${star <= (lead.rating || 0) ? 'bg-cyan-500' : 'bg-white/10'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <h4 className="text-lg font-black text-white uppercase italic leading-tight group-hover:text-cyan-400 transition-colors">{lead.name}</h4>
                                            <p className="text-white/20 text-xs mt-3 flex items-start gap-2 leading-relaxed">
                                                <MapPin size={14} className="shrink-0 mt-0.5" />
                                                {lead.address}
                                            </p>
                                        </div>

                                        <div className="mt-auto space-y-4 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center gap-3 hover:bg-[#25D366]/10 hover:border-[#25D366]/20 transition-all group/wa"
                                                >
                                                    <WhatsAppIcon size={16} className="text-white/20 group-hover/wa:text-[#25D366] transition-colors" />
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover/wa:text-[#25D366]">WhatsApp</span>
                                                </a>
                                                {lead.instagram && (
                                                    <a
                                                        href={`https://instagram.com/${lead.instagram.replace('@', '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-pink-500/10 hover:border-pink-500/20 transition-all text-white/20 hover:text-pink-500"
                                                    >
                                                        <Instagram size={18} />
                                                    </a>
                                                )}
                                                {lead.website && (
                                                    <a
                                                        href={lead.website}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all text-white/20 hover:text-cyan-400"
                                                    >
                                                        <Globe size={18} />
                                                    </a>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => inQueue ? onRemove(lead.whatsapp) : onQueue(lead)}
                                                className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest transition-all ${inQueue ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white text-black hover:bg-cyan-400 shadow-xl'}`}
                                            >
                                                {inQueue ? (
                                                    <><MinusCircle size={18} /> Remover da Fila</>
                                                ) : (
                                                    <><PlusCircle size={18} /> Adicionar à Fila</>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Loading */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-10"
                    >
                        <div className="relative w-64 h-64 flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-[3px] border-dashed border-cyan-500/20 rounded-full"
                            />
                            <div className="relative z-10 flex flex-col items-center gap-6">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-20 h-20 bg-cyan-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.5)]"
                                >
                                    <Database size={32} className="text-black" />
                                </motion.div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-2">Extraindo Leads</h3>
                                    <div className="flex items-center gap-3 justify-center">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map(i => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: [4, 16, 4] }}
                                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                                    className="w-1 bg-cyan-500 rounded-full"
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] uppercase font-black tracking-[0.2em] text-cyan-400">Capturando dados...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-10 max-w-sm w-full">
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    animate={{ x: [-200, 200] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    className="h-full w-32 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
