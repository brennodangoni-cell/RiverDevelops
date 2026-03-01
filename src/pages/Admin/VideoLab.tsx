import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles, Copy,
    Check, ChevronLeft, Loader2, Upload,
    X, ArrowRight,
    Download, Video, DollarSign, LogOut,
    User, Smartphone, Monitor, Camera,
    SunMoon, Palette
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { analyzeProduct, generatePrompts, generateMockup, ProductAnalysis } from '../../services/ai';

interface Result {
    prompt: string;
    mockupUrl: string | null;
}

const genders = [
    { id: 'Female', label: 'Feminino', icon: User },
    { id: 'Male', label: 'Masculino', icon: User },
    { id: 'Androgynous', label: 'Andrógino', icon: User },
    { id: 'Any', label: 'Qualquer', icon: User },
];

const skinTones = [
    { id: 'Light', label: 'Clara', color: '#fcdcb4' },
    { id: 'Medium', label: 'Média', color: '#d09668' },
    { id: 'Dark', label: 'Escura', color: '#6b4124' },
    { id: 'Any', label: 'Qualquer', color: 'linear-gradient(45deg, #fcdcb4, #6b4124)' },
];

const hairColors = [
    { id: 'Blonde', label: 'Loiro', color: '#e8c92a' },
    { id: 'Brunette', label: 'Castanho', color: '#4a2f1d' },
    { id: 'Black', label: 'Preto', color: '#111111' },
    { id: 'Red', label: 'Ruivo', color: '#8c2211' },
    { id: 'Silver', label: 'Grisalho', color: '#c0c0c0' },
    { id: 'Any', label: 'Qualquer', color: 'linear-gradient(45deg, #e8c92a, #111111)' },
];

const lightings = [
    { id: 'Golden Hour', label: 'Golden Hour', desc: 'Luz suave e dourada do pôr do sol' },
    { id: 'Bright Daylight', label: 'Dia Ensolarado', desc: 'Luz forte e natural' },
    { id: 'Night/Neon', label: 'Noite / Neon', desc: 'Vibrante e escuro' },
    { id: 'Studio Lighting', label: 'Estúdio', desc: 'Visual técnico e controlado' },
    { id: 'Overcast/Moody', label: 'Nublado', desc: 'Tom dramático e frio' },
];

const styles = [
    { id: 'Cinematic', label: 'Cinemático', desc: 'Visual de filme, alta qualidade' },
    { id: 'Raw Documentary', label: 'Doc Raw', desc: 'Realista, sem filtros' },
    { id: 'Commercial', label: 'Comercial TV', desc: 'Foco absoluto no brilho' },
    { id: 'Minimalist', label: 'Minimalista', desc: 'Fundo neutro e limpo' },
    { id: 'Cyberpunk', label: 'Cyberpunk', desc: 'Futurista e tecnológico' },
    { id: 'Vintage 35mm', label: 'Vintage 35mm', desc: 'Textura de filme antigo' },
];

const sequenceTitles = [
    "Cena 1: Estabelecimento",
    "Cena 2: Ação e Uso",
    "Cena 3: Detalhes e Textura",
    "Cena 4: Ângulo Alternativo",
    "Cena 5: B-Roll Dinâmico",
    "Cena 6: Encerramento",
    "Cena 7: Extensão Extra",
    "Cena 8: Extensão Extra",
    "Cena 9: Extensão Extra"
];

export default function VideoLab() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [images, setImages] = useState<string[]>([]);
    const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
    const [options, setOptions] = useState({
        mode: 'product_only',
        environment: '',
        style: 'Cinematic',
        timeOfDay: 'Golden Hour',
        aspectRatio: '16:9',
        gender: 'Female',
        skinTone: 'Light',
        hairColor: 'Blonde',
        supportingDescription: '',
        includeText: false,
        includeVoice: false,
        language: 'Português'
    });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isContinuing, setIsContinuing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [balanceVal, setBalanceVal] = useState('R$ 0,00');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('rivertasks_user') || '{}');

    // Fetch finance balance
    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const token = localStorage.getItem('rivertasks_token');
                if (!token) return;
                const txRes = await axios.get('/api/transactions', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const txs = txRes.data || [];
                const totalIn = txs.filter((t: any) => t.type === 'IN').reduce((acc: number, curr: any) => acc + curr.amount, 0);
                const totalOut = txs.filter((t: any) => t.type === 'OUT').reduce((acc: number, curr: any) => acc + curr.amount, 0);
                const bal = totalIn - totalOut;
                setBalanceVal(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bal));
            } catch (error) {
                console.warn('Finance balance fetch failed');
            }
        };
        fetchBalance();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('rivertasks_token');
        localStorage.removeItem('rivertasks_user');
        navigate('/admin/login');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) setImages(prev => [...prev, event.target!.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

    const handleAnalyze = async () => {
        if (images.length === 0) return;
        setIsAnalyzing(true);
        setProgress(15);
        setProgressText('Analisando imagens...');
        try {
            const result = await analyzeProduct(images);
            setAnalysis(result);
            setOptions(prev => ({ ...prev, environment: result.suggestedSceneriesLifestyle[0] || '' }));
            setProgress(100);
            setTimeout(() => setStep(2), 300);
        } catch (error: any) {
            console.error("ANALYSIS_ERROR_LOG:", error);
            const errMsg = error.message || "Erro desconhecido";
            const detail = error.statusText || "";
            toast.error(`Erro na análise: ${errMsg} ${detail}`, { duration: 6000 });
            setStep(1);
        } finally {
            setIsAnalyzing(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const handleGenerate = async () => {
        if (!analysis) return;
        setIsGenerating(true);
        setStep(3);
        setResults([]);
        setProgress(5);
        try {
            setProgressText('Gerando prompts...');
            const prompts = await generatePrompts(analysis.description, options);
            setProgress(20);
            const newResults: Result[] = prompts.map(p => ({ prompt: p, mockupUrl: null }));
            setResults([...newResults]);
            for (let i = 0; i < prompts.length; i++) {
                setProgressText(`Gerando mockup ${i + 1}...`);
                const mockupUrl = await generateMockup(analysis.description, prompts[i], images);
                newResults[i].mockupUrl = mockupUrl;
                setResults([...newResults]);
                setProgress(20 + ((i + 1) / prompts.length) * 80);
            }
        } catch (e: any) {
            console.error("FULL_API_ERROR_OBJECT:", e);
            if (e.message) console.error("Error Message:", e.message);
            if (e.status) console.error("Error Status:", e.status);
            toast.error("Erro na geração.");
            setStep(2);
        } finally {
            setIsGenerating(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const handleContinueFlow = async () => {
        if (!analysis) return;
        setIsContinuing(true);
        setProgress(10);
        try {
            setProgressText('Expandindo sequência...');
            const newPrompts = await generatePrompts(analysis.description, options, results.map(r => r.prompt));
            setProgress(30);
            const startIndex = results.length;
            const newResults: Result[] = newPrompts.map(p => ({ prompt: p, mockupUrl: null }));
            setResults(prev => [...prev, ...newResults]);
            for (let i = 0; i < newPrompts.length; i++) {
                const globalIndex = startIndex + i;
                const mockupUrl = await generateMockup(analysis.description, newPrompts[i], images);
                setResults(prev => {
                    const updated = [...prev];
                    updated[globalIndex].mockupUrl = mockupUrl;
                    return updated;
                });
                setProgress(30 + ((i + 1) / newPrompts.length) * 70);
            }
        } catch (error) {
            toast.error("Erro na expansão.");
        } finally {
            setIsContinuing(false);
            setTimeout(() => setProgress(0), 2000);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Pronto!');
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans selection:bg-cyan-500/30 relative">
            {/* FORCE REMOVAL OF GLOBAL BACKGROUNDS AT PAGE LEVEL */}
            <style dangerouslySetInnerHTML={{
                __html: `
                body { background-image: none !important; background-color: #0a0a0a !important; }
                .bg-background { background-color: #0a0a0a !important; }
            `}} />

            {/* Header - Solid & Clean */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#111111] border-b border-[#222222] px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link to="/admin" className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5 text-neutral-400" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-cyan-600/20 flex items-center justify-center border border-cyan-800/30">
                            <Sparkles className="w-4 h-4 text-cyan-500" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold tracking-tight text-white uppercase">River Sora Lab</h1>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Dashboard de Produção</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#222222] rounded-md">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-bold text-neutral-300">{balanceVal}</span>
                    </div>
                    <div className="flex items-center gap-3 pl-4 border-l border-[#222222]">
                        <img
                            src={`/${currentUser.username?.toLowerCase() || 'default'}.webp`}
                            className="w-8 h-8 rounded-full border border-[#333] object-cover"
                            alt="User"
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=222&color=fff`; }}
                        />
                        <button onClick={handleLogout} className="p-2 hover:bg-red-500/10 rounded-lg text-neutral-500 hover:text-red-500 transition-all">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 pt-24 pb-20 relative z-10">
                {/* Steps Bar - Clean Navigation */}
                <div className="mb-12 flex items-center gap-4">
                    {[
                        { s: 1, label: 'Importação' },
                        { s: 2, label: 'Configuração' },
                        { s: 3, label: 'Resultados' }
                    ].map((stepObj) => (
                        <React.Fragment key={stepObj.s}>
                            <div className={`flex items-center gap-3 ${step === stepObj.s ? 'opacity-100' : 'opacity-30'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step === stepObj.s ? 'bg-cyan-600 text-white' : 'bg-[#222] text-neutral-400'}`}>
                                    {stepObj.s}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest">{stepObj.label}</span>
                            </div>
                            {stepObj.s < 3 && <div className="h-px w-8 bg-[#222]" />}
                        </React.Fragment>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* STEP 1: IMPORT */}
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                            <div className="w-full max-w-2xl bg-[#111111] border border-[#222222] rounded-2xl p-12 text-center">
                                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                <div onClick={() => fileInputRef.current?.click()} className="group cursor-pointer flex flex-col items-center gap-4 py-16 border-2 border-dashed border-[#222] hover:border-cyan-800 rounded-xl transition-all">
                                    <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-neutral-500 group-hover:text-cyan-500 transition-colors">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-white font-bold">Arraste ou Selecione Fotos</h3>
                                        <p className="text-xs text-neutral-500">Mínimo de 1 foto do produto real</p>
                                    </div>
                                </div>

                                {images.length > 0 && (
                                    <div className="mt-10 space-y-8">
                                        <div className="flex flex-wrap justify-center gap-3">
                                            {images.map((img, idx) => (
                                                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#222] group">
                                                    <img src={img} className="w-full h-full object-cover" alt="Uploaded" />
                                                    <button onClick={() => removeImage(idx)} className="absolute inset-0 bg-red-600/80 items-center justify-center hidden group-hover:flex transition-all">
                                                        <X className="w-4 h-4 text-white" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full sm:w-auto px-10 py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#222] text-white font-bold uppercase tracking-widest text-[11px] rounded transition-all shadow-lg flex items-center justify-center gap-2 mx-auto">
                                            {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando DNA Visual...</> : 'Iniciar Produção'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: CONFIGURATION */}
                    {step === 2 && analysis && (
                        <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            {/* Panel: Summary */}
                            <div className="bg-[#111111] border border-[#222222] rounded-2xl p-8 space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Produto Reconhecido</label>
                                    <p className="text-lg font-bold text-white">{analysis.productType}</p>
                                </div>
                                <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
                                    <p className="text-xs text-neutral-400 leading-relaxed font-light italic">"{analysis.description.substring(0, 200)}..."</p>
                                </div>
                                <div className="space-y-3 pt-4 border-t border-[#1a1a1a]">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Modo da Sequência</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => setOptions({ ...options, mode: 'product_only', environment: analysis.suggestedSceneriesProductOnly[0] })} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded border transition-all ${options.mode === 'product_only' ? 'bg-cyan-600/10 border-cyan-600 text-cyan-500' : 'bg-[#1a1a1a] border-[#222] text-neutral-500'}`}>Estúdio</button>
                                        <button onClick={() => setOptions({ ...options, mode: 'lifestyle', environment: analysis.suggestedSceneriesLifestyle[0] })} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded border transition-all ${options.mode === 'lifestyle' ? 'bg-cyan-600/10 border-cyan-600 text-cyan-500' : 'bg-[#1a1a1a] border-[#222] text-neutral-500'}`}>Cena Real</button>
                                    </div>
                                </div>
                            </div>

                            {/* Panel: Scenery Selection */}
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-[#111111] border border-[#222222] rounded-2xl p-8">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-6">Selecione o Ambiente</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {(options.mode === 'product_only' ? analysis.suggestedSceneriesProductOnly : analysis.suggestedSceneriesLifestyle).map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setOptions({ ...options, environment: s })}
                                                className={`p-4 rounded-xl border text-left transition-all ${options.environment === s ? 'bg-cyan-600/5 border-cyan-600 text-white' : 'bg-[#1a1a1a] border-[#222] text-neutral-500 hover:border-[#333]'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${options.environment === s ? 'bg-cyan-600 border-cyan-500' : 'border-neutral-700'}`}>
                                                        {options.environment === s && <Check className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                    <span className="text-[11px] leading-relaxed">{s}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mt-8 pt-8 border-t border-[#1a1a1a]">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Iluminação</label>
                                            <select value={options.timeOfDay} onChange={(e) => setOptions({ ...options, timeOfDay: e.target.value })} className="w-full bg-[#1a1a1a] border border-[#222] rounded px-4 py-3 text-[11px] text-white outline-none focus:border-cyan-600">
                                                {lightings.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Estética Visual</label>
                                            <select value={options.style} onChange={(e) => setOptions({ ...options, style: e.target.value })} className="w-full bg-[#1a1a1a] border border-[#222] rounded px-4 py-3 text-[11px] text-white outline-none focus:border-cyan-600">
                                                {styles.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Lifestyle Personalization */}
                                    {options.mode === 'lifestyle' && (
                                        <div className="mt-8 pt-8 border-t border-[#1a1a1a] space-y-8">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Personalização Humana</h3>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                {/* Gender */}
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Gênero</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {genders.map(g => (
                                                            <button key={g.id} onClick={() => setOptions({ ...options, gender: g.id })} className={`py-2 px-3 rounded border text-[10px] font-bold uppercase tracking-widest transition-all ${options.gender === g.id ? 'bg-cyan-600/10 border-cyan-600 text-cyan-500' : 'bg-[#1a1a1a] border-[#222] text-neutral-500'}`}>
                                                                {g.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Skin Tone */}
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Tom de Pele</label>
                                                    <div className="flex gap-2">
                                                        {skinTones.map(s => (
                                                            <button key={s.id} onClick={() => setOptions({ ...options, skinTone: s.id })} className={`w-8 h-8 rounded-full border-2 transition-all ${options.skinTone === s.id ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent'}`} style={{ background: s.color }} title={s.label} />
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Hair Color */}
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Cabelo</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {hairColors.map(h => (
                                                            <button key={h.id} onClick={() => setOptions({ ...options, hairColor: h.id })} className={`w-8 h-8 rounded-full border-2 transition-all ${options.hairColor === h.id ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent'}`} style={{ background: h.color }} title={h.label} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-[#1a1a1a]">
                                        {/* Overlay Options */}
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Elementos Narrativos</label>
                                            <div className="flex flex-col gap-3">
                                                <button onClick={() => setOptions({ ...options, includeText: !options.includeText })} className={`flex items-center justify-between p-3 rounded border transition-all ${options.includeText ? 'bg-cyan-600/10 border-cyan-800 text-cyan-500' : 'bg-[#1a1a1a] border-[#222] text-neutral-500'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <SunMoon className={`w-4 h-4 ${options.includeText ? 'text-cyan-500' : 'text-neutral-500'}`} />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Textos na Tela</span>
                                                    </div>
                                                    <div className={`w-8 h-4 rounded-full relative transition-all ${options.includeText ? 'bg-cyan-600' : 'bg-[#333]'}`}>
                                                        <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${options.includeText ? 'left-5' : 'left-1'}`} />
                                                    </div>
                                                </button>
                                                <button onClick={() => setOptions({ ...options, includeVoice: !options.includeVoice })} className={`flex items-center justify-between p-3 rounded border transition-all ${options.includeVoice ? 'bg-cyan-600/10 border-cyan-800 text-cyan-500' : 'bg-[#1a1a1a] border-[#222] text-neutral-500'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Palette className={`w-4 h-4 ${options.includeVoice ? 'text-cyan-500' : 'text-neutral-500'}`} />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Locução/Voz</span>
                                                    </div>
                                                    <div className={`w-8 h-4 rounded-full relative transition-all ${options.includeVoice ? 'bg-cyan-600' : 'bg-[#333]'}`}>
                                                        <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${options.includeVoice ? 'left-5' : 'left-1'}`} />
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Language Selector */}
                                        {(options.includeText || options.includeVoice) && (
                                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Idioma do Roteiro</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {['Português', 'English', 'Español'].map(lang => (
                                                        <button key={lang} onClick={() => setOptions({ ...options, language: lang })} className={`py-3 px-2 rounded border text-[9px] font-bold uppercase tracking-widest transition-all ${options.language === lang ? 'bg-cyan-600/10 border-cyan-600 text-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.1)]' : 'bg-[#1a1a1a] border-[#222] text-neutral-500'}`}>
                                                            {lang}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[8px] text-neutral-600 italic leading-tight">* Textos e falas serão gerados neste idioma para o Sora 2.</p>
                                            </motion.div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mt-8 pt-8 border-t border-[#1a1a1a]">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Formato (Aspect Ratio)</label>
                                            <div className="flex gap-2">
                                                <button onClick={() => setOptions({ ...options, aspectRatio: '16:9' })} className={`flex-1 py-3 flex flex-col items-center gap-1 rounded border transition-all ${options.aspectRatio === '16:9' ? 'bg-cyan-600/10 border-cyan-600 text-cyan-500' : 'bg-[#1a1a1a] border-[#222] text-neutral-500'}`}>
                                                    <Monitor className="w-4 h-4" />
                                                    <span className="text-[9px] font-bold uppercase">16:9 Full</span>
                                                </button>
                                                <button onClick={() => setOptions({ ...options, aspectRatio: '9:16' })} className={`flex-1 py-3 flex flex-col items-center gap-1 rounded border transition-all ${options.aspectRatio === '9:16' ? 'bg-cyan-600/10 border-cyan-600 text-cyan-500' : 'bg-[#1a1a1a] border-[#222] text-neutral-500'}`}>
                                                    <Smartphone className="w-4 h-4" />
                                                    <span className="text-[9px] font-bold uppercase">9:16 Mobile</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Direção Extra</label>
                                            <textarea value={options.supportingDescription} onChange={(e) => setOptions({ ...options, supportingDescription: e.target.value })} placeholder="Ex: Câmera lenta, luz de neon azul..." className="w-full bg-[#1a1a1a] border border-[#222] rounded px-4 py-2.5 text-[11px] text-white outline-none focus:border-cyan-600 h-[52px] resize-none" />
                                        </div>
                                    </div>

                                    <button onClick={handleGenerate} className="w-full mt-10 bg-white hover:bg-neutral-200 text-black font-black uppercase tracking-[0.2em] text-[11px] py-5 rounded transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                                        Gerar Comercial Profissional <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: RESULTS */}
                    {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <div className="flex items-center justify-between mb-10">
                                <h2 className="text-xl font-bold uppercase tracking-tight text-white">Resultados da Direção</h2>
                                <button onClick={() => { setStep(1); setImages([]); setResults([]); }} className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white px-4 py-2 border border-[#222] rounded transition-all">Novo Projeto</button>
                            </div>

                            {/* Progress Indicator */}
                            {(isGenerating || isContinuing) && (
                                <div className="bg-[#111111] border border-cyan-900/40 rounded-2xl p-8 mb-12">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-400">{progressText}</span>
                                        </div>
                                        <span className="text-xl font-black text-white">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-[#222] rounded-full overflow-hidden">
                                        <motion.div className="h-full bg-cyan-600" animate={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            )}

                            {/* Storyboard List */}
                            <div className="grid grid-cols-1 gap-6">
                                {results.map((res, i) => (
                                    <div key={i} className="bg-[#111111] border border-[#222222] rounded-2xl overflow-hidden flex flex-col md:flex-row h-auto md:h-72">
                                        <div className="w-full md:w-72 aspect-square md:aspect-auto bg-[#0a0a0a] border-r border-[#222] relative group">
                                            {res.mockupUrl ? (
                                                <>
                                                    <img src={res.mockupUrl} className="w-full h-full object-cover" alt="Result" />
                                                    <a href={res.mockupUrl} download className="absolute top-4 right-4 w-10 h-10 bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-cyan-600">
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-700 bg-neutral-900/40 p-12 text-center">
                                                    {isGenerating || isContinuing ? (
                                                        <>
                                                            <Loader2 className="w-6 h-6 animate-spin text-cyan-800" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Processando Frames...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Camera className="w-8 h-8 text-neutral-800" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-700">Erro na Renderização Visual.<br />Tente gerar novamente.</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 p-8 flex flex-col justify-between">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">{sequenceTitles[i] || `Parte ${i + 1}`}</span>
                                                    <button onClick={() => copyToClipboard(res.prompt)} className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">
                                                        <Copy className="w-3.5 h-3.5" /> Copiar Prompt
                                                    </button>
                                                </div>
                                                <p className="text-sm text-neutral-300 leading-relaxed font-light">"{res.prompt}"</p>
                                            </div>
                                            <div className="pt-6 border-t border-[#1a1a1a] flex gap-4">
                                                <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-600">Ratio: {options.aspectRatio}</span>
                                                <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-600">Estampa: {options.style}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!isGenerating && !isContinuing && results.length > 0 && (
                                <div className="pt-10 flex flex-col items-center">
                                    <button onClick={handleContinueFlow} className="group bg-[#1a1a1a] border border-[#222] hover:border-cyan-800 text-neutral-300 hover:text-cyan-500 px-8 py-4 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all">
                                        <Video className="w-4 h-4" /> Expandir Sequência (+3 Cenas)
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
