import React, { useState, useRef, useEffect } from 'react';
import {
    Copy, Check, ChevronLeft, Loader2, Upload,
    X, ArrowRight, Download, Video, DollarSign, LogOut,
    Smartphone, Monitor, Camera, Palette,
    Layers, Wand2, PlayCircle, Settings2, Dice5, ArrowLeft, PenTool,
    Star, BookImage, Trash2, Plus, History
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { analyzeProduct, analyzeScenery, generatePrompts, generateMockup, AIError, ProductAnalysis } from '../../services/ai';

interface Result {
    prompt: string;
    mockupUrl: string | null;
    feedback?: string;
}

interface FavoriteProject {
    id: string;
    name: string;
    description: string;
    productType: string;
    results: Result[];
    savedAt: string;
}

interface SavedMockup {
    id: string;
    url: string;
    label: string;
    savedAt: string;
}

const genders = [
    { id: 'Female', label: 'Feminino' },
    { id: 'Male', label: 'Masculino' },
    { id: 'Androgynous', label: 'Andr├│gino' },
    { id: 'Any', label: 'Qualquer' },
];

const skinTones = [
    { id: 'Light', label: 'Clara', color: '#fcdcb4' },
    { id: 'Medium', label: 'M├®dia', color: '#d09668' },
    { id: 'Dark', label: 'Escura', color: '#6b4124' },
    { id: 'Any', label: 'Qualquer', color: 'linear-gradient(45deg, #fcdcb4, #6b4124)' },
];

// hairColors removed because it was unused

const lightings = [
    { id: 'Golden Hour', label: 'Golden Hour', desc: 'Luz suave e dourada do p├┤r do sol' },
    { id: 'Bright Daylight', label: 'Dia Ensolarado', desc: 'Luz forte e natural' },
    { id: 'Night/Neon', label: 'Noite / Neon', desc: 'Vibrante e escuro' },
    { id: 'Studio Lighting', label: 'Est├║dio', desc: 'Visual t├®cnico e controlado' },
    { id: 'Overcast/Moody', label: 'Nublado', desc: 'Tom dram├ítico e frio' },
];

const styles = [
    { id: 'Cinematic', label: 'Cinem├ítico', desc: 'Visual de filme, alta qualidade' },
    { id: 'Raw Documentary', label: 'Doc Raw', desc: 'Realista, sem filtros' },
    { id: 'Commercial', label: 'Comercial TV', desc: 'Foco absoluto no brilho' },
    { id: 'Minimalist', label: 'Minimalista', desc: 'Fundo neutro e limpo' },
    { id: 'Cyberpunk', label: 'Cyberpunk', desc: 'Futurista e tecnol├│gico' },
    { id: 'Vintage 35mm', label: 'Vintage 35mm', desc: 'Textura de filme antigo' },
];

const sequenceTitles = [
    "Cena 1: Estabelecimento",
    "Cena 2: A├º├úo e Uso",
    "Cena 3: Detalhes e Textura",
    "Cena 4: ├éngulo Alternativo",
    "Cena 5: B-Roll Din├ómico",
    "Cena 6: Encerramento",
    "Cena 7: Extens├úo Extra",
    "Cena 8: Extens├úo Extra",
    "Cena 9: Extens├úo Extra"
];

export default function VideoLab() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [compressedImages, setCompressedImages] = useState<string[]>([]); // base64 for API
    const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
    const [editableDescription, setEditableDescription] = useState('');
    const [marketingContext, setMarketingContext] = useState('');
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
        script: '',
        characters: '',
        cameraAngle: '',
        sceneAction: '',
        audioDesign: '',
        animationSpeed: 'Normal',
        includeText: false,
        includeVoice: false,
        language: 'Portugu├¬s'
    });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isContinuing, setIsContinuing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [balanceVal, setBalanceVal] = useState('R$ 0,00');
    const [showFavorites, setShowFavorites] = useState(false);
    const [showMockupLib, setShowMockupLib] = useState(false);
    const [favorites, setFavorites] = useState<FavoriteProject[]>([]);
    const [savedMockups, setSavedMockups] = useState<SavedMockup[]>([]);
    const [renderAllOnInit, setRenderAllOnInit] = useState(false);
    const [loadingIndices, setLoadingIndices] = useState<number[]>([]);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('rivertasks_user') || '{}');

    // Load favorites & mockup library from localStorage
    useEffect(() => {
        try {
            const favs = JSON.parse(localStorage.getItem('sora_favorites') || '[]');
            setFavorites(favs);
            const mocks = JSON.parse(localStorage.getItem('sora_mockup_library') || '[]');
            setSavedMockups(mocks);
        } catch { }
    }, []);

    // Sync API Key from localStorage for persistence if needed by ai.ts
    useEffect(() => {
        const localApiKey = localStorage.getItem('gemini_api_key');
        if (!localApiKey) {
            const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
            if (envKey) localStorage.setItem('gemini_api_key', envKey);
        }
    }, []);

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

    const compressFile = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        let { width, height } = img;
                        const maxSize = 768;
                        if (width > maxSize || height > maxSize) {
                            const ratio = Math.min(maxSize / width, maxSize / height);
                            width = Math.round(width * ratio);
                            height = Math.round(height * ratio);
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d')!;
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.75));
                    } catch (_) {
                        resolve(dataUrl); // fallback to original
                    }
                };
                img.onerror = () => resolve(dataUrl);
                img.src = dataUrl;
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newFiles = Array.from(files);
        setImageFiles(prev => [...prev, ...newFiles]);
        // Create lightweight preview URLs (instant, no memory issues)
        const newUrls = newFiles.map(f => URL.createObjectURL(f));
        setPreviewUrls(prev => [...prev, ...newUrls]);
    };

    const removeImage = (index: number) => {
        // Revoke the object URL to free memory
        URL.revokeObjectURL(previewUrls[index]);
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
        setCompressedImages(prev => prev.filter((_, i) => i !== index));
    };

    // Simulated progress helper (Fix #5)
    const simulateProgress = (startVal: number, endVal: number, durationMs: number) => {
        const steps = 20;
        const increment = (endVal - startVal) / steps;
        const interval = durationMs / steps;
        let current = startVal;
        const timer = setInterval(() => {
            current += increment;
            if (current >= endVal) { clearInterval(timer); return; }
            setProgress(Math.round(current));
        }, interval);
        return timer;
    };

    // Error toast helper (Fix #2)
    const showError = (e: any) => {
        if (e instanceof AIError) {
            const icons: Record<string, string> = {
                SAFETY_FILTER: '­ƒøí´©Å', RATE_LIMIT: 'ÔÅ│', MODEL_NOT_FOUND: '­ƒöì',
                API_KEY_MISSING: '­ƒöæ', TIMEOUT: 'ÔÅ▒´©Å', UNKNOWN: 'ÔØî'
            };
            toast.error(`${icons[e.type] || 'ÔØî'} ${e.message}`);
        } else {
            toast.error('Erro inesperado. Tente novamente.');
        }
    };

    const handleAnalyze = async () => {
        // No-image mode: skip to step 2 with manual description
        if (imageFiles.length === 0) {
            const manualAnalysis: ProductAnalysis = {
                description: editableDescription || 'Product without reference images',
                productType: 'Produto',
                suggestedSceneriesProductOnly: ['Fundo branco minimalista com ilumina├º├úo de est├║dio', 'Superf├¡cie de m├írmore escuro com ilumina├º├úo dram├ítica', 'Mesa de madeira r├║stica com luz natural', 'Cen├írio tech futurista com neon'],
                suggestedSceneriesLifestyle: ['Cena urbana moderna com pessoa interagindo', 'Ambiente ao ar livre com luz natural dourada', 'Interior sofisticado com decora├º├úo premium', 'Cena casual do dia a dia']
            };
            setAnalysis(manualAnalysis);
            setEditableDescription(editableDescription);
            setOptions(prev => ({ ...prev, environment: manualAnalysis.suggestedSceneriesLifestyle[0] }));
            setStep(2);
            return;
        }
        setIsAnalyzing(true);
        setProgress(5);
        setProgressText('Comprimindo imagens para an├ílise...');
        const progressTimer = simulateProgress(5, 85, 40000);
        try {
            // Convert files to compressed base64 NOW (not on upload)
            setProgressText('Preparando imagens...');
            const base64Images = await Promise.all(imageFiles.map(f => compressFile(f)));
            const validImages = base64Images.filter(b => b.length > 0);
            setCompressedImages(validImages);
            setProgressText('Analisando DNA Visual do Produto...');
            const result = await analyzeProduct(validImages, marketingContext);
            // Also run scenery analysis in background for Scene Mode
            analyzeScenery(validImages, marketingContext).catch(() => { });
            clearInterval(progressTimer);
            setAnalysis(result);
            setEditableDescription(result.description);
            setOptions(prev => ({ ...prev, environment: result.suggestedSceneriesLifestyle[0] || '' }));
            setProgress(100);
            // Save analysis to session (lightweight, no images)
            try { sessionStorage.setItem('sora_analysis', JSON.stringify(result)); } catch (_) { }
            setTimeout(() => setStep(2), 500);
        } catch (error: any) {
            clearInterval(progressTimer);
            console.error('ANALYSIS_ERROR_LOG:', error);
            showError(error);
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
        setProgress(3);
        try {
            // Use editable description (Fix #7)
            const baseDescription = editableDescription || analysis.description;
            // Inject Hex Colors for fidelity
            const hexInfo = analysis.dominantHexColors?.length ? `\nADOPT THESE EXACT HEX COLORS: ${analysis.dominantHexColors.join(', ')}` : '';
            // Inject Selling Points to influence storyboard
            const hooksInfo = analysis.sellingPoints?.length ? `\nPONTOS DE VENDA A DESTACAR: ${analysis.sellingPoints.slice(0, 2).join(', ')}` : '';

            const finalDescription = (marketingContext.trim()
                ? `${baseDescription}\n\nMARKETING CONTEXT: ${marketingContext.trim()}`
                : baseDescription) + hexInfo + hooksInfo;

            setProgressText('Engenharia de Prompts (Sora 2 Cinematic Engine)...');
            const progressTimer = simulateProgress(3, 18, 45000);
            const prompts = await generatePrompts(finalDescription, options, undefined, analysis.colors);
            clearInterval(progressTimer);
            setProgress(20);
            const newResults: Result[] = prompts.map(p => ({ prompt: p, mockupUrl: null }));
            setResults(newResults);

            const targets = renderAllOnInit ? prompts : prompts.slice(0, 1);
            setProgressText(`Renderizando ${targets.length} Mockup(s) com Fidelidade Pro...`);

            // Render sequentially to show progress and avoid state corruption
            for (let i = 0; i < targets.length; i++) {
                const mockupUrl = await generateMockup(finalDescription, options, i, compressedImages, prompts[i])
                    .catch(e => { console.warn(`Mockup ${i + 1} failed:`, e); return null; });

                setResults(prev => {
                    const updated = [...prev];
                    if (updated[i]) {
                        updated[i] = { ...updated[i], mockupUrl };
                    }
                    return updated;
                });

                // Small delay to allow UI to breathe
                if (i < targets.length - 1) await new Promise(r => setTimeout(r, 1000));
            }

            setProgress(100);
            // Save results to session (Fix #9)
            try { sessionStorage.setItem('sora_results', JSON.stringify(newResults)); } catch (_) { }
        } catch (e: any) {
            console.error('FULL_API_ERROR_OBJECT:', e);
            showError(e);
            setStep(2);
        } finally {
            setIsGenerating(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const handleContinueFlow = async () => {
        if (!analysis) return;
        const baseDescription = editableDescription || analysis.description;
        const finalDescription = marketingContext.trim()
            ? `${baseDescription}\n\nMARKETING CONTEXT: ${marketingContext.trim()}`
            : baseDescription;
        setIsContinuing(true);
        setProgress(5);
        try {
            setProgressText('Expandindo Sequ├¬ncia Narrativa...');
            const progressTimer = simulateProgress(5, 28, 40000);
            const previousPrompts = results.map(r => r.prompt);
            const newPrompts = await generatePrompts(finalDescription, options, previousPrompts, analysis.colors);
            clearInterval(progressTimer);
            setProgress(30);
            const startIndex = results.length;
            const newResults: Result[] = newPrompts.map(p => ({ prompt: p, mockupUrl: null }));
            setResults(prev => [...prev, ...newResults]);

            setProgressText(`Renderizando ${newPrompts.length} Mockups extras...`);

            for (let i = 0; i < newPrompts.length; i++) {
                const mockupUrl = await generateMockup(finalDescription, options, startIndex + i, compressedImages, newPrompts[i])
                    .catch(e => { console.warn(`Mockup extra ${i + 1} failed:`, e); return null; });

                setResults(prev => {
                    const updated = [...prev];
                    const targetIndex = startIndex + i;
                    if (updated[targetIndex]) {
                        updated[targetIndex] = { ...updated[targetIndex], mockupUrl };
                    }
                    return updated;
                });

                if (i < newPrompts.length - 1) await new Promise(r => setTimeout(r, 1000));
            }

            setProgress(100);
        } catch (error: any) {
            showError(error);
        } finally {
            setIsContinuing(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const handleRegenerateTake = async (index: number) => {
        if (!analysis || loadingIndices.includes(index)) return;
        setLoadingIndices(prev => [...prev, index]);
        const baseDescription = editableDescription || analysis.description;
        const hexInfo = analysis.dominantHexColors?.length ? `\nADOPT THESE EXACT HEX COLORS: ${analysis.dominantHexColors.join(', ')}` : '';
        const hooksInfo = analysis.sellingPoints?.length ? `\nPONTOS DE VENDA A DESTACAR: ${analysis.sellingPoints.slice(0, 2).join(', ')}` : '';

        const finalDescription = (marketingContext.trim()
            ? `${baseDescription}\n\nMARKETING CONTEXT: ${marketingContext.trim()}`
            : baseDescription) + hexInfo + hooksInfo;

        toast.promise(
            (async () => {
                const newOptions = { ...options, supportingDescription: `Regenerate scene ${index + 1} with a completely different creative angle.` };
                const newPrompts = await generatePrompts(
                    finalDescription, newOptions,
                    results.slice(0, index).map(r => r.prompt)
                );
                const newPrompt = newPrompts[0];
                const mockupUrl = await generateMockup(finalDescription, newOptions, index, compressedImages, newPrompt);
                setResults(prev => {
                    const updated = [...prev];
                    updated[index] = { prompt: newPrompt, mockupUrl };
                    return updated;
                });
            })().finally(() => setLoadingIndices(prev => prev.filter(i => i !== index))),
            {
                loading: 'Regenerando take com nova perspectiva...',
                success: 'Take atualizado com sucesso!',
                error: (e) => e instanceof AIError ? e.message : 'Erro ao regenerar take.',
            }
        );
    };

    const handleMagicEnhance = async (index: number) => {
        if (!analysis || loadingIndices.includes(index)) return;
        const currentDraft = results[index].prompt;
        if (!currentDraft.trim()) {
            toast.error('Escreva uma ideia curta primeiro para a M├ígica funcionar!');
            return;
        }

        setLoadingIndices(prev => [...prev, index]);
        const baseDescription = editableDescription || analysis.description;
        const hexInfo = analysis.dominantHexColors?.length ? `\nADOPT THESE EXACT HEX COLORS: ${analysis.dominantHexColors.join(', ')}` : '';
        const hooksInfo = analysis.sellingPoints?.length ? `\nPONTOS DE VENDA A DESTACAR: ${analysis.sellingPoints.slice(0, 2).join(', ')}` : '';

        const finalDescription = (marketingContext.trim()
            ? `${baseDescription}\n\nMARKETING CONTEXT: ${marketingContext.trim()}`
            : baseDescription) + hexInfo + hooksInfo;

        toast.promise(
            (async () => {
                const newPrompts = await generatePrompts(finalDescription, options, undefined, undefined, currentDraft);
                const newPrompt = newPrompts[0];
                const mockupUrl = await generateMockup(finalDescription, options, index, compressedImages, newPrompt);
                setResults(prev => {
                    const updated = [...prev];
                    updated[index] = { prompt: newPrompt, mockupUrl };
                    return updated;
                });
            })().finally(() => setLoadingIndices(prev => prev.filter(i => i !== index))),
            {
                loading: 'M├ígica de Cena: Criando Blueprint & Mockup...',
                success: 'Cena aprimorada e renderizada!',
                error: (e) => e instanceof AIError ? e.message : 'Erro na M├ígica de Cena.',
            }
        );
    };

    const handleRegenerateMockup = async (index: number) => {
        if (!analysis || loadingIndices.includes(index)) return;
        setLoadingIndices(prev => [...prev, index]);
        const baseDescription = editableDescription || analysis.description;
        const hexInfo = analysis.dominantHexColors?.length ? `\nADOPT THESE EXACT HEX COLORS: ${analysis.dominantHexColors.join(', ')}` : '';
        const hooksInfo = analysis.sellingPoints?.length ? `\nPONTOS DE VENDA A DESTACAR: ${analysis.sellingPoints.slice(0, 2).join(', ')}` : '';

        const finalDescription = (marketingContext.trim()
            ? `${baseDescription}\n\nMARKETING CONTEXT: ${marketingContext.trim()}`
            : baseDescription) + hexInfo + hooksInfo;

        toast.promise(
            (async () => {
                const mockupUrl = await generateMockup(finalDescription, options, index, compressedImages, results[index].prompt);
                setResults(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], mockupUrl };
                    return updated;
                });
            })().finally(() => setLoadingIndices(prev => prev.filter(i => i !== index))),
            {
                loading: 'Renderizando mockup com prompt atual...',
                success: 'Mockup renderizado com sucesso!',
                error: (e) => e instanceof AIError ? e.message : 'Erro ao renderizar mockup.',
            }
        );
    };

    const updatePrompt = (index: number, newPrompt: string) => {
        setResults(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], prompt: newPrompt };
            return updated;
        });
    };



    const addManualScene = () => {
        setResults(prev => [...prev, { prompt: '', mockupUrl: null }]);
        // Scroll to bottom
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };



    const copyMockupImage = async (mockupUrl: string) => {
        try {
            const res = await fetch(mockupUrl);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            toast.success('Mockup copiado!');
        } catch { toast.error('Navegador n├úo suporta copiar imagens.'); }
    };

    const downloadAllPrompts = () => {
        let txt = `River Sora Lab ÔÇö Project Export\n${'='.repeat(40)}\n\n`;
        results.forEach((r, i) => {
            txt += `--- Scene ${i + 1} ---\n${r.prompt}\n\n`;
        });
        const blob = new Blob([txt], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'sora_prompts.txt';
        a.click();
        URL.revokeObjectURL(a.href);
        // Also download mockups
        results.forEach((r, i) => {
            if (r.mockupUrl) {
                const link = document.createElement('a');
                link.href = r.mockupUrl;
                link.download = `mockup_scene_${i + 1}.png`;
                link.click();
            }
        });
        toast.success('Prompts e mockups baixados!');
    };

    const goBackToConfigure = () => {
        setStep(2);
    };

    const regenerateSuggestions = async () => {
        if (!analysis || compressedImages.length === 0) {
            toast.error('Sem imagens para re-analisar.');
            return;
        }
        toast.promise(
            (async () => {
                const result = await analyzeProduct(compressedImages);
                setAnalysis(result);
                setEditableDescription(result.description);
                setOptions(prev => ({ ...prev, environment: (prev.mode === 'lifestyle' ? result.suggestedSceneriesLifestyle[0] : result.suggestedSceneriesProductOnly[0]) || '' }));
            })(),
            { loading: 'Regenerando sugest├Áes de cena...', success: 'Novas sugest├Áes geradas!', error: 'Erro ao regenerar.' }
        );
    };

    // === FAVORITES ===

    const deleteFavorite = (id: string) => {
        const updated = favorites.filter(f => f.id !== id);
        setFavorites(updated);
        try { localStorage.setItem('sora_favorites', JSON.stringify(updated)); } catch { }
        toast('Favorito removido.', { icon: '­ƒùæ´©Å' });
    };

    const loadFavorite = (fav: FavoriteProject) => {
        setResults(fav.results);
        setEditableDescription(fav.description);
        setStep(3);
        setShowFavorites(false);
        toast.success('Projeto carregado!');
    };

    // === MOCKUP LIBRARY ===
    const saveMockupToLibrary = (url: string, label: string) => {
        const mock: SavedMockup = { id: Date.now().toString(), url, label, savedAt: new Date().toLocaleString('pt-BR') };
        const updated = [mock, ...savedMockups].slice(0, 30); // max 30
        setSavedMockups(updated);
        try { localStorage.setItem('sora_mockup_library', JSON.stringify(updated)); } catch { }
        toast.success('­ƒÆ¥ Mockup salvo na biblioteca!');
    };

    const deleteSavedMockup = (id: string) => {
        const updated = savedMockups.filter(m => m.id !== id);
        setSavedMockups(updated);
        try { localStorage.setItem('sora_mockup_library', JSON.stringify(updated)); } catch { }
    };

    return (
        <div className="min-h-screen relative font-sans text-white bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] overflow-x-hidden selection:bg-cyan-500/30">
            {/* Atmospheric Backgrounds - matching Dashboard */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.05)_0%,_transparent_70%)] blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.03)_0%,_transparent_70%)] blur-[120px]" />
            </div>

            {/* Premium Header - Exactly Like Dashboard */}
            <nav className="fixed top-0 left-0 right-0 z-[60] pt-4 md:pt-6 px-4 md:px-10 pointer-events-auto">
                <div className="max-w-[1500px] mx-auto">
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 md:py-2.5 px-4 rounded-[1.5rem] md:rounded-full isolate">
                        {/* Solid Background Layer */}
                        <div className="absolute inset-0 bg-[#141414] border border-white/5 rounded-[1.5rem] md:rounded-full -z-10 overflow-hidden" />

                        {/* Top Row on Mobile / Left Section on Desktop */}
                        <div className="flex items-center justify-between w-full md:w-auto">
                            <div className="flex items-center gap-4 group">
                                <Link to="/admin" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                    <ChevronLeft className="w-5 h-5 text-zinc-400" />
                                </Link>
                                <div className="relative flex items-center gap-4">
                                    <div className="relative">
                                        <div className="absolute -inset-2 bg-cyan-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.3)]">
                                            <PlayCircle className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-lg font-display font-bold text-white tracking-widest hidden sm:block uppercase pb-0.5">RIVER LAB</span>
                                        <span className="text-[8px] text-cyan-400 font-bold tracking-[0.3em] uppercase hidden sm:block">Engine v14.2</span>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Icons Area */}
                            <div className="flex items-center gap-3 md:hidden">
                                <Link to="/admin/financeiro" className="h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center px-4 hover:bg-emerald-500/20 hover:border-emerald-500 shrink-0 gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    <span className="font-bold text-xs tracking-wider">{balanceVal.replace('R$', '').trim()}</span>
                                </Link>
                                <button
                                    onClick={() => { setShowFavorites(!showFavorites); setShowMockupLib(false); }}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showFavorites ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : 'bg-white/5 border border-white/10 text-white/50'}`}
                                >
                                    <Star className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => { setShowMockupLib(!showMockupLib); setShowFavorites(false); }}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showMockupLib ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-white/5 border border-white/10 text-white/50'}`}
                                >
                                    <BookImage className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Desktop Area */}
                        <div className="hidden md:flex items-center gap-4 shrink-0">
                            <div className="h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center px-4 gap-2">
                                <DollarSign className="w-4 h-4" />
                                <span className="font-bold text-xs tracking-wider">{balanceVal}</span>
                            </div>

                            <div className="h-6 w-px bg-white/10 mx-1" />

                            <button
                                onClick={() => { setShowFavorites(!showFavorites); setShowMockupLib(false); }}
                                className={`h-10 px-5 rounded-full font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 transition-all ${showFavorites ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white'}`}
                            >
                                <Star className={`w-4 h-4 ${showFavorites ? 'fill-yellow-400' : ''}`} />
                                <span>Favoritos</span>
                            </button>

                            <button
                                onClick={() => { setShowMockupLib(!showMockupLib); setShowFavorites(false); }}
                                className={`h-10 px-5 rounded-full font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 transition-all ${showMockupLib ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white'}`}
                            >
                                <BookImage className="w-4 h-4" />
                                <span>Galeria</span>
                            </button>

                            <button
                                className="h-10 px-5 rounded-full font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 transition-all bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                            >
                                <History className="w-4 h-4" />
                                <span>Histórico</span>
                            </button>

                            <div className="h-6 w-px bg-white/10 mx-1" />

                            <div className="flex items-center gap-3 shrink-0">
                                <img
                                    src={`/${currentUser.username?.toLowerCase() || 'default'}.webp`}
                                    alt={currentUser.username}
                                    className="w-10 h-10 rounded-full border border-white/20 object-cover shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                                    onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=0D8ABC&color=fff`; }}
                                />
                                <button
                                    onClick={handleLogout}
                                    className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-500 hover:bg-red-500/20 hover:border-red-500 group transition-all"
                                    title="Sair"
                                >
                                    <LogOut className="w-4 h-4 ml-0.5 opacity-80 group-hover:opacity-100" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* === FAVORITES PANEL === */}
            <AnimatePresence>
                {showFavorites && (
                    <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="fixed top-16 right-0 bottom-0 w-96 z-40 bg-black/90 backdrop-blur-2xl border-l border-white/5 overflow-y-auto">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> Favoritos</h3>
                                <button onClick={() => setShowFavorites(false)} className="p-1 hover:bg-white/10 rounded-full"><X className="w-4 h-4 text-zinc-400" /></button>
                            </div>
                            {favorites.length === 0 ? (
                                <p className="text-xs text-zinc-600 text-center py-12">Nenhum projeto salvo ainda.</p>
                            ) : favorites.map(fav => (
                                <div key={fav.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl space-y-2 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-white">{fav.name}</span>
                                        <button onClick={() => deleteFavorite(fav.id)} className="p-1 hover:bg-red-500/20 rounded-full text-zinc-600 hover:text-red-400 transition-all"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 line-clamp-2">{fav.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-600">{fav.results.length} cenas ┬À {fav.savedAt}</span>
                                        <button onClick={() => loadFavorite(fav)} className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">Carregar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* === MOCKUP LIBRARY PANEL === */}
            <AnimatePresence>
                {showMockupLib && (
                    <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="fixed top-16 right-0 bottom-0 w-96 z-40 bg-black/90 backdrop-blur-2xl border-l border-white/5 overflow-y-auto">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><BookImage className="w-4 h-4 text-purple-400" /> Biblioteca de Mockups</h3>
                                <button onClick={() => setShowMockupLib(false)} className="p-1 hover:bg-white/10 rounded-full"><X className="w-4 h-4 text-zinc-400" /></button>
                            </div>
                            {savedMockups.length === 0 ? (
                                <p className="text-xs text-zinc-600 text-center py-12">Nenhum mockup salvo ainda.</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {savedMockups.map(mock => (
                                        <div key={mock.id} className="relative group rounded-xl overflow-hidden border border-white/5 hover:border-white/15 transition-all">
                                            <img src={mock.url} className="w-full aspect-square object-cover" alt={mock.label} />
                                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <a href={mock.url} download className="p-2 bg-white/10 rounded-full hover:bg-cyan-500 transition-all"><Download className="w-3.5 h-3.5 text-white" /></a>
                                                <button onClick={() => deleteSavedMockup(mock.id)} className="p-2 bg-white/10 rounded-full hover:bg-red-500 transition-all"><Trash2 className="w-3.5 h-3.5 text-white" /></button>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80">
                                                <p className="text-[9px] text-zinc-300 truncate">{mock.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-10 pt-32 pb-24 relative z-10">
                {/* Advanced Step Indicator */}
                <div className="mb-16 flex items-center justify-center max-w-2xl mx-auto">
                    {[
                        { s: 1, label: 'Asset Import', icon: Upload },
                        { s: 2, label: 'Engine Config', icon: Settings2 },
                        { s: 3, label: 'Master Render', icon: Wand2 }
                    ].map((stepObj, idx) => (
                        <React.Fragment key={stepObj.s}>
                            <div className="flex flex-col items-center gap-3 relative group">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 relative isolate overflow-hidden ${step === stepObj.s ? 'scale-110' : ''}`}>
                                    {/* Animated background for active step */}
                                    {step === stepObj.s && (
                                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-600 to-cyan-400 animate-pulse -z-10" />
                                    )}
                                    <div className={`absolute inset-0 ${step > stepObj.s ? 'bg-emerald-500/20' : step === stepObj.s ? '' : 'bg-white/5'} border ${step > stepObj.s ? 'border-emerald-500/30' : step === stepObj.s ? 'border-cyan-400/50' : 'border-white/10'} -z-10 rounded-2xl`} />

                                    <stepObj.icon className={`w-6 h-6 transition-colors duration-500 ${step === stepObj.s ? 'text-black' : step > stepObj.s ? 'text-emerald-400' : 'text-zinc-500'}`} />

                                    {step > stepObj.s && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#1a1a1a]">
                                            <Check className="w-3 h-3 text-black" strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${step === stepObj.s ? 'text-cyan-400' : 'text-zinc-500'}`}>
                                    {stepObj.label}
                                </span>
                            </div>
                            {idx < 2 && (
                                <div className="flex-1 px-4 mb-6">
                                    <div className={`h-0.5 rounded-full transition-all duration-1000 ${step > stepObj.s ? 'bg-emerald-500/40' : 'bg-white/5'}`} />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="max-w-4xl mx-auto">
                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden group shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-emerald-500/5 opacity-30 pointer-events-none" />

                                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />

                                <div className="text-center mb-12">
                                    <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-8 relative group-hover:scale-110 transition-transform duration-700 isolate">
                                        <div className="absolute inset-0 bg-cyan-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Upload className="w-10 h-10 text-cyan-400 relative z-10" />
                                    </div>
                                    <h2 className="text-4xl font-display font-medium text-white mb-4 tracking-tight">Análise de Ativos</h2>
                                    <p className="text-white/40 font-light max-w-sm mx-auto leading-relaxed uppercase text-[10px] tracking-[0.3em]">Arraste fotos do produto ou selecione em seu dispositivo</p>
                                </div>

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative bg-black/40 border-2 border-dashed border-white/5 rounded-3xl p-10 cursor-pointer hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all duration-700 isolate group/drop"
                                >
                                    {previewUrls.length === 0 ? (
                                        <div className="py-16 flex flex-col items-center gap-6">
                                            <div className="w-px h-12 bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent" />
                                            <span className="text-sm text-white/30 font-medium uppercase tracking-[0.3em] group-hover/drop:text-cyan-400/50 transition-colors">Import Your Creation</span>
                                            <div className="w-px h-12 bg-gradient-to-t from-transparent via-cyan-500/50 to-transparent" />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                            {previewUrls.map((url, idx) => (
                                                <motion.div
                                                    layout
                                                    key={idx}
                                                    className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group/img"
                                                >
                                                    <img src={url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                        <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all">
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                            <div className="aspect-square flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                                                <Plus className="w-8 h-8 text-white/20" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-12 space-y-8">
                                    {previewUrls.length === 0 && (
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] flex items-center gap-3 px-2">
                                                <PenTool className="w-3.5 h-3.5" /> Descrição Manual do Objeto
                                            </label>
                                            <textarea
                                                value={editableDescription}
                                                onChange={(e) => setEditableDescription(e.target.value)}
                                                placeholder="Descreva o produto com detalhes: materiais, cores, acabamento..."
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-sm text-white placeholder:text-white/10 outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all resize-none min-h-[140px] font-light leading-relaxed"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] flex items-center gap-3 px-2">
                                            <Settings2 className="w-3.5 h-3.5" /> Contexto de Marketing (Opcional)
                                        </label>
                                        <textarea
                                            value={marketingContext}
                                            onChange={(e) => setMarketingContext(e.target.value)}
                                            placeholder="Público-alvo, benefícios-chave, canal de veiculação..."
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-sm text-white placeholder:text-white/10 outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all resize-none min-h-[100px] font-light leading-relaxed"
                                        />
                                    </div>

                                    <button
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing || (imageFiles.length === 0 && !editableDescription.trim())}
                                        className="w-full h-20 bg-white text-black rounded-full font-bold text-xs tracking-[0.3em] uppercase flex items-center justify-center gap-4 hover:bg-cyan-50 shadow-[0_20px_60px_rgba(0,0,0,0.4)] hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-20 disabled:pointer-events-none group"
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                <span>EXTRACTING VISUAL DNA...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>ANALYZE PRODUCT</span>
                                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && analysis && (
                        <motion.div key="s2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left Column: Summary & Mode */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] -z-10" />

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.3em]">Identified Subject</label>
                                        <p className="text-3xl font-display font-medium text-white tracking-tight leading-none">{analysis.productType}</p>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-white/5">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] flex items-center gap-2">
                                            <PenTool className="w-3.5 h-3.5" /> Descrição AI (Editável)
                                        </label>
                                        <textarea
                                            value={editableDescription}
                                            onChange={(e) => setEditableDescription(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-xs text-white leading-relaxed outline-none focus:border-cyan-500/50 min-h-[160px] resize-none font-light"
                                        />
                                    </div>

                                    <div className="space-y-4 pt-6">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Sequence Mode</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'product_only', label: 'Studio', icon: Monitor },
                                                { id: 'lifestyle', label: 'Lifestyle', icon: Smartphone },
                                                { id: 'script', label: 'Script', icon: Layers },
                                                { id: 'scenery', label: 'Cenários', icon: Camera }
                                            ].map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setOptions({ ...options, mode: m.id, environment: (m.id === 'lifestyle' ? analysis.suggestedSceneriesLifestyle[0] : m.id === 'product_only' ? analysis.suggestedSceneriesProductOnly[0] : options.environment) })}
                                                    className={`h-14 rounded-2xl border transition-all duration-500 flex items-center justify-center gap-3 group/btn ${options.mode === m.id ? 'bg-cyan-500 text-black border-cyan-400 font-bold' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/20'}`}
                                                >
                                                    <m.icon className={`w-4 h-4 ${options.mode === m.id ? 'text-black' : 'text-white/20 group-hover/btn:text-white/40'}`} />
                                                    <span className="text-[10px] uppercase tracking-widest">{m.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Detailed Configuration */}
                            <div className="lg:col-span-8 space-y-6">
                                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] -z-10" />

                                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                            <Settings2 className="w-5 h-5 text-white/40" />
                                        </div>
                                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                                            {options.mode === 'script' ? 'Manual Script Directives' : options.mode === 'scenery' ? 'Environmental Controls' : 'Physics & Subject DNA'}
                                        </h3>
                                    </div>

                                    {/* Sub-modes Content */}
                                    {options.mode === 'script' ? (
                                        <div className="space-y-4">
                                            <textarea
                                                value={options.script}
                                                onChange={(e) => setOptions({ ...options, script: e.target.value })}
                                                placeholder="Insira seu roteiro detalhado aqui. A IA processará cada cena individualmente para máxima precisão cinematográfica..."
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-sm text-white outline-none focus:border-purple-500/50 min-h-[400px] leading-relaxed transition-colors font-light"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between px-2">
                                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Ambientes Recomendados</label>
                                                <button onClick={regenerateSuggestions} className="group flex items-center gap-2 text-[9px] font-bold text-cyan-400/60 hover:text-cyan-400 transition-colors uppercase tracking-widest">
                                                    <Dice5 className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" /> Regenerar
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(options.mode === 'product_only' ? analysis.suggestedSceneriesProductOnly : analysis.suggestedSceneriesLifestyle).map((s, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setOptions({ ...options, environment: s })}
                                                        className={`p-6 rounded-2xl border text-left transition-all duration-500 relative isolate overflow-hidden group/scenery ${options.environment === s ? 'bg-cyan-500/10 border-cyan-400 group-hover/scenery:bg-cyan-500/20' : 'bg-white/[0.02] border-white/5 text-white/30 hover:border-white/20 hover:bg-white/[0.05]'}`}
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className={`mt-0.5 w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${options.environment === s ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'border-white/10 bg-white/5'}`}>
                                                                {options.environment === s && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                                                            </div>
                                                            <span className={`text-[11px] leading-relaxed font-light ${options.environment === s ? 'text-white' : ''}`}>{s}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Specific Scenery Controls */}
                                    {options.mode === 'scenery' && (
                                        <div className="mt-8 space-y-8 pt-8 border-t border-white/5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] px-2">Ângulo Primário</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {['Drone pullback', 'Tracking dolly', 'Cinematic orbit', 'POV Handheld'].map(angle => (
                                                            <button key={angle} onClick={() => setOptions({ ...options, cameraAngle: angle })} className={`h-12 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${options.cameraAngle === angle ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}>{angle}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] px-2">Ação do Cenário</label>
                                                    <input
                                                        value={options.sceneAction}
                                                        onChange={(e) => setOptions({ ...options, sceneAction: e.target.value })}
                                                        placeholder="Ex: Pôr do sol dinâmico..."
                                                        className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-xl px-5 text-xs text-white outline-none focus:border-emerald-500/50 transition-all font-light"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Global Visual Options */}
                                    {options.mode !== 'script' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pt-10 border-t border-white/5">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] px-2 italic">Color & Light Physics</label>
                                                <div className="relative">
                                                    <select value={options.timeOfDay} onChange={(e) => setOptions({ ...options, timeOfDay: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 h-16 text-xs text-white outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-all font-light">
                                                        {lightings.map(l => <option key={l.id} value={l.id} className="bg-[#1a1a1a]">{l.label}</option>)}
                                                    </select>
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                                                        <Settings2 className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] px-2 italic">Aesthetic Realism</label>
                                                <div className="relative">
                                                    <select value={options.style} onChange={(e) => setOptions({ ...options, style: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 h-16 text-xs text-white outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-all font-light">
                                                        {styles.map(st => <option key={st.id} value={st.id} className="bg-[#1a1a1a]">{st.label}</option>)}
                                                    </select>
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                                                        <Palette className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Lifestyle Personalization */}
                                    {options.mode === 'lifestyle' && (
                                        <div className="mt-10 pt-10 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-5">
                                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] px-2 italic">Subject DNA</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {genders.map(g => (
                                                        <button key={g.id} onClick={() => setOptions({ ...options, gender: g.id })} className={`px-5 h-10 rounded-full border text-[10px] font-bold tracking-widest uppercase transition-all ${options.gender === g.id ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                                                            {g.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-4 items-center">
                                                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic mr-2">Tone</span>
                                                    {skinTones.map(s => (
                                                        <button key={s.id} onClick={() => setOptions({ ...options, skinTone: s.id })} className={`w-8 h-8 rounded-xl border-2 transition-all ${options.skinTone === s.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`} style={{ background: s.color }} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] px-2">Sora Consistent Tags</label>
                                                <input
                                                    value={options.supportingDescription}
                                                    onChange={(e) => setOptions({ ...options, supportingDescription: e.target.value })}
                                                    placeholder="Ex: @Alex leading role, lens flares..."
                                                    className="w-full h-16 bg-white/[0.03] border border-white/10 rounded-2xl px-6 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 transition-all font-light"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Aspect Ratio (The Hero Choice) */}
                                    <div className="mt-12 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center gap-6">
                                        <div className="flex-1 w-full grid grid-cols-2 gap-4">
                                            <button onClick={() => setOptions({ ...options, aspectRatio: '16:9' })} className={`h-20 rounded-[2rem] border-2 transition-all duration-500 flex items-center justify-center gap-4 group ${options.aspectRatio === '16:9' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'}`}>
                                                <Monitor className={`w-6 h-6 ${options.aspectRatio === '16:9' ? 'text-black' : 'text-white/20 group-hover:text-white/40'}`} />
                                                <span className="text-sm font-display font-medium uppercase tracking-widest">16:9 Wide</span>
                                            </button>
                                            <button onClick={() => setOptions({ ...options, aspectRatio: '9:16' })} className={`h-20 rounded-[2rem] border-2 transition-all duration-500 flex items-center justify-center gap-4 group ${options.aspectRatio === '9:16' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'}`}>
                                                <Smartphone className={`w-6 h-6 ${options.aspectRatio === '9:16' ? 'text-black' : 'text-white/20 group-hover:text-white/40'}`} />
                                                <span className="text-sm font-display font-medium uppercase tracking-widest">9:16 Reels</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Strategy Footer Info */}
                                    <div className="mt-10 p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-3xl flex flex-wrap items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                                <Star className="w-5 h-5 fill-cyan-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest leading-none block">Product DNA Sync Active</span>
                                                <span className="text-[9px] text-white/40 font-light block italic">High-fidelity texture & color mapping enabled.</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setRenderAllOnInit(!renderAllOnInit)}
                                            className="px-6 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                                        >
                                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${!renderAllOnInit ? 'bg-emerald-500 border-emerald-400' : 'border-emerald-500/40'}`}>
                                                {!renderAllOnInit && <Check className="w-2 h-2 text-black" />}
                                            </div>
                                            Economy: {!renderAllOnInit ? 'ON' : 'OFF'}
                                        </button>
                                    </div>

                                    <div className="mt-12">
                                        <button onClick={handleGenerate} className="w-full h-20 bg-white text-black rounded-full font-bold text-xs tracking-[0.4em] uppercase flex items-center justify-center gap-4 hover:bg-cyan-50 shadow-[0_30px_60px_rgba(0,0,0,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all group overflow-hidden relative">
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cyan-500 via-transparent to-cyan-500 opacity-20 pointer-events-none" />
                                            <span>GENERATE CINEMATIC ENGINE</span>
                                            <Wand2 className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: MASTER RESULTS */}
                    {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                            {/* Header for results */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-4 px-2">
                                <div className="space-y-4">
                                    <h2 className="text-5xl font-display font-medium text-white tracking-tight leading-none uppercase italic">Project Master</h2>
                                    <div className="flex items-center gap-4 text-white/30 text-[10px] font-bold uppercase tracking-[0.3em]">
                                        <span>{options.aspectRatio === '16:9' ? 'Horizontal Cine' : 'Vertical Reels'}</span>
                                        <div className="w-1 h-1 rounded-full bg-white/10" />
                                        <span>{results.length} Sequences Planned</span>
                                        <div className="w-1 h-1 rounded-full bg-white/10" />
                                        <span className="text-cyan-400">Ready for Render</span>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={goBackToConfigure} className="h-14 px-8 rounded-full border border-white/10 text-white/50 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all flex items-center gap-3">
                                        <ArrowLeft className="w-4 h-4" /> Voltar
                                    </button>
                                    <button onClick={downloadAllPrompts} className="h-14 px-10 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-50 transition-all flex items-center gap-3 shadow-2xl">
                                        <Download className="w-4 h-4" /> Export Bundle
                                    </button>
                                </div>
                            </div>

                            {/* Progress Indicator */}
                            {(isGenerating || isContinuing) && (
                                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-cyan-500/20 backdrop-blur-3xl rounded-[2.5rem] p-10 mb-10 shadow-2xl overflow-hidden relative isolate">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5" />
                                    <div className="absolute top-0 left-0 h-1 bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all duration-500" style={{ width: `${progress}%` }} />

                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center text-black">
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">{progressText}</span>
                                                <p className="text-[10px] text-white/20 uppercase tracking-widest">Sora 2 Cinematic Engine Rendering System</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-4xl font-display font-medium text-white">{Math.round(progress)}%</span>
                                            <p className="text-[9px] text-white/10 uppercase tracking-widest mt-1">Completion Est: {Math.round((100 - progress) * 0.8)}s</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {results.map((res, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="group/card relative isolate"
                                    >
                                        <div className="absolute -inset-2 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-[2.5rem] blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-700" />

                                        <div className="bg-[#141414] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col h-full relative z-10 hover:border-white/20 transition-all duration-700 shadow-2xl">
                                            {/* Media / Preview */}
                                            <div className="relative aspect-video bg-black isolate overflow-hidden">
                                                {loadingIndices.includes(i) ? (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-cyan-400 bg-cyan-950/20 backdrop-blur-sm">
                                                        <Loader2 className="w-10 h-10 animate-spin" />
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Cine Take #{i + 1}</span>
                                                    </div>
                                                ) : res.mockupUrl ? (
                                                    <img src={res.mockupUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-105" alt="" onClick={() => setLightboxUrl(res.mockupUrl!)} />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/10 group-hover/card:text-cyan-500/30 transition-colors">
                                                        <Video className="w-12 h-12" />
                                                        <span className="text-[10px] uppercase font-bold tracking-[0.3em]">Cine Take #{i + 1}</span>
                                                    </div>
                                                )}

                                                <div className="absolute top-6 left-6 flex items-center gap-2">
                                                    <div className="px-3 h-7 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${res.mockupUrl ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-white/20'}`} />
                                                        <span className="text-[9px] font-bold text-white uppercase tracking-widest">Scene 0{i + 1}</span>
                                                    </div>
                                                </div>

                                                <div className="absolute top-6 right-6 flex gap-2">
                                                    {res.mockupUrl && (
                                                        <>
                                                            <button onClick={() => copyMockupImage(res.mockupUrl!)} className="w-9 h-9 bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10 opacity-0 group-hover/card:opacity-100 translate-y-2 group-hover/card:translate-y-0 duration-300">
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => saveMockupToLibrary(res.mockupUrl!, `Scene ${i + 1}`)} className="w-9 h-9 bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10 opacity-0 group-hover/card:opacity-100 translate-y-2 group-hover/card:translate-y-0 duration-300 delay-75">
                                                                <BookImage className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
                                            </div>

                                            {/* Content */}
                                            <div className="p-8 flex-1 flex flex-col">
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">{sequenceTitles[i] || 'B-Roll Sequence'}</span>
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3].map(dot => <div key={dot} className="w-1 h-1 rounded-full bg-white/10" />)}
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 min-h-[140px]">
                                                        <textarea
                                                            value={res.prompt}
                                                            onChange={(e) => updatePrompt(i, e.target.value)}
                                                            className="w-full bg-transparent text-xs text-zinc-400 leading-relaxed outline-none resize-none font-mono custom-scrollbar min-h-[120px]"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between gap-4">
                                                    {!res.mockupUrl && !loadingIndices.includes(i) ? (
                                                        <button
                                                            onClick={() => handleRegenerateMockup(i)}
                                                            className="flex-1 h-14 bg-cyan-500 text-black rounded-2xl flex items-center justify-center gap-3 transition-all font-bold group/btn shadow-xl shadow-cyan-900/20 active:scale-95"
                                                        >
                                                            <Camera className="w-5 h-5" />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">Render Master Take</span>
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleMagicEnhance(i)} className="flex-1 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center gap-3 transition-all text-white/50 hover:text-white group/btn border border-white/5 hover:border-white/10">
                                                                <Wand2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                                <span className="text-[10px] font-bold uppercase tracking-widest">Magic Refine</span>
                                                            </button>
                                                            <button onClick={() => handleRegenerateTake(i)} className="w-14 h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-white/20 hover:text-white rounded-2xl flex items-center justify-center transition-all active:scale-95">
                                                                <Dice5 className="w-5 h-5" />
                                                            </button>
                                                            <button onClick={() => setResults(prev => prev.filter((_, idx) => idx !== i))} className="w-14 h-14 bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl flex items-center justify-center transition-all active:scale-95">
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Global Actions */}
                            {!isGenerating && !isContinuing && (
                                <div className="pt-20 flex flex-col md:flex-row items-center justify-center gap-12 border-t border-white/5 relative">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 px-8 py-2 bg-[#1a1a1a] border border-white/5 rounded-full -translate-y-1/2">
                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.5em]">Creative Expansion</span>
                                    </div>

                                    <button onClick={handleContinueFlow} className="group flex flex-col items-center gap-4 text-white/20 hover:text-cyan-400 transition-colors duration-500">
                                        <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-cyan-500/10 group-hover:border-cyan-500/40 group-hover:-translate-y-2 transition-all duration-700 isolate overflow-hidden">
                                            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <Plus className="w-8 h-8 text-cyan-400" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Extend Sequence</span>
                                    </button>

                                    <button onClick={addManualScene} className="group flex flex-col items-center gap-4 text-white/20 hover:text-purple-400 transition-colors duration-500">
                                        <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-purple-500/10 group-hover:border-purple-500/40 group-hover:-translate-y-2 transition-all duration-700 isolate overflow-hidden">
                                            <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <PenTool className="w-8 h-8 text-purple-400" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Manual Scene</span>
                                    </button>

                                    <button onClick={() => { setStep(1); setResults([]); }} className="group flex flex-col items-center gap-4 text-white/20 hover:text-red-400 transition-colors duration-500">
                                        <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-red-500/10 group-hover:border-red-500/40 group-hover:-translate-y-2 transition-all duration-700 isolate overflow-hidden">
                                            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <History className="w-8 h-8 text-red-400" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Reset Master</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Custom Scrollbar Styles */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                `}} />
            </main>

            {/* === LIGHTBOX MODAL === */}
            <AnimatePresence>
                {lightboxUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8"
                        onClick={() => setLightboxUrl(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative max-w-[90vw] max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img src={lightboxUrl} className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/10 object-contain" alt="Mockup Full" />
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={() => copyMockupImage(lightboxUrl)} className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-cyan-500 transition-all border border-white/20" title="Copiar">
                                    <Copy className="w-4 h-4" />
                                </button>
                                <a href={lightboxUrl} download className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-cyan-500 transition-all border border-white/20" title="Baixar">
                                    <Download className="w-4 h-4" />
                                </a>
                                <button onClick={() => setLightboxUrl(null)} className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-all border border-white/20" title="Fechar">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
