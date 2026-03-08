import React, { useState, useRef } from 'react';
import {
    ChevronLeft, Wand2,
    Sparkles, Camera, Box,
    PlayCircle, LogOut,
    Download, Loader2, RotateCcw,
    Layers, Video, CheckCircle2, AlertCircle,
    X, ArrowRight
} from 'lucide-react';


import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { riverAnalyze, riverGenerate } from '../../services/ai';

interface RiverTake {
    title: string;
    prompt: string;
    visualHook: string;
    status: 'idle' | 'generating' | 'completed' | 'error';
    videoUrl?: string;
    estimatedTime?: string;
}

export default function RiverVideoLab() {
    const [step, setStep] = useState<1 | 2>(1);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [marketingContext, setMarketingContext] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [takes, setTakes] = useState<RiverTake[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('rivertasks_user') || '{}');

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newFiles = Array.from(files).slice(0, 6); // Max 6 images
        setImageFiles(prev => [...prev, ...newFiles].slice(0, 6));
        const newUrls = newFiles.map(f => URL.createObjectURL(f));
        setPreviewUrls(prev => [...prev, ...newUrls].slice(0, 6));
    };

    const removeImage = (index: number) => {
        URL.revokeObjectURL(previewUrls[index]);
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
    };

    const handleStartProduction = async () => {
        if (imageFiles.length === 0) {
            toast.error('Adicione pelo menos uma imagem.');
            return;
        }
        setIsAnalyzing(true);
        try {
            const base64Images = await Promise.all(imageFiles.map(f => fileToBase64(f)));

            // 1. Analyze and get prompts
            const analysis = await riverAnalyze(base64Images, marketingContext);

            const initialTakes: RiverTake[] = analysis.takes.map((t: any) => ({
                ...t,
                status: 'idle'
            }));
            setTakes(initialTakes);
            setStep(2);
            setIsAnalyzing(false);

            // 2. Start generation for each take (sequentially or in parallel?)
            // We'll do them in parallel for a better feeling, but with some delay
            initialTakes.forEach((take, index) => {
                startGeneration(index, take.prompt);
            });

        } catch (e: any) {
            toast.error(e.message || 'Erro na análise River Lab.');
            setIsAnalyzing(false);
        }
    };

    const startGeneration = async (index: number, prompt: string) => {
        setTakes(prev => {
            const newTakes = [...prev];
            newTakes[index].status = 'generating';
            return newTakes;
        });

        try {
            // Optional: Send the first image as reference
            const base64Image = await fileToBase64(imageFiles[0]);
            const response = await riverGenerate(prompt, base64Image);

            setTakes(prev => {
                const newTakes = [...prev];
                newTakes[index].status = 'completed';
                newTakes[index].videoUrl = response.videoUrl;
                return newTakes;
            });
            toast.success(`Take "${takes[index]?.title || 'Vídeo'}" iniciado!`);
        } catch (e) {
            setTakes(prev => {
                const newTakes = [...prev];
                newTakes[index].status = 'error';
                return newTakes;
            });
            toast.error(`Erro no Take ${index + 1}`);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
                <div className="absolute top-[30%] left-[20%] w-[30%] h-[30%] bg-cyan-500/5 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-8">
                <div className="flex items-center gap-6">
                    <Link to="/admin" className="p-2 hover:bg-white/5 rounded-full transition-all">
                        <ChevronLeft className="w-5 h-5 text-zinc-400" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Layers className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="text-sm font-bold tracking-tight">River Lab <span className="text-blue-400 font-normal">v3.1 Veo</span></h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">GCP Credits Active</span>
                            <span className="text-xs text-green-400 font-semibold">R$ 1.400,00</span>
                        </div>
                        <img src={`https://ui-avatars.com/api/?name=${currentUser.username}&background=111&color=fff`} className="w-8 h-8 rounded-full border border-white/10" alt="Avatar" />
                    </div>
                    <button onClick={() => navigate('/admin/login')} className="p-2 hover:bg-red-500/10 rounded-full text-zinc-500 hover:text-red-400 transition-all">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative z-10">
                <AnimatePresence mode="wait">
                    {/* STEP 1: UPLOAD & SETUP */}
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-4xl mx-auto">
                            <div className="text-center mb-16 space-y-4">
                                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                                    <Sparkles className="w-3 h-3" /> Powered by Veo 3.1
                                </motion.div>
                                <h2 className="text-6xl font-bold tracking-tighter mb-4">Produção em Massa <br /><span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent italic">sem esforço.</span></h2>
                                <p className="text-zinc-500 text-lg max-w-2xl mx-auto">Arraste as fotos do produto. O River Lab irá analisar o DNA visual e gerar 4 takes cinemáticos de alta conversão automaticamente.</p>
                            </div>

                            <div className="bg-[#0A0A0A] border border-white/5 rounded-[3rem] p-16 shadow-2xl relative overflow-hidden group/card">
                                {/* Subtle Grid Pattern */}
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group cursor-pointer border-2 border-dashed border-white/5 hover:border-blue-500/40 hover:bg-blue-500/[0.02] rounded-[2.5rem] p-20 transition-all duration-700 text-center flex flex-col items-center gap-8 relative z-10"
                                >
                                    <div className="w-24 h-24 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-zinc-600 group-hover:text-blue-400 group-hover:scale-110 group-hover:border-blue-500/20 transition-all duration-700 shadow-xl">
                                        <Camera className="w-12 h-12" />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-2xl font-semibold tracking-tight">Carregar Amostras do Produto</h3>
                                        <p className="text-zinc-500 max-w-xs mx-auto">Suporta até 6 fotos em alta resolução para precisão geométrica máxima.</p>
                                    </div>
                                </div>

                                {previewUrls.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-6 gap-4 mt-12 bg-black/40 p-6 rounded-[2rem] border border-white/5">
                                        {previewUrls.map((url, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
                                                <img src={url} className="w-full h-full object-cover" alt="Preview" />
                                                <button onClick={() => removeImage(idx)} className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                                                    <X className="w-6 h-6 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                        {previewUrls.length < 6 && (
                                            <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-white/5 hover:border-white/10 flex items-center justify-center text-zinc-700 hover:text-zinc-500 transition-all">
                                                <PlusIcon className="w-6 h-6" />
                                            </button>
                                        )}
                                    </motion.div>
                                )}

                                <div className="mt-16 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/5" />
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Diretrizes Adicionais</label>
                                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/5" />
                                    </div>
                                    <textarea
                                        value={marketingContext}
                                        onChange={(e) => setMarketingContext(e.target.value)}
                                        placeholder="EX: Estilo futurista, luz suave, detalhes em metal escovado... (Dê dicas, o Veo faz o resto)"
                                        className="w-full bg-black/60 border border-white/5 rounded-3xl p-8 text-sm outline-none focus:border-blue-500/30 min-h-[140px] transition-all placeholder:text-zinc-800 text-zinc-300 shadow-inner"
                                    />
                                </div>

                                <button
                                    onClick={handleStartProduction}
                                    disabled={isAnalyzing || imageFiles.length === 0}
                                    className="w-full mt-12 py-8 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.25em] text-sm rounded-[2rem] transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(37,99,235,0.2)] active:scale-[0.98]"
                                >
                                    {isAnalyzing ? (
                                        <><Loader2 className="w-6 h-6 animate-spin" /> Mapeando Geometria & Criando Blueprints...</>
                                    ) : (
                                        <><Wand2 className="w-5 h-5" /> Iniciar Produção River 3.1 <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>

                                <p className="text-center mt-6 text-[10px] text-zinc-700 font-bold uppercase tracking-widest italic">
                                    * Esta ação irá consumir créditos do Vertex AI (GCP)
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: MULTI-TAKE PRODUCTION */}
                    {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                            <div className="flex items-end justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-widest rounded-full animate-pulse">Produção Ativa</div>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 italic">4 Takes de 10 Segundos</span>
                                    </div>
                                    <h2 className="text-5xl font-bold tracking-tighter">Estúdio de Geração</h2>
                                    <p className="text-zinc-500 max-w-xl text-lg">O Veo 3.1 está renderizando 4 variações cinemáticas baseadas no DNA visual do seu produto.</p>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setStep(1)} className="px-8 py-4 bg-white/[0.03] border border-white/5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/[0.08] transition-all flex items-center gap-2">
                                        <RotateCcw className="w-4 h-4" /> Novo Projeto
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {takes.map((take, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col group shadow-2xl hover:border-blue-500/20 transition-all duration-500"
                                    >
                                        {/* Video Preview Area */}
                                        <div className="aspect-[9/16] relative bg-black flex flex-col items-center justify-center p-8 overflow-hidden">
                                            {take.status === 'generating' && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-10 bg-black/80 backdrop-blur-sm">
                                                    <div className="relative">
                                                        <div className="w-20 h-20 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin" />
                                                        <Video className="w-8 h-8 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                                                    </div>
                                                    <div className="text-center space-y-1">
                                                        <span className="block text-xs font-black uppercase tracking-widest text-blue-400">Rendering...</span>
                                                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Veo 3.1 Engine</span>
                                                    </div>
                                                    {/* Fake scanline effect */}
                                                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-blue-500/5 to-transparent h-1/2 w-full animate-scanline" />
                                                </div>
                                            )}

                                            {take.status === 'completed' && take.videoUrl && (
                                                <div className="absolute inset-0">
                                                    <video
                                                        src={take.videoUrl}
                                                        autoPlay
                                                        loop
                                                        muted
                                                        playsInline
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-8 flex flex-col justify-end">
                                                        <button className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-400 transition-all">
                                                            <Download className="w-4 h-4" /> Download 4K
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {take.status === 'completed' && !take.videoUrl && (
                                                <div className="text-center space-y-4">
                                                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-bold">Solicitação Enviada</p>
                                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Aguardando Processamento GCP</p>
                                                    </div>
                                                    <button className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all">Ver no Cloud Storage</button>
                                                </div>
                                            )}

                                            {take.status === 'error' && (
                                                <div className="text-center space-y-4">
                                                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                                        <AlertCircle className="w-8 h-8 text-red-400" />
                                                    </div>
                                                    <p className="text-sm font-bold">Erro na Geração</p>
                                                    <button onClick={() => startGeneration(idx, take.prompt)} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all">Tentar Novamente</button>
                                                </div>
                                            )}

                                            {take.status === 'idle' && (
                                                <div className="text-zinc-800 flex flex-col items-center gap-4">
                                                    <PlayCircle className="w-12 h-12 opacity-5" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-10">Waiting in Queue</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info Area */}
                                        <div className="p-8 space-y-4 bg-black/40 flex-1">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${take.status === 'generating' ? 'bg-blue-500 animate-pulse' : take.status === 'completed' ? 'bg-green-500' : 'bg-zinc-800'}`} />
                                                    <h3 className="text-lg font-bold tracking-tight text-zinc-200">{take.title}</h3>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 font-medium italic">"{take.visualHook}"</p>
                                            </div>

                                            <div className="pt-4 border-t border-white/5">
                                                <div className="flex items-center justify-between mb-3 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                                                    <span>Technical Prompt</span>
                                                    <button onClick={() => { navigator.clipboard.writeText(take.prompt); toast.success('Prompt copiado!'); }} className="text-blue-400 hover:text-white transition-colors">Copy</button>
                                                </div>
                                                <div className="bg-black/50 border border-white/5 rounded-xl p-4 text-[11px] text-zinc-400 leading-relaxed max-h-[80px] overflow-y-auto font-mono scrollbar-hide">
                                                    {take.prompt}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="bg-blue-600/5 border border-blue-500/10 rounded-[2rem] p-10 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <Box className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold">Consistência de Produto Garantida</h4>
                                        <p className="text-zinc-500 text-sm">O Veo 3.1 utiliza o mapeamento 3D das imagens enviadas para manter a geometria impecável em cada take.</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Estimated Cost</p>
                                    <p className="text-2xl font-black text-blue-400">~R$ 4,60 <span className="text-sm font-medium text-zinc-600 text-[10px]">(U$ 0.80)</span></p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Global Custom CSS for Animations */}
            <style>{`
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(200%); }
                }
                .animate-scanline {
                    animation: scanline 3s linear infinite;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}

function PlusIcon(props: any) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    )
}
