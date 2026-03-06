import React, { useState, useRef } from 'react';
import {
    ChevronLeft, Upload, X, ArrowRight, Wand2,
    Sparkles, Camera, Layers, Box, Monitor, Smartphone,
    Fingerprint, Zap, PlayCircle, LogOut, Star, BookImage,
    Download, Copy, Trash2, Loader2, RotateCcw
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { analyzeProduct, generatePrompts, generateMockup, ProductAnalysis, CommercialConcept } from '../../services/ai';

interface Result {
    prompt: string;
    mockupUrl: string | null;
}

export default function VideoLab() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [marketingContext, setMarketingContext] = useState('');
    const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
    const [selectedConcept, setSelectedConcept] = useState<CommercialConcept | null>(null);
    const [results, setResults] = useState<Result[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('rivertasks_user') || '{}');

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newFiles = Array.from(files);
        setImageFiles(prev => [...prev, ...newFiles]);
        const newUrls = newFiles.map(f => URL.createObjectURL(f));
        setPreviewUrls(prev => [...prev, ...newUrls]);
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

    const handleAnalyze = async () => {
        if (imageFiles.length === 0) {
            toast.error('Adicione pelo menos uma imagem.');
            return;
        }
        setIsAnalyzing(true);
        try {
            const base64Images = await Promise.all(imageFiles.map(f => fileToBase64(f)));
            const result = await analyzeProduct(base64Images, marketingContext);
            setAnalysis(result);
            setStep(2);
        } catch (e: any) {
            toast.error(e.message || 'Erro na análise.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSelectConcept = async (concept: CommercialConcept) => {
        setSelectedConcept(concept);
        setIsGenerating(true);
        setStep(3);
        try {
            const prompts = await generatePrompts(analysis!.description, concept, marketingContext);
            const base64Images = await Promise.all(imageFiles.map(f => fileToBase64(f)));
            const mockupUrl = await generateMockup(analysis!.description, prompts[0], base64Images);
            setResults([{ prompt: prompts[0], mockupUrl }]);
        } catch (e: any) {
            toast.error(e.message || 'Erro na geração.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-8">
                <div className="flex items-center gap-6">
                    <Link to="/admin" className="p-2 hover:bg-white/5 rounded-full transition-all">
                        <ChevronLeft className="w-5 h-5 text-zinc-400" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                            <PlayCircle className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="text-sm font-bold tracking-tight">Sora Lab <span className="text-cyan-400 font-normal">v2.0</span></h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                        <span className="text-xs text-zinc-400">{currentUser.username}</span>
                        <img src={`https://ui-avatars.com/api/?name=${currentUser.username}&background=111&color=fff`} className="w-8 h-8 rounded-full border border-white/10" alt="Avatar" />
                    </div>
                    <button onClick={() => navigate('/admin/login')} className="p-2 hover:bg-red-500/10 rounded-full text-zinc-500 hover:text-red-400 transition-all">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 pt-32 pb-20 relative z-10">
                <AnimatePresence mode="wait">
                    {/* STEP 1: UPLOAD */}
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto">
                            <div className="text-center mb-12">
                                <h2 className="text-4xl font-bold tracking-tighter mb-4">Laboratory of the Future</h2>
                                <p className="text-zinc-500 text-lg">Upload your product images and let the AI Director create the vision.</p>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-12 backdrop-blur-3xl shadow-2xl">
                                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />

                                <div onClick={() => fileInputRef.current?.click()} className="group cursor-pointer border-2 border-dashed border-white/10 hover:border-cyan-500/50 rounded-3xl p-16 transition-all duration-500 text-center flex flex-col items-center gap-6">
                                    <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-cyan-400 group-hover:scale-110 transition-all duration-500">
                                        <Upload className="w-10 h-10" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-semibold">Drop product photos</h3>
                                        <p className="text-sm text-zinc-500">Provide different angles for better DNA extraction.</p>
                                    </div>
                                </div>

                                {previewUrls.length > 0 && (
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-8">
                                        {previewUrls.map((url, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                                                <img src={url} className="w-full h-full object-cover" alt="Preview" />
                                                <button onClick={() => removeImage(idx)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <X className="w-5 h-5 text-red-500" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-12 space-y-4">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Marketing Context (Optional)</label>
                                    <textarea
                                        value={marketingContext}
                                        onChange={(e) => setMarketingContext(e.target.value)}
                                        placeholder="Target audience, main benefit, mood... help the Director understand your goal."
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm outline-none focus:border-cyan-500/50 min-h-[120px] transition-all placeholder:text-zinc-700"
                                    />
                                </div>

                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || imageFiles.length === 0}
                                    className="w-full mt-10 py-6 bg-white hover:bg-cyan-50 text-black font-bold uppercase tracking-[0.2em] text-sm rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                                >
                                    {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing DNA...</> : <>Extract DNA & Plan Concepts <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: CONCEPTS */}
                    {step === 2 && analysis && (
                        <motion.div key="s2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12">
                            <div className="flex items-end justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Fingerprint className="w-6 h-6 text-cyan-400" />
                                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">Visual DNA Extracted</span>
                                    </div>
                                    <h2 className="text-5xl font-bold tracking-tighter">Choose Your Vision</h2>
                                    <p className="text-zinc-500 max-w-xl text-lg">The AI Director processed your product and architected 4 premium directions. Select one to proceed.</p>
                                </div>
                                <button onClick={() => setStep(1)} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full text-xs font-semibold uppercase tracking-wider transition-all">Change Photos</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {analysis.concepts.map((concept, idx) => (
                                    <motion.div
                                        key={idx}
                                        whileHover={{ y: -8, scale: 1.01 }}
                                        onClick={() => handleSelectConcept(concept)}
                                        className="group cursor-pointer bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 rounded-[2rem] p-8 transition-all duration-500 relative overflow-hidden flex flex-col justify-between min-h-[320px]"
                                    >
                                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-100 group-hover:text-cyan-400 transition-all">
                                            {concept.category === 'TECHNICAL_DETAIL' && <Box className="w-12 h-12" />}
                                            {concept.category === 'LIFESTYLE_LUXURY' && <Sparkles className="w-12 h-12" />}
                                            {concept.category === 'SURREAL_AVANT_GARDE' && <Zap className="w-12 h-12" />}
                                            {concept.category === 'PRODUCT_FOCUS' && <Camera className="w-12 h-12" />}
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(8,145,178,1)]" />
                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{concept.category.replace('_', ' ')}</span>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-3xl font-bold tracking-tight group-hover:text-cyan-400 transition-colors">{concept.title}</h3>
                                                <p className="text-zinc-400 leading-relaxed">{concept.visualHook}</p>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-8">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 italic">Director's Note:</span>
                                                <p className="text-[11px] text-zinc-500 italic max-w-xs">{concept.commercialReason}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-black transition-all">
                                                <ArrowRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: RESULTS */}
                    {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <h2 className="text-4xl font-bold tracking-tighter">Cinematic Blueprint</h2>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                        <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">{selectedConcept?.title}</span>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setStep(2)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 hover:bg-white/10 transition-all">
                                        <RotateCcw className="w-4 h-4" /> Change Concept
                                    </button>
                                    <button onClick={() => { setStep(1); setResults([]); }} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full transition-all">New Project</button>
                                </div>
                            </div>

                            {isGenerating ? (
                                <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-24 flex flex-col items-center justify-center gap-8 min-h-[600px] text-center">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                                        <Wand2 className="w-8 h-8 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold tracking-tight">Directing Scenario...</h3>
                                        <p className="text-zinc-500">Calculating lighting physics, motion dynamics, and product fidelity.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    {/* Mockup Preview */}
                                    <div className="lg:col-span-12">
                                        {results[0]?.mockupUrl ? (
                                            <div className="relative group rounded-[3rem] overflow-hidden border border-white/5 aspect-video bg-black/50">
                                                <img src={results[0].mockupUrl} className="w-full h-full object-cover" alt="Mockup" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-12">
                                                    <div className="flex items-center gap-4">
                                                        <button onClick={() => navigator.clipboard.writeText(results[0].prompt)} className="px-8 py-4 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-full flex items-center gap-3 hover:bg-cyan-400 transition-all">
                                                            <Copy className="w-4 h-4" /> Copy Sora Blueprint
                                                        </button>
                                                        <a href={results[0].mockupUrl} download className="p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all">
                                                            <Download className="w-5 h-5" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="aspect-video bg-white/[0.02] border border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-zinc-700">
                                                <Camera className="w-16 h-16 mb-4" />
                                                <p className="text-sm uppercase tracking-widest font-bold">Mockup Unavailable</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Prompt Content */}
                                    <div className="lg:col-span-12 bg-white/[0.02] border border-white/5 rounded-[3rem] p-12 space-y-8">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                                <Monitor className="w-5 h-5 text-cyan-400" />
                                            </div>
                                            <h3 className="text-xl font-bold">Sora 2 Technical Blueprint</h3>
                                        </div>

                                        <div className="bg-black/60 border border-white/10 rounded-2xl p-8 font-mono text-zinc-300 leading-relaxed text-sm">
                                            {results[0]?.prompt}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl space-y-2">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Motion Architecture</span>
                                                <p className="text-xs text-zinc-400 font-medium">Simple & Decisive (Optimized for Sora 2)</p>
                                            </div>
                                            <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl space-y-2">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Visual Quality</span>
                                                <p className="text-xs text-zinc-400 font-medium">Kinetic High-Fidelity Commercial</p>
                                            </div>
                                            <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl space-y-2">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Stability Lock</span>
                                                <p className="text-xs text-zinc-400 font-medium">Verified Geometry & Detail Safety</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
