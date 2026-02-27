import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

const CallToAction = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // ─── Performance Optimized Animations ───

    // 1. Background Cinematic Slow Zoom (O Rio)
    const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

    // 2. Overlay Dimmer: Less aggressive now, allowing the background to show through more beautifully
    const bgDarken = useTransform(scrollYProgress, [0.1, 0.4], [0, 0.35]);

    // 3. Phase 1: Massive Engaging Text ("The Tease")
    // Note: z-index is now lower than the foreground bush, so it sits inside the tunnel and gets passed by!
    const teaseY = useTransform(scrollYProgress, [0.0, 0.15, 0.3], [0, 0, -20]);
    const teaseOpacity = useTransform(scrollYProgress, [0.0, 0.15, 0.25], [1, 1, 0]);

    // 4. Foreground Zoom (Os Arbustos) - zooms exactly over the text
    const fgScale = useTransform(scrollYProgress, [0, 0.2, 0.35], [1, 2.2, 4.5]);
    const fgOpacity = useTransform(scrollYProgress, [0.2, 0.33], [1, 0]);

    // 5. Phase 2: Ultra Premium Pricing fading in
    const textY = useTransform(scrollYProgress, [0.5, 0.7], [80, 0]);
    const textOpacity = useTransform(scrollYProgress, [0.5, 0.65], [0, 1]);

    const [pricingCategory, setPricingCategory] = useState<'pacotes' | 'assinaturas'>('pacotes');

    const pacotes = [
        {
            name: "Pacote Start",
            price: "R$ 297",
            duration: "Test-Drive",
            desc: "Ideal para validar ofertas e sentir o poder de um roteiro estratégico unido à Inteligência Artificial.",
            features: [
                "2 Vídeos Estratégicos (IA + Edição)",
                "Roteiros com ganchos de alta retenção",
                "Revisão de Lapidação (1 rodada)",
                "Entrega Padrão Qualidade Agência"
            ],
            buttonText: "Iniciar Test-Drive",
            glow: false,
            badge: "Injeção de Tráfego",
            whatsappLink: "https://wa.me/5534992981424?text=Ol%C3%A1%21%20Gostaria%20de%20contratar%20o%20*Pacote%20Start*%20por%20R%24%20297"
        },
        {
            name: "Pacote Growth",
            price: "R$ 497",
            duration: "Mais Escolhido",
            desc: "O ponto de equilíbrio perfeito. Teste diferentes ângulos de vendas para maximizar seu ROI.",
            features: [
                "5 Vídeos de Alta Conversão",
                "Engenharia de Formatos (Variações)",
                "Estratégia Anti-Saturação de Público",
                "2 rodadas de revisões leves"
            ],
            buttonText: "Escalar com Growth",
            glow: true,
            badge: "Máquina de Tração",
            whatsappLink: "https://wa.me/5534992981424?text=Ol%C3%A1%21%20Quero%20a%20m%C3%A1quina%20de%20tra%C3%A7%C3%A3o%20com%20o%20*Pacote%20Growth*%20de%20R%24%20497"
        },
        {
            name: "Pacote Scale",
            price: "R$ 897",
            duration: "Profissional",
            desc: "Arsenal completo para escalar pesado e construir uma barreira contra a concorrência.",
            features: [
                "11 Vídeos Cinematográficos de IA",
                "Mix Inteligente (Fotos + IA)",
                "Autoridade de Mercado Inquestionável",
                "Passe VIP (Prioridade de Entrega)"
            ],
            buttonText: "Dominar Mercado",
            glow: false,
            badge: "Domínio de Mercado",
            whatsappLink: "https://wa.me/5534992981424?text=Ol%C3%A1%21%20Preciso%20escalar%20pesado.%20Quero%20o%20*Pacote%20Scale*%20de%20R%24%20897"
        }
    ];

    const assinaturas = [
        {
            name: "Plano Creator",
            price: "R$ 797",
            duration: "/mês",
            desc: "Previsibilidade e atualização constante. Você economiza R$ 200 todos os meses em relação aos avulsos.",
            features: [
                "12 Vídeos Estratégicos Mensais",
                "Entrega Quinzenal (Sprints)",
                "Atualização Criativa Contínua",
                "Prioridade e Suporte Dedicado"
            ],
            buttonText: "Assinar Creator",
            glow: true,
            badge: "Presença Inabalável",
            whatsappLink: "https://wa.me/5534992981424?text=Ol%C3%A1%21%20Quero%20manter%20minha%20presen%C3%A7a%20inabal%C3%A1vel.%20Gostaria%20de%20assinar%20o%20*Plano%20Creator*%20de%20R%24%20797%2Fm%C3%AAs"
        },
        {
            name: "Plano Scale Pro",
            price: "R$ 1.497",
            duration: "/mês",
            desc: "Poder de fogo total. Desconto brutal para quem investe pesado em tráfego e precisa de testes diários.",
            features: [
                "25 Vídeos Premium por Mês",
                "Sprints Semanais de Entrega",
                "Prioridade Máxima (Tapete Vermelho)",
                "Execução Imediata de Demandas"
            ],
            buttonText: "Assinar Scale Pro",
            glow: false,
            badge: "Império do Tráfego",
            whatsappLink: "https://wa.me/5534992981424?text=Ol%C3%A1%21%20Quero%20o%20imp%C3%A9rio%20do%20tr%C3%A1fego.%20Vou%20assinar%20o%20*Plano%20Scale%20Pro*%20de%20R%24%201.497%2Fm%C3%AAs"
        }
    ];

    const currentPlans = pricingCategory === 'pacotes' ? pacotes : assinaturas;

    return (
        <section id="pricing" ref={containerRef} className="relative h-[200vh] md:h-[350vh] bg-black">
            <div className="sticky top-0 h-[100dvh] w-full overflow-hidden flex items-center justify-center bg-black">

                {/* ── Layer 1: Parallax Zooming Background ── */}
                <motion.div
                    className="absolute inset-0 z-0 transform-gpu will-change-transform"
                    style={{ scale: bgScale }}
                >
                    <img
                        src="/rio.webp"
                        alt="Background"
                        className="w-full h-full object-cover opacity-80"
                        loading="lazy"
                        decoding="async"
                    />
                </motion.div>

                {/* ── Layer 2: Black Fade Overlay (Lighter now) ── */}
                <motion.div
                    className="absolute inset-0 z-10 pointer-events-none bg-black transform-gpu will-change-transform"
                    style={{ opacity: bgDarken }}
                />

                {/* ── Layer 3: The Tease (NOW BEHIND THE BUSHES) ── */}
                <motion.div
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4 w-full pointer-events-none transform-gpu will-change-transform"
                    style={{ opacity: teaseOpacity, y: teaseY }}
                >
                    <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-medium text-white tracking-tighter leading-[0.95] mb-4 max-w-5xl mx-auto drop-shadow-2xl">
                        Criamos realidades intangíveis. <br className="hidden lg:block" />
                        <span className="font-serif italic text-white/50 font-medium">O próximo grau do audiovisual.</span>
                    </h2>
                </motion.div>

                {/* ── Layer 4: Foreground Zoom-Through (BUSHES IN FRONT OF TEXT) ── */}
                <motion.div
                    className="absolute inset-0 z-30 pointer-events-none transform-gpu will-change-transform"
                    style={{ scale: fgScale, opacity: fgOpacity }}
                >
                    <img
                        src="/arbusto.webp"
                        alt="Foreground Overlay"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                    />
                </motion.div>

                {/* ── Layer 5: Modern Clean Packages ── */}
                <motion.div
                    className="relative z-40 flex flex-col items-center text-center px-0 md:px-8 w-full max-w-[1200px] h-full justify-center py-6 md:py-10 pointer-events-auto transform-gpu will-change-transform"
                    style={{ opacity: textOpacity, y: textY }}
                >
                    <div className="flex flex-col items-center w-full m-auto shrink-0 justify-center h-full max-h-[100dvh]">
                        <div className="flex flex-col items-center mb-4 md:mb-6 px-4 shrink-0">
                            <h2 className="text-3xl sm:text-4xl md:text-[2.2rem] lg:text-5xl font-display font-medium text-white tracking-tight leading-[1.1] mb-4 md:mb-6">
                                Faça parte do futuro, <br />
                                <span className="font-serif italic text-white/50">
                                    movimente suas vendas.
                                </span>
                            </h2>

                            {/* Category Switcher */}
                            <div className="flex p-1.5 bg-white/[0.03] border border-white/10 rounded-full mb-8 backdrop-blur-md relative">
                                <button
                                    onClick={() => setPricingCategory('pacotes')}
                                    className={`relative z-10 px-8 py-2.5 rounded-full text-xs font-sans font-semibold transition-colors duration-300 ${pricingCategory === 'pacotes' ? 'text-black' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    Pacotes Avulsos
                                    {pricingCategory === 'pacotes' && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={() => setPricingCategory('assinaturas')}
                                    className={`relative z-10 px-8 py-2.5 rounded-full text-xs font-sans font-semibold transition-colors duration-300 ${pricingCategory === 'assinaturas' ? 'text-black' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    Assinaturas
                                    {pricingCategory === 'assinaturas' && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </button>
                            </div>

                            {/* Mobile Swipe Indicator */}
                            <motion.div
                                className="flex md:hidden items-center gap-2 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                animate={{ opacity: [0.6, 1, 0.6] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            >
                                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mt-0.5">Explorar Pacotes</span>
                                <motion.div
                                    animate={{ x: [0, 4, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                >
                                    <ArrowRight className="w-3 h-3" />
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Clean Simple Overlay Pricing Cards - Stable Container */}
                        <div className="w-full max-w-6xl mx-auto flex items-center justify-center">
                            <div
                                className={`flex w-full overflow-x-auto no-scrollbar snap-x snap-mandatory pb-6 md:pb-2 px-4 md:px-0 md:justify-center gap-3 md:gap-6 
                                    ${pricingCategory === 'pacotes' ? 'md:grid md:grid-cols-3' : 'md:grid md:grid-cols-2 md:max-w-4xl mx-auto'}
                                `}
                            >
                                {currentPlans.map((plan) => (
                                    <div
                                        key={`${pricingCategory}-${plan.name}`}
                                        className={`snap-center shrink-0 w-[85vw] max-w-[340px] md:w-auto md:max-w-none relative group flex flex-col p-5 md:p-6 lg:p-7 rounded-[2rem] md:rounded-[2.5rem] text-left transition-all duration-300 overflow-hidden animate-slide-up-fade
                                            ${plan.glow
                                                ? 'bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/[0.06] hover:ring-white/20 shadow-2xl shadow-cyan-900/20'
                                                : 'bg-white/[0.015] ring-1 ring-white/5 hover:bg-white/[0.03] hover:ring-white/10 shadow-lg shadow-black/50'
                                            }`}
                                    >
                                        {/* Pure Transparent Overlay - No Blur */}
                                        <div className="absolute inset-0 bg-black/60 -z-10 pointer-events-none" />

                                        <div className="flex justify-between items-start mb-4 md:mb-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">{plan.badge}</span>
                                                <h3 className="text-xl font-display font-medium text-white tracking-wide">{plan.name}</h3>
                                            </div>
                                            {plan.glow && (
                                                <span className="px-3 py-1 bg-white inline-block rounded-full text-[9px] uppercase font-bold text-black shrink-0 shadow-xl">
                                                    Mais Escolhido
                                                </span>
                                            )}
                                        </div>

                                        <div className="mb-4 md:mb-5 flex flex-col">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl lg:text-5xl font-light tracking-tight text-white font-display">
                                                    {plan.price}
                                                </span>
                                                <span className="text-white/40 font-sans text-xs uppercase tracking-wider font-medium">{plan.duration}</span>
                                            </div>
                                        </div>

                                        <p className="text-white/50 text-[11px] md:text-[13px] leading-relaxed mb-4 md:mb-5 h-auto md:h-[3.5rem] lg:h-[3rem] font-sans font-light">
                                            {plan.desc}
                                        </p>

                                        {/* Features List */}
                                        <ul className="flex flex-col gap-2 md:gap-3 mb-6 md:mb-8 flex-1">
                                            {plan.features.map((feat, idx) => (
                                                <li key={idx} className="flex items-start gap-2 md:gap-3">
                                                    <Check size={14} className="text-cyan-400 mt-[2px] md:mt-1 shrink-0" />
                                                    <span className="text-white/80 text-[11px] md:text-xs font-sans font-light leading-snug">{feat}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Action Button - Clean Sans-serif */}
                                        <a
                                            href={plan.whatsappLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`relative w-full flex items-center justify-center gap-2 py-3 md:py-3.5 rounded-full font-sans text-[11px] md:text-xs font-bold transition-all duration-300 group/btn
                                                ${plan.glow
                                                    ? 'bg-white text-black hover:bg-white/90 hover:scale-[1.02] shadow-[0_4px_20px_rgba(255,255,255,0.15)]'
                                                    : 'bg-white/5 ring-1 ring-white/10 text-white hover:bg-white/10 hover:ring-white/20'
                                                }`}
                                        >
                                            <span>{plan.buttonText}</span>
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </motion.div>

            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </section >
    );
};

export default CallToAction;
