import React, { useState, useRef, useEffect } from 'react';
import {
    Copy, Check, ChevronLeft, Loader2, Upload,
    X, ArrowRight, Download, Video, DollarSign, LogOut,
    Smartphone, Monitor, Camera, Palette,
    Layers, Wand2, PlayCircle, Settings2, Dice5, FileDown, ArrowLeft, PenTool,
    Star, BookImage, Trash2, Fingerprint
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { analyzeProduct, analyzeScenery, generateSceneConcepts, generateBlueprintFromMockup, generateMockup, AIError, ProductAnalysis, SceneryAnalysis } from '../../services/ai';

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
    { id: 'Androgynous', label: 'Andrógino' },
    { id: 'Any', label: 'Qualquer' },
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
        language: 'Português'
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
    const [sceneryData, setSceneryData] = useState<SceneryAnalysis | null>(null);
    const [loadingIndices, setLoadingIndices] = useState<number[]>([]);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);

    // V18 NEW STATES
    const [aiEngine, setAiEngine] = useState<'ultra' | 'speed'>('ultra');
    const [showDNAInspector, setShowDNAInspector] = useState(false);
    const [editableDNA, setEditableDNA] = useState<any>(null);

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
                SAFETY_FILTER: '🛡️', RATE_LIMIT: '⏳', MODEL_NOT_FOUND: '🔍',
                API_KEY_MISSING: '🔑', TIMEOUT: '⏱️', UNKNOWN: '❌'
            };
            toast.error(`${icons[e.type] || '❌'} ${e.message}`);
        } else {
            toast.error('Erro inesperado. Tente novamente.');
        }
    };

    const composeFinalDescription = (analysisData: ProductAnalysis, includeEnhancers = true) => {
        const baseDescription = editableDescription || analysisData.description;
        const marketingInfo = marketingContext.trim()
            ? `\n\nMARKETING CONTEXT: ${marketingContext.trim()}`
            : '';
        const hexInfo = includeEnhancers && analysisData.dominantHexColors?.length
            ? `\nADOPT THESE EXACT HEX COLORS: ${analysisData.dominantHexColors.join(', ')}`
            : '';
        const hooksInfo = includeEnhancers && analysisData.sellingPoints?.length
            ? `\nPONTOS DE VENDA A DESTACAR: ${analysisData.sellingPoints.slice(0, 2).join(', ')}`
            : '';

        const dna = editableDNA || (analysisData as any).productDNA;
        const branding = editableDNA ? { text: editableDNA.brandingText } : (analysisData as any).branding;
        const dnaInfo = dna ? `\n\nSTRUCTURED_PRODUCT_DNA:
category=${dna.category || ''}
quantity=${dna.quantity || ''}
upper_material=${dna.upperMaterial || ''}
sole_material=${dna.soleMaterial || ''}
sole_shape=${dna.soleShape || ''}
logo_position=${dna.logoPosition || ''}
logo_type=${dna.logoType || ''}
texture_scale=${dna.textureScale || ''}
rigidity_upper=${dna.rigidity?.upper || ''}
rigidity_sole=${dna.rigidity?.sole || ''}` : '';
        const brandingInfo = branding && branding.text
            ? `\nBRANDING_LOCK: Brand text "${branding.text}" must stay readable, undistorted, and in the expected position/orientation (${branding.position || 'unknown'} / ${branding.orientation || 'unknown'}).`
            : '';

        return `${baseDescription}${marketingInfo}${hexInfo}${hooksInfo}${dnaInfo}${brandingInfo}`;
    };

    const handleAnalyze = async () => {
        // No-image mode: skip to step 2 with manual description
        if (imageFiles.length === 0) {
            const manualAnalysis: ProductAnalysis = {
                description: editableDescription || 'Product without reference images',
                productType: 'Produto',
                suggestedSceneriesProductOnly: ['Fundo branco minimalista com iluminação de estúdio', 'Superfície de mármore escuro com iluminação dramática', 'Mesa de madeira rústica com luz natural', 'Cenário tech futurista com neon'],
                suggestedSceneriesLifestyle: ['Cena urbana moderna com pessoa interagindo', 'Ambiente ao ar livre com luz natural dourada', 'Interior sofisticado com decoração premium', 'Cena casual do dia a dia']
            };
            setAnalysis(manualAnalysis);
            setEditableDescription(editableDescription);
            setOptions(prev => ({ ...prev, environment: manualAnalysis.suggestedSceneriesLifestyle[0] }));
            setStep(2);
            return;
        }
        setIsAnalyzing(true);
        setProgress(5);
        setProgressText('Comprimindo imagens para análise...');
        const progressTimer = simulateProgress(5, 85, 40000);
        try {
            // Convert files to compressed base64 NOW (not on upload)
            setProgressText('Preparando imagens...');
            const base64Images = await Promise.all(imageFiles.map(f => compressFile(f)));
            const validImages = base64Images.filter(b => b.length > 0);
            setCompressedImages(validImages);
            setProgressText('Analisando DNA Visual do Produto...');
            const result = await analyzeProduct(validImages, marketingContext, aiEngine);
            // Also run scenery analysis in background for Scene Mode
            analyzeScenery(validImages, marketingContext).then(sd => setSceneryData(sd)).catch(() => { });
            clearInterval(progressTimer);
            setAnalysis(result);
            setEditableDescription(result.description);
            
            // V18 DNA INSPECTOR
            setEditableDNA({
                category: result.productDNA?.category || '',
                quantity: result.productDNA?.quantity || '',
                upperMaterial: result.productDNA?.upperMaterial || '',
                soleMaterial: result.productDNA?.soleMaterial || '',
                soleShape: result.productDNA?.soleShape || '',
                logoPosition: result.productDNA?.logoPosition || '',
                logoType: result.productDNA?.logoType || '',
                brandingText: result.branding?.text || '',
                rawThinking: result.rawThinking || ''
            });

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
            const finalDescription = composeFinalDescription(analysis, true);

            setProgressText('Concepção de Cenários...');
            const progressTimer = simulateProgress(3, 18, 45000);
            const concepts = await generateSceneConcepts(finalDescription, options, aiEngine);
            clearInterval(progressTimer);
            setProgress(20);
            
            const newResults: Result[] = concepts.map(_c => ({ prompt: 'Aguardando geração do Mockup...', mockupUrl: null }));
            setResults(newResults);

            const targets = renderAllOnInit ? concepts : concepts.slice(0, 1);
            setProgressText(`Renderizando ${targets.length} Mockup(s) Vision-First...`);

            // Render sequentially to show progress and avoid state corruption
            for (let i = 0; i < targets.length; i++) {
                // 1. Generate Mockup based on Scene Concept
                const mockupUrl = await generateMockup(finalDescription, options, i, compressedImages, concepts[i], aiEngine)
                    .catch(e => { console.warn(`Mockup ${i + 1} failed:`, e); return null; });
                
                let finalPrompt = concepts[i];
                // 2. Generate Blueprint from generated Mockup
                if (mockupUrl) {
                    setProgressText(`Visão Computacional: Analisando frame ${i + 1} para Blueprint...`);
                    finalPrompt = await generateBlueprintFromMockup(mockupUrl, finalDescription, options, concepts[i], aiEngine)
                        .catch(e => { console.warn(`Blueprint extraction failed:`, e); return concepts[i]; });
                }

                setResults(prev => {
                    const updated = [...prev];
                    if (updated[i]) {
                        updated[i] = { prompt: finalPrompt, mockupUrl };
                    }
                    return updated;
                });

                if (i < targets.length - 1) await new Promise(r => setTimeout(r, 1000));
            }

            setProgress(100);
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
        const finalDescription = composeFinalDescription(analysis, true);
        setIsContinuing(true);
        setProgress(5);
        try {
            setProgressText('Concebendo novas cenas...');
            const progressTimer = simulateProgress(5, 28, 40000);
            
            // Get more concepts
            const newConcepts = await generateSceneConcepts(finalDescription, options, aiEngine);
            clearInterval(progressTimer);
            setProgress(30);
            
            const startIndex = results.length;
            const newResults: Result[] = newConcepts.map(_c => ({ prompt: 'Aguardando Mockup...', mockupUrl: null }));
            setResults(prev => [...prev, ...newResults]);

            setProgressText(`Gerando ${newConcepts.length} cenas Vision-First...`);

            for (let i = 0; i < newConcepts.length; i++) {
                const mockupUrl = await generateMockup(finalDescription, options, startIndex + i, compressedImages, newConcepts[i], aiEngine)
                    .catch(e => { console.warn(`Mockup extra ${i + 1} failed:`, e); return null; });

                let finalPrompt = newConcepts[i];
                if (mockupUrl) {
                    finalPrompt = await generateBlueprintFromMockup(mockupUrl, finalDescription, options, newConcepts[i], aiEngine)
                        .catch(() => newConcepts[i]);
                }

                setResults(prev => {
                    const updated = [...prev];
                    const targetIndex = startIndex + i;
                    if (updated[targetIndex]) {
                        updated[targetIndex] = { prompt: finalPrompt, mockupUrl };
                    }
                    return updated;
                });

                if (i < newConcepts.length - 1) await new Promise(r => setTimeout(r, 1000));
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
        const finalDescription = composeFinalDescription(analysis, true);

        toast.promise(
            (async () => {
                const newOptions = { ...options, supportingDescription: `Regenerate scene ${index + 1} with a completely different creative angle.` };
                
                // 1. New Concept
                const newConcepts = await generateSceneConcepts(finalDescription, newOptions, aiEngine);
                const newConcept = newConcepts[0] || "Alternative product shot";
                
                // 2. New Mockup
                const mockupUrl = await generateMockup(finalDescription, newOptions, index, compressedImages, newConcept, aiEngine);
                
                // 3. New Blueprint
                let finalPrompt = newConcept;
                if (mockupUrl) {
                    finalPrompt = await generateBlueprintFromMockup(mockupUrl, finalDescription, newOptions, newConcept, aiEngine);
                }

                setResults(prev => {
                    const updated = [...prev];
                    updated[index] = { prompt: finalPrompt, mockupUrl };
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
            toast.error('Escreva uma ideia curta primeiro para a Mágica funcionar!');
            return;
        }

        setLoadingIndices(prev => [...prev, index]);
        const finalDescription = composeFinalDescription(analysis, true);

        toast.promise(
            (async () => {
                // 1. Generate Mockup from Draft
                const mockupUrl = await generateMockup(finalDescription, options, index, compressedImages, currentDraft, aiEngine);
                
                // 2. Generate Blueprint from Mockup
                let finalPrompt = currentDraft;
                if (mockupUrl) {
                    finalPrompt = await generateBlueprintFromMockup(mockupUrl, finalDescription, options, currentDraft, aiEngine);
                }

                setResults(prev => {
                    const updated = [...prev];
                    updated[index] = { prompt: finalPrompt, mockupUrl };
                    return updated;
                });
            })().finally(() => setLoadingIndices(prev => prev.filter(i => i !== index))),
            {
                loading: 'Mágica de Cena: Criando Blueprint & Mockup...',
                success: 'Cena aprimorada e renderizada!',
                error: (e) => e instanceof AIError ? e.message : 'Erro na Mágica de Cena.',
            }
        );
    };

    const handleRegenerateMockup = async (index: number) => {
        if (!analysis || loadingIndices.includes(index)) return;
        setLoadingIndices(prev => [...prev, index]);
        const finalDescription = composeFinalDescription(analysis, true);

        toast.promise(
            (async () => {
                // Use the current prompt to guide the mockup
                const mockupUrl = await generateMockup(finalDescription, options, index, compressedImages, results[index].prompt, aiEngine);
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

    const updateFeedback = (index: number, newFeedback: string) => {
        setResults(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], feedback: newFeedback };
            return updated;
        });
    };

    const handleRegenerateWithFeedback = async (index: number) => {
        if (!analysis || loadingIndices.includes(index)) return;
        const currentDraft = results[index].prompt;
        const feedback = results[index].feedback;
        if (!feedback?.trim()) {
            toast.error('Escreva o que você não gostou para melhorar!');
            return;
        }

        setLoadingIndices(prev => [...prev, index]);
        const finalDescription = composeFinalDescription(analysis, true);

        const draftWithFeedback = `CURRENT CONCEPT:\n${currentDraft}\n\nDIRECTOR'S FEEDBACK (FIX THESE ISSUES):\n${feedback}`;

        toast.promise(
            (async () => {
                const newOptions = { ...options, supportingDescription: draftWithFeedback };
                // 1. Concept
                const newConcepts = await generateSceneConcepts(finalDescription, newOptions, aiEngine);
                const newConcept = newConcepts[0] || draftWithFeedback;
                
                // 2. Mockup
                const mockupUrl = await generateMockup(finalDescription, options, index, compressedImages, newConcept, aiEngine);
                
                // 3. Blueprint
                let finalPrompt = newConcept;
                if (mockupUrl) {
                    finalPrompt = await generateBlueprintFromMockup(mockupUrl, finalDescription, options, newConcept, aiEngine);
                }

                setResults(prev => {
                    const updated = [...prev];
                    updated[index] = { prompt: finalPrompt, mockupUrl, feedback: '' };
                    return updated;
                });
            })().finally(() => setLoadingIndices(prev => prev.filter(i => i !== index))),
            {
                loading: 'Aplicando feedback do Diretor...',
                success: 'Nova versão gerada com sucesso!',
                error: (e) => e instanceof AIError ? e.message : 'Erro ao aplicar feedback.',
            }
        );
    };

    const addManualScene = () => {
        setResults(prev => [...prev, { prompt: '', mockupUrl: null }]);
        // Scroll to bottom
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    const handleRenderAllVisible = async () => {
        if (!analysis) return;
        const finalDescription = composeFinalDescription(analysis, true);

        const missingIndices = results.map((r, i) => r.mockupUrl === null ? i : -1).filter(i => i !== -1);
        if (missingIndices.length === 0) {
            toast.success('Todos os mockups já foram renderizados!');
            return;
        }

        toast.promise(
            (async () => {
                for (const index of missingIndices) {
                    setLoadingIndices(prev => [...prev, index]);
                    try {
                        const mockupUrl = await generateMockup(finalDescription, options, index, compressedImages, results[index].prompt, aiEngine);
                        setResults(prev => {
                            const updated = [...prev];
                            updated[index] = { ...updated[index], mockupUrl };
                            return updated;
                        });
                    } finally {
                        setLoadingIndices(prev => prev.filter(i => i !== index));
                    }
                    // Small delay between calls
                    await new Promise(r => setTimeout(r, 1000));
                }
            })(),
            {
                loading: `Renderizando ${missingIndices.length} mockups pendentes...`,
                success: 'Storyboard completo!',
                error: 'Erro ao renderizar mockups.',
            }
        );
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Prompt copiado!');
    };

    const copyMockupImage = async (mockupUrl: string) => {
        try {
            const res = await fetch(mockupUrl);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            toast.success('Mockup copiado!');
        } catch { toast.error('Navegador não suporta copiar imagens.'); }
    };

    const downloadAllPrompts = () => {
        let txt = `River Sora Lab — Project Export\n${'='.repeat(40)}\n\n`;
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
                const result = await analyzeProduct(compressedImages, '', aiEngine);
                setAnalysis(result);
                setEditableDescription(result.description);
                setOptions(prev => ({ ...prev, environment: (prev.mode === 'lifestyle' ? result.suggestedSceneriesLifestyle[0] : result.suggestedSceneriesProductOnly[0]) || '' }));
            })(),
            { loading: 'Regenerando sugestões de cena...', success: 'Novas sugestões geradas!', error: 'Erro ao regenerar.' }
        );
    };

    // === FAVORITES ===
    const saveToFavorites = () => {
        if (results.length === 0 || !analysis) return;
        const proj: FavoriteProject = {
            id: Date.now().toString(),
            name: analysis.productType || 'Projeto',
            description: editableDescription.slice(0, 100),
            productType: analysis.productType,
            results: results.map(r => ({ prompt: r.prompt, mockupUrl: r.mockupUrl })),
            savedAt: new Date().toLocaleString('pt-BR')
        };
        const updated = [proj, ...favorites].slice(0, 20); // max 20
        setFavorites(updated);
        try { localStorage.setItem('sora_favorites', JSON.stringify(updated)); } catch { }
        toast.success('⭐ Projeto salvo nos favoritos!');
    };

    const deleteFavorite = (id: string) => {
        const updated = favorites.filter(f => f.id !== id);
        setFavorites(updated);
        try { localStorage.setItem('sora_favorites', JSON.stringify(updated)); } catch { }
        toast('Favorito removido.', { icon: '🗑️' });
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
        toast.success('💾 Mockup salvo na biblioteca!');
    };

    const deleteSavedMockup = (id: string) => {
        const updated = savedMockups.filter(m => m.id !== id);
        setSavedMockups(updated);
        try { localStorage.setItem('sora_mockup_library', JSON.stringify(updated)); } catch { }
    };

    return (
        <div className="min-h-screen bg-[#030303] text-zinc-300 font-sans selection:bg-cyan-500/30 relative overflow-hidden">
            {/* Glassmorphic Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-sm border-b border-white/5 px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link to="/admin" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-zinc-400" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center shadow-md">
                            <PlayCircle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold tracking-tight text-white">River Sora Lab</h1>
                            <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-[0.2em]">Production Engine <span className="text-cyan-500">v18.6</span></p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* V18 AI ENGINE SELECTOR */}
                    <div className="flex items-center bg-white/[0.03] border border-white/5 rounded-full p-1 mr-4">
                        <button 
                            onClick={() => setAiEngine('speed')}
                            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all ${aiEngine === 'speed' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            ⚡ Speed
                        </button>
                        <button 
                            onClick={() => setAiEngine('ultra')}
                            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all ${aiEngine === 'ultra' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            💎 Ultra
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setShowFavorites(!showFavorites); setShowMockupLib(false); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all ${showFavorites ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'}`}>
                            <Star className="w-3.5 h-3.5" /> Favoritos
                        </button>
                        <button onClick={() => { setShowMockupLib(!showMockupLib); setShowFavorites(false); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all ${showMockupLib ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'}`}>
                            <BookImage className="w-3.5 h-3.5" /> Galeria
                        </button>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/5 rounded-full">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-medium text-zinc-300">{balanceVal}</span>
                    </div>
                    <div className="flex items-center gap-3 pl-4 border-l border-white/5">
                        <img
                            src={`/${currentUser.username?.toLowerCase() || 'default'}.webp`}
                            className="w-8 h-8 rounded-full border border-white/10 object-cover"
                            alt="User"
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=111&color=fff`; }}
                        />
                        <button onClick={handleLogout} className="p-2 hover:bg-red-500/10 rounded-full text-zinc-500 hover:text-red-400 transition-all">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* === FAVORITES PANEL === */}
            <AnimatePresence>
                {showFavorites && (
                    <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="fixed top-16 right-0 bottom-0 w-96 z-40 bg-black/90 backdrop-blur-sm border-l border-white/5 overflow-y-auto">
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
                                        <span className="text-[9px] text-zinc-600">{fav.results.length} cenas · {fav.savedAt}</span>
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
                    <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="fixed top-16 right-0 bottom-0 w-96 z-40 bg-black/90 backdrop-blur-sm border-l border-white/5 overflow-y-auto">
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

            <main className="max-w-6xl mx-auto px-6 pt-28 pb-20 relative z-10">
                {/* Minimalist Steps Indicator */}
                <div className="mb-12 flex items-center justify-center max-w-md mx-auto">
                    {[
                        { s: 1, label: 'Import', icon: Upload },
                        { s: 2, label: 'Configure', icon: Settings2 },
                        { s: 3, label: 'Generate', icon: Wand2 }
                    ].map((stepObj, idx) => (
                        <React.Fragment key={stepObj.s}>
                            <div className={`flex flex-col items-center gap-2 ${step >= stepObj.s ? 'opacity-100' : 'opacity-40'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${step === stepObj.s ? 'bg-cyan-500 text-black shadow-md scale-110' : step > stepObj.s ? 'bg-white/10 text-white' : 'bg-white/5 text-zinc-500'}`}>
                                    <stepObj.icon className="w-4 h-4" />
                                </div>
                                <span className="text-[9px] font-semibold uppercase tracking-[0.15em]">{stepObj.label}</span>
                            </div>
                            {idx < 2 && (
                                <div className={`flex-1 h-px mx-4 transition-all duration-500 ${step > stepObj.s ? 'bg-cyan-500/50' : 'bg-white/5'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* STEP 1: IMPORT */}
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center">
                            <div className="w-full max-w-2xl bg-zinc-900/40 border border-white/[0.05] backdrop-blur-sm rounded-3xl p-12 text-center shadow-xl">
                                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />

                                <div
                                    onDragEnter={() => setIsDragActive(true)}
                                    onDragLeave={() => setIsDragActive(false)}
                                    onDrop={() => setIsDragActive(false)}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative overflow-hidden group cursor-pointer flex flex-col items-center gap-6 py-20 border border-white/10 rounded-2xl transition-all duration-300 ease-out ${isDragActive ? 'border-cyan-500 bg-cyan-500/5' : 'bg-black/40 hover:bg-black/60 hover:border-white/20'}`}
                                >
                                    <div className="relative w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 group-hover:scale-110 transition-all duration-300 z-10">
                                        <Upload className="w-8 h-8 relative z-10" />
                                    </div>
                                    <div className="relative space-y-2 z-10">
                                        <h3 className="text-xl font-medium text-white tracking-tight">Upload Product Assets</h3>
                                        <p className="text-sm text-zinc-500 font-light">Drag and drop or click to browse. Minimum 1 photo required.</p>
                                    </div>
                                </div>

                                {previewUrls.length > 0 && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 pt-8 border-t border-white/5 w-full">
                                        <div className="flex justify-center gap-2 w-full mb-8">
                                            {previewUrls.map((url, idx) => (
                                                <motion.div
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    key={idx}
                                                    className="relative flex-1 max-w-[6rem] aspect-square rounded-xl overflow-hidden border border-white/10 group shadow-lg"
                                                >
                                                    <img src={url} className="w-full h-full object-cover" alt="Uploaded" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                                                        <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="p-1.5 sm:p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors">
                                                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Manual description for no-image mode */}
                                <div className={`${previewUrls.length > 0 ? '' : 'mt-8 pt-8 border-t border-white/5'} w-full space-y-4`}>
                                    {previewUrls.length === 0 && (
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Ou descreva seu produto manualmente</label>
                                            <textarea
                                                value={editableDescription}
                                                onChange={(e) => setEditableDescription(e.target.value)}
                                                placeholder="Ex: Chinelo Havaianas preto com logo branco, par, material borracha..."
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-zinc-300 font-mono leading-relaxed outline-none focus:border-cyan-500/50 min-h-[100px] resize-y transition-colors"
                                            />
                                        </div>
                                    )}

                                    {/* Marketing Context Box */}
                                    <div className="space-y-2 mt-6">
                                        <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Settings2 className="w-3 h-3" /> Contexto de Marketing (opcional)
                                        </label>
                                        <textarea
                                            value={marketingContext}
                                            onChange={(e) => setMarketingContext(e.target.value)}
                                            placeholder="Ex: Mulher grávida 30+ usando o chinelo — alivia dor e inchaço nos pés e pernas. Vídeo para Instagram Reels voltado para gestantes."
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-zinc-300 leading-relaxed outline-none focus:border-amber-500/50 min-h-[80px] resize-y transition-colors placeholder:text-zinc-600"
                                        />
                                        <p className="text-[9px] text-zinc-600">Público-alvo, benefícios, plataforma, tom do vídeo... A IA vai usar isso pra gerar mockups e prompts mais precisos.</p>
                                    </div>

                                    <button
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing || (imageFiles.length === 0 && !editableDescription.trim())}
                                        className="w-full py-5 bg-white hover:bg-zinc-200 disabled:bg-white/5 disabled:text-zinc-500 text-black font-bold uppercase tracking-[0.2em] text-xs rounded-2xl transition-all duration-300 shadow-md hover:shadow-md flex items-center justify-center gap-3"
                                    >
                                        {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Extracting Visual DNA...</> : imageFiles.length > 0 ? <>Analyze Product <ArrowRight className="w-4 h-4" /></> : <><PenTool className="w-4 h-4" /> Continue with Description <ArrowRight className="w-4 h-4" /></>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: CONFIGURATION */}
                    {step === 2 && analysis && (
                        <motion.div key="s2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                            {/* Left Column: Summary & Mode */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-zinc-900/40 border border-white/[0.05] backdrop-blur-sm rounded-3xl p-8 space-y-6 shadow-xl">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[9px] font-semibold text-cyan-500 uppercase tracking-[0.2em]">Identified Subject</label>
                                            {editableDNA && (
                                                <button 
                                                    onClick={() => setShowDNAInspector(!showDNAInspector)}
                                                    className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${showDNAInspector ? 'bg-cyan-500 text-black shadow-md' : 'bg-white/5 text-cyan-400 hover:bg-white/10 border border-cyan-500/20'}`}
                                                >
                                                    <Fingerprint className="w-3 h-3 inline-block mr-1" /> DNA Inspector
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xl font-medium text-white tracking-tight">{analysis.productType}</p>
                                    </div>
                                    
                                    {/* V18 DNA INSPECTOR UI */}
                                    <AnimatePresence>
                                        {showDNAInspector && editableDNA && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }} 
                                                animate={{ opacity: 1, height: 'auto' }} 
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-2xl p-5 mt-4 space-y-4 shadow-md">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Fingerprint className="w-4 h-4 text-cyan-400" />
                                                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Structured Visual DNA</h4>
                                                    </div>
                                                    
                                                    {editableDNA.rawThinking && (
                                                        <div className="mb-4 p-3 bg-black/40 rounded-xl border border-white/5">
                                                            <p className="text-[9px] text-zinc-500 font-mono mb-1 uppercase tracking-widest">AI Chain of Thought:</p>
                                                            <p className="text-[10px] text-zinc-400 italic line-clamp-3 hover:line-clamp-none transition-all">{editableDNA.rawThinking}</p>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] text-zinc-500 uppercase tracking-wider">Category</label>
                                                            <input type="text" value={editableDNA.category || ''} onChange={e => setEditableDNA({...editableDNA, category: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] text-zinc-500 uppercase tracking-wider">Upper Material</label>
                                                            <input type="text" value={editableDNA.upperMaterial || ''} onChange={e => setEditableDNA({...editableDNA, upperMaterial: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] text-zinc-500 uppercase tracking-wider">Sole Material</label>
                                                            <input type="text" value={editableDNA.soleMaterial || ''} onChange={e => setEditableDNA({...editableDNA, soleMaterial: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] text-zinc-500 uppercase tracking-wider">Sole Shape</label>
                                                            <input type="text" value={editableDNA.soleShape || ''} onChange={e => setEditableDNA({...editableDNA, soleShape: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] text-zinc-500 uppercase tracking-wider">Logo Placement</label>
                                                            <input type="text" value={editableDNA.logoPosition || ''} onChange={e => setEditableDNA({...editableDNA, logoPosition: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] text-zinc-500 uppercase tracking-wider">Branding Text</label>
                                                            <input type="text" value={editableDNA.brandingText || ''} onChange={e => setEditableDNA({...editableDNA, brandingText: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none placeholder:text-zinc-700" placeholder="Extracted text on logo" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Editable Product Description (Fix #7) */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Descrição AI (editável)</label>
                                        <textarea
                                            value={editableDescription}
                                            onChange={(e) => setEditableDescription(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-zinc-300 font-mono leading-relaxed outline-none focus:border-cyan-500/50 min-h-[120px] resize-y transition-colors"
                                        />
                                        <p className="text-[9px] text-zinc-600">Corrija detalhes do produto aqui se necessário</p>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                        <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Sequence Mode</label>
                                        <div className="flex flex-col gap-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <button onClick={() => setOptions({ ...options, mode: 'product_only', environment: analysis.suggestedSceneriesProductOnly[0] })} className={`py-4 text-[10px] font-semibold uppercase tracking-[0.1em] rounded-xl border transition-all duration-300 ${options.mode === 'product_only' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-md' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:bg-white/5'}`}>Studio</button>
                                                <button onClick={() => setOptions({ ...options, mode: 'lifestyle', environment: analysis.suggestedSceneriesLifestyle[0] })} className={`py-4 text-[10px] font-semibold uppercase tracking-[0.1em] rounded-xl border transition-all duration-300 ${options.mode === 'lifestyle' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-md' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:bg-white/5'}`}>Lifestyle</button>
                                            </div>
                                            <button onClick={() => setOptions({ ...options, mode: 'script' })} className={`flex-1 py-4 text-[10px] font-semibold uppercase tracking-[0.1em] rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 ${options.mode === 'script' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-md' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:bg-white/5'}`}>
                                                <Layers className="w-3.5 h-3.5" /> Script
                                            </button>
                                            <button onClick={() => setOptions({ ...options, mode: 'scenery' })} className={`flex-1 py-4 text-[10px] font-semibold uppercase tracking-[0.1em] rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 ${options.mode === 'scenery' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:bg-white/5'}`}>
                                                <Camera className="w-3.5 h-3.5" /> Cenários
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Detailed Configuration */}
                            <div className="lg:col-span-8 space-y-6">
                                <div className="bg-zinc-900/40 border border-white/[0.05] backdrop-blur-sm rounded-3xl p-8 shadow-xl">
                                    <div className="flex items-center gap-3 mb-8">
                                        <Settings2 className="w-5 h-5 text-zinc-400" />
                                        <h3 className="text-sm font-medium tracking-tight text-white">
                                            {options.mode === 'script' ? 'Script Detailing' : options.mode === 'scenery' ? 'Scene Direction' : 'Environment & Aesthetics'}
                                        </h3>
                                    </div>

                                    {options.mode === 'script' ? (
                                        <div className="space-y-4">
                                            <textarea
                                                value={options.script}
                                                onChange={(e) => setOptions({ ...options, script: e.target.value })}
                                                placeholder="Cole seu roteiro completo aqui. A IA vai quebrá-lo em tantas cenas quantas ele precisar..."
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-zinc-300 outline-none focus:border-purple-500/50 min-h-[300px] font-mono leading-relaxed transition-colors"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Cenários Sugeridos</label>
                                                <button onClick={regenerateSuggestions} className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-cyan-500/20 text-zinc-500 hover:text-cyan-400 rounded-full transition-all" title="Gerar novas sugestões">
                                                    <Dice5 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(options.mode === 'product_only' ? analysis.suggestedSceneriesProductOnly : analysis.suggestedSceneriesLifestyle).map((s, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setOptions({ ...options, environment: s })}
                                                        className={`p-5 rounded-2xl border text-left transition-all duration-300 ${options.environment === s ? 'bg-cyan-500/5 border-cyan-500/30 text-white shadow-md' : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-white/10 hover:bg-white/[0.04]'}`}
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${options.environment === s ? 'bg-cyan-500 border-cyan-400' : 'border-zinc-600'}`}>
                                                                {options.environment === s && <Check className="w-2.5 h-2.5 text-black" />}
                                                            </div>
                                                            <span className="text-xs leading-relaxed font-light">{s}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {options.mode === 'scenery' && (
                                        <div className="space-y-6">
                                            <p className="text-xs text-zinc-500">Configure as cenas baseadas nas suas fotos de local. A IA vai gerar prompts otimizados para vídeo ambientais e cinematográficos.</p>

                                            {/* Camera Angle */}
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Técnica de Câmera</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {['Drone pullback', 'Tracking dolly shot', 'Slow cinematic orbit', 'Handheld POV', 'Time-lapse', 'Low-angle hero shot'].map(angle => (
                                                        <button key={angle} onClick={() => setOptions({ ...options, cameraAngle: angle })} className={`p-3 rounded-xl border text-left text-[10px] transition-all ${options.cameraAngle === angle ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:bg-white/5'}`}>{angle}</button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Scene Action */}
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Ação da Cena</label>
                                                <input
                                                    value={options.sceneAction}
                                                    onChange={(e) => setOptions({ ...options, sceneAction: e.target.value })}
                                                    placeholder="Ex: Casal caminhando ao pôr do sol, crianças brincando na areia..."
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-zinc-300 outline-none focus:border-emerald-500/50 transition-colors"
                                                />
                                                {sceneryData && sceneryData.suggestedActions.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {sceneryData.suggestedActions.map((a, idx) => (
                                                            <button key={idx} onClick={() => setOptions({ ...options, sceneAction: a })} className={`px-3 py-1.5 rounded-full text-[9px] border transition-all ${options.sceneAction === a ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:bg-white/5'}`}>{a}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Audio Design */}
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Design de Áudio</label>
                                                <input
                                                    value={options.audioDesign}
                                                    onChange={(e) => setOptions({ ...options, audioDesign: e.target.value })}
                                                    placeholder="Ex: Ondas do mar + violão acústico suave"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-zinc-300 outline-none focus:border-emerald-500/50 transition-colors"
                                                />
                                                {sceneryData && sceneryData.suggestedAudio.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {sceneryData.suggestedAudio.map((a, idx) => (
                                                            <button key={idx} onClick={() => setOptions({ ...options, audioDesign: a })} className={`px-3 py-1.5 rounded-full text-[9px] border transition-all ${options.audioDesign === a ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:bg-white/5'}`}>{a}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Animation Speed */}
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Velocidade da Animação</label>
                                                <div className="flex gap-3">
                                                    {['Slow Motion', 'Normal', 'Fast', 'Time-lapse'].map(speed => (
                                                        <button key={speed} onClick={() => setOptions({ ...options, animationSpeed: speed })} className={`flex-1 py-3 rounded-xl border text-[10px] font-semibold uppercase tracking-wider transition-all ${options.animationSpeed === speed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:bg-white/5'}`}>{speed}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {options.mode !== 'script' && options.mode !== 'scenery' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 pt-10 border-t border-white/5">
                                            <div className="space-y-4">
                                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Lighting Physics</label>
                                                <select value={options.timeOfDay} onChange={(e) => setOptions({ ...options, timeOfDay: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-colors">
                                                    {lightings.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Visual Realism Level</label>
                                                <select value={options.style} onChange={(e) => setOptions({ ...options, style: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-colors">
                                                    {styles.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Lifestyle Personalization */}
                                    {options.mode === 'lifestyle' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-10 pt-10 border-t border-white/5 space-y-6">
                                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Subject Architecture (Human)</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                <div className="space-y-4">
                                                    <span className="text-[10px] text-zinc-400">Gender</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {genders.map(g => (
                                                            <button key={g.id} onClick={() => setOptions({ ...options, gender: g.id })} className={`py-2 px-4 rounded-full border text-[10px] font-medium transition-all ${options.gender === g.id ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:bg-white/5'}`}>
                                                                {g.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <span className="text-[10px] text-zinc-400">Skin Tone</span>
                                                    <div className="flex gap-3">
                                                        {skinTones.map(s => (
                                                            <button key={s.id} onClick={() => setOptions({ ...options, skinTone: s.id })} className={`w-8 h-8 rounded-full border-2 transition-all ${options.skinTone === s.id ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ background: s.color }} title={s.label} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <span className="text-[10px] text-zinc-400">Hair Color</span>
                                                    <div className="flex flex-wrap gap-3">
                                                        {hairColors.map(h => (
                                                            <button key={h.id} onClick={() => setOptions({ ...options, hairColor: h.id })} className={`w-8 h-8 rounded-full border-2 transition-all ${options.hairColor === h.id ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ background: h.color }} title={h.label} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-6 space-y-2">
                                                <span className="text-[10px] text-zinc-400">Sora 2 Characters <span className="text-zinc-600">(opcional)</span></span>
                                                <input
                                                    value={options.characters}
                                                    onChange={(e) => setOptions({ ...options, characters: e.target.value })}
                                                    placeholder="Ex: @Alex @Maya — mantém consistência do personagem"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-zinc-300 outline-none focus:border-purple-500/50 font-mono transition-colors"
                                                />
                                                <p className="text-[9px] text-zinc-600">Use @tags do Sora 2 para manter o mesmo personagem entre cenas</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 pt-10 border-t border-white/5">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Aspect Ratio</label>
                                            <div className="flex gap-3">
                                                <button onClick={() => setOptions({ ...options, aspectRatio: '16:9' })} className={`flex-1 py-4 flex flex-col items-center gap-2 rounded-xl border transition-all duration-300 ${options.aspectRatio === '16:9' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:bg-white/5'}`}>
                                                    <Monitor className="w-5 h-5" />
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider">16:9 Full</span>
                                                </button>
                                                <button onClick={() => setOptions({ ...options, aspectRatio: '9:16' })} className={`flex-1 py-4 flex flex-col items-center gap-2 rounded-xl border transition-all duration-300 ${options.aspectRatio === '9:16' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:bg-white/5'}`}>
                                                    <Smartphone className="w-5 h-5" />
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider">9:16 Mobile</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Additional Directives</label>
                                            <textarea value={options.supportingDescription} onChange={(e) => setOptions({ ...options, supportingDescription: e.target.value })} placeholder="e.g., Slow motion, anamorphic lens flare..." className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 h-[88px] resize-none transition-colors" />
                                        </div>
                                    </div>

                                    {/* Smart Economy & Strategy DNA */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10 pt-10 border-t border-white/5">
                                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4">
                                            <label className="text-[9px] font-semibold text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Star className="w-3 h-3" /> DNA Estratégico do Produto
                                            </label>
                                            <div className="space-y-2">
                                                {analysis.sellingPoints?.map((sp, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 text-[10px] text-zinc-400 font-light">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
                                                        {sp}
                                                    </div>
                                                ))}
                                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                                    {analysis.dominantHexColors?.map((c, idx) => (
                                                        <div key={idx} className="w-5 h-5 rounded-md border border-white/10" style={{ backgroundColor: c }} title={c} />
                                                    ))}
                                                    <span className="text-[9px] text-zinc-500 ml-2 font-mono uppercase">Paleta Extraída</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setRenderAllOnInit(!renderAllOnInit)}
                                            className={`p-5 rounded-2xl border cursor-pointer transition-all ${!renderAllOnInit ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-zinc-900/40 border-white/5 opacity-60'}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${!renderAllOnInit ? 'bg-emerald-500 border-emerald-400' : 'border-zinc-600'}`}>
                                                    {!renderAllOnInit && <Check className="w-2.5 h-2.5 text-black" />}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-semibold text-white block mb-1">Modo Econômico (Recomendado)</span>
                                                    <span className="text-[10px] text-zinc-400 leading-normal block">Gera apenas o primeiro mockup automaticamente. Você economiza 66% dos créditos iniciais e renderiza os outros apenas se gostar dos prompts.</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-12">
                                        <button onClick={handleGenerate} className="w-full bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-[0.2em] text-xs py-5 rounded-full transition-all duration-300 shadow-md hover:shadow-md flex items-center justify-center gap-3">
                                            Generate Master Sequence <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: RESULTS */}
                    {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
                                <div className="flex flex-col">
                                    <h1 className="text-3xl font-light text-white tracking-tight flex items-center gap-3">
                                        Director's Timeline <span className="text-cyan-500 text-xs font-bold uppercase tracking-[0.4em] bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">Storyboard</span>
                                    </h1>
                                    <p className="text-[10px] text-zinc-500 mt-3 uppercase tracking-widest">DNA do Produto + Contexto de Marketing + Sora 2 Blueprint Engine v18.5</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    {results.some(r => r.mockupUrl === null) && (
                                        <button
                                            onClick={handleRenderAllVisible}
                                            className="h-10 px-6 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full flex items-center gap-2 transition-all border border-cyan-500/30 shadow-md"
                                        >
                                            <Camera className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Renderizar Todos</span>
                                        </button>
                                    )}
                                    <button onClick={goBackToConfigure} className="h-10 px-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-full transition-all" title="Voltar para configuração sem perder mockups">
                                        <ArrowLeft className="w-3.5 h-3.5" /> Editar
                                    </button>
                                    <button onClick={saveToFavorites} className="h-10 px-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-full transition-all" title="Salvar nos favoritos">
                                        <Star className="w-3.5 h-3.5" /> Salvar
                                    </button>
                                    <button onClick={downloadAllPrompts} className="h-10 px-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full transition-all" title="Baixar .txt com prompts + mockups">
                                        <FileDown className="w-3.5 h-3.5" /> Export
                                    </button>
                                    <button onClick={() => { setStep(1); setImageFiles([]); setPreviewUrls([]); setCompressedImages([]); setResults([]); setAnalysis(null); }} className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all">Novo</button>
                                </div>
                            </div>

                            {/* Progress Indicator */}
                            {(isGenerating || isContinuing) && (
                                <div className="bg-zinc-900/40 border border-cyan-500/20 backdrop-blur-xl rounded-3xl p-8 mb-10 shadow-md">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                                            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-400">{progressText}</span>
                                        </div>
                                        <span className="text-2xl font-light text-white">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400" animate={{ width: `${progress}%` }} transition={{ ease: "linear" }} />
                                    </div>
                                </div>
                            )}

                            {/* Storyboard List - Director's Timeline */}
                            <div className="relative border-l border-white/10 pl-8 ml-4 space-y-12 pb-10">
                                {results.map((res, i) => (
                                    <div key={i} className="relative bg-zinc-900/40 border border-white/5 backdrop-blur-sm rounded-2xl overflow-hidden flex flex-col lg:flex-row shadow-xl group transition-all hover:border-white/10">
                                        
                                        {/* Timeline Node */}
                                        <div className="absolute -left-[41px] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black border-2 border-cyan-500/50 flex items-center justify-center shadow-md z-10 group-hover:border-cyan-400 group-hover:scale-110 transition-all">
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                        </div>

                                        {/* Image Section */}
                                        <div className="w-full lg:w-[420px] aspect-video lg:aspect-auto bg-black border-b lg:border-r lg:border-b-0 border-white/5 relative cursor-pointer overflow-hidden" onClick={() => res.mockupUrl && setLightboxUrl(res.mockupUrl)}>
                                            {loadingIndices.includes(i) ? (
                                                <div className="flex flex-col items-center justify-center h-full gap-5 text-cyan-500/50 p-12 text-center bg-cyan-950/10">
                                                    <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Rendering Scene...</span>
                                                        <p className="text-[9px] text-zinc-600 uppercase tracking-tight font-medium">Fidelity Pro Alignment in progress</p>
                                                    </div>
                                                </div>
                                            ) : res.mockupUrl ? (
                                                <>
                                                    <img src={res.mockupUrl} className="w-full h-full object-cover" alt="Result" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
                                                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                                                        <button onClick={(e) => { e.stopPropagation(); copyMockupImage(res.mockupUrl!); }} className="w-9 h-9 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-cyan-500 hover:scale-110 shadow-lg border border-white/10 transition-all" title="Copiar mockup">
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); saveMockupToLibrary(res.mockupUrl!, `Cena ${i + 1}`); }} className="w-9 h-9 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-purple-500 hover:scale-110 shadow-lg border border-white/10 transition-all" title="Salvar na galeria">
                                                            <BookImage className="w-4 h-4" />
                                                        </button>
                                                        <a href={res.mockupUrl} download onClick={(e) => e.stopPropagation()} className="w-9 h-9 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-cyan-500 hover:scale-110 shadow-lg border border-white/10 transition-all" title="Baixar mockup">
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    </div>
                                                    <div className="absolute bottom-6 left-6 flex gap-2 pointer-events-none">
                                                        <span className="bg-black/60 backdrop-blur-sm text-[9px] font-semibold text-cyan-400 px-3 py-1.5 rounded-full border border-cyan-500/30 uppercase tracking-wider">AI Master Take</span>
                                                        <span className="bg-black/60 backdrop-blur-sm text-[9px] font-semibold text-zinc-300 px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-wider">1K RAW</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-5 p-12">
                                                    <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center mb-2">
                                                        <Camera className="w-8 h-8 text-zinc-700" />
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRegenerateMockup(i); }}
                                                        disabled={loadingIndices.includes(i)}
                                                        className="px-6 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-md hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Renderizar Mockup
                                                    </button>
                                                    <p className="text-[9px] text-zinc-600 uppercase tracking-tight font-medium">Economia Ativa: Renderize apenas se gostar do prompt</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Prompt Section */}
                                        <div className="flex-1 p-6 lg:p-8 flex flex-col bg-zinc-950/20">
                                            <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-zinc-400">
                                                        SEQ_{String(i + 1).padStart(2, '0')}
                                                    </span>
                                                    <span className="text-xs font-semibold text-white uppercase tracking-widest">
                                                        {options.mode === 'script' ? `CENA ${i + 1}` : sequenceTitles[i] || `TAKE ${i + 1}`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => copyToClipboard(res.prompt)} className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-all border border-white/5 hover:border-white/20">
                                                        <Copy className="w-3 h-3" /> Copy
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex-1 mt-2">
                                                <div className="relative group/textarea">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl blur-xl opacity-0 group-focus-within/textarea:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                                    <textarea
                                                        value={res.prompt}
                                                        onChange={(e) => updatePrompt(i, e.target.value)}
                                                        placeholder="Crie seu prompt ou use o gerado pela IA..."
                                                        className="relative w-full bg-black/50 border border-white/5 rounded-xl p-5 text-[11px] text-zinc-300 leading-relaxed font-mono resize-none custom-scrollbar min-h-[140px] lg:min-h-[180px] outline-none focus:border-cyan-500/30 transition-colors shadow-inner"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center gap-6">
                                                <div className="flex gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <Monitor className="w-4 h-4 text-zinc-500" />
                                                        <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{options.aspectRatio}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Palette className="w-4 h-4 text-zinc-500" />
                                                        <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{options.style}</span>
                                                    </div>
                                                </div>
                                                <div className="ml-auto flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleMagicEnhance(i)}
                                                        disabled={loadingIndices.includes(i)}
                                                        className="h-9 px-4 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-black rounded-full transition-all gap-2 shadow-lg shadow-cyan-900/10 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                                        title="Mágica: Transformar rascunho em Blueprint Pro + Mockup"
                                                    >
                                                        <Wand2 className={`w-3.5 h-3.5 ${loadingIndices.includes(i) ? 'animate-pulse' : ''}`} />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Mágica</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleRegenerateMockup(i)}
                                                        disabled={loadingIndices.includes(i)}
                                                        className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="Apenas Mockup (usa o texto atual)"
                                                    >
                                                        {loadingIndices.includes(i) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRegenerateTake(i)}
                                                        disabled={loadingIndices.includes(i)}
                                                        className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="Aleatório (Novo Prompt + Mockup)"
                                                    >
                                                        {loadingIndices.includes(i) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dice5 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Feedback Section */}
                                            <div className="mt-4 bg-black/40 border border-white/5 rounded-2xl p-4 focus-within:border-amber-500/30 transition-colors">
                                                <textarea
                                                    value={res.feedback || ''}
                                                    onChange={(e) => updateFeedback(i, e.target.value)}
                                                    placeholder="O que você não gostou? Ex: 'A logo tem que ser menor', 'Muda a cor de fundo'..."
                                                    className="w-full bg-transparent text-xs text-zinc-300 leading-relaxed font-mono resize-none outline-none min-h-[60px] custom-scrollbar"
                                                />
                                                <div className="flex justify-end mt-2">
                                                    <button
                                                        onClick={() => handleRegenerateWithFeedback(i)}
                                                        disabled={loadingIndices.includes(i) || !res.feedback?.trim()}
                                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-full transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-amber-900/20"
                                                    >
                                                        {loadingIndices.includes(i) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                                        Refinar com Feedback
                                                    </button>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!isGenerating && !isContinuing && results.length > 0 && (
                                <div className="pt-12 flex flex-wrap justify-center gap-4">
                                    <button onClick={handleContinueFlow} className="group bg-white/[0.03] border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-zinc-300 hover:text-cyan-400 px-10 py-5 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] flex items-center gap-3 transition-all duration-300 shadow-lg">
                                        <Video className="w-4 h-4" /> Expand Narrative (+3 Scenes)
                                    </button>
                                    <button onClick={addManualScene} className="bg-cyan-500 hover:bg-cyan-400 text-black px-10 py-5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-3 transition-all duration-300 shadow-xl shadow-cyan-900/20">
                                        <Check className="w-4 h-4" /> Add Scene Manually
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
                            <img src={lightboxUrl} className="max-w-full max-h-[85vh] rounded-2xl shadow-xl border border-white/10 object-contain" alt="Mockup Full" />
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={() => copyMockupImage(lightboxUrl)} className="w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-cyan-500 transition-all border border-white/20" title="Copiar">
                                    <Copy className="w-4 h-4" />
                                </button>
                                <a href={lightboxUrl} download className="w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-cyan-500 transition-all border border-white/20" title="Baixar">
                                    <Download className="w-4 h-4" />
                                </a>
                                <button onClick={() => setLightboxUrl(null)} className="w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-all border border-white/20" title="Fechar">
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
