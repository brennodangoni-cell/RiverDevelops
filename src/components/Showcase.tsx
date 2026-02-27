import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

const Transformation = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    // Optimized Cloudinary Assets for ALL devices to prevent stuttering
    const [videoSrc] = useState('https://res.cloudinary.com/dobo2yvgz/video/upload/f_auto,q_auto/v1771528283/videonovo_tbftnn.mp4');
    const [staticImg, setStaticImg] = useState('/fotonova.webp');
    const [bgImg, setBgImg] = useState('/imagetest.webp');

    useEffect(() => {
        if (window.innerWidth < 768) {
            setStaticImg('/fotonova-mobile.webp');
            setBgImg('/imagetest-mobile.webp');
        }
    }, []);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 60, // Reduced stiffness for better performance
        damping: 20,
        restDelta: 0.001
    });

    // ─── THE NEW CINEMATIC TIMELINE ───
    // FASE 1: A foto está na tela. O texto 1 está visível por cima da foto.
    const text1Opacity = useTransform(smoothProgress, [0.0, 0.25, 0.35], [1, 1, 0]);
    const text1Y = useTransform(smoothProgress, [0.0, 0.35], [0, -40]);
    const photoOverlayOpacity = useTransform(smoothProgress, [0.0, 0.25, 0.35], [1, 1, 0]); // Overlay para leitura

    // O container principal do vídeo pulsa levemente para dar impacto
    const videoCardScale = useTransform(smoothProgress, [0.0, 0.1, 0.9, 1.0], [0.95, 1, 1, 0.95]);

    // FASE 2: O scanner revela o vídeo
    const insetRight = useTransform(smoothProgress, [0.35, 0.6], ["100%", "0%"]);
    const scannerLeft = useTransform(smoothProgress, [0.35, 0.6], ["0%", "100%"]);
    const scannerOpacity = useTransform(smoothProgress, [0.33, 0.35, 0.6, 0.62], [0, 1, 1, 0]);

    // FASE 3: O texto 2 aparece POR CIMA do vídeo, com um overlay para leitura
    const text2Opacity = useTransform(smoothProgress, [0.65, 0.75, 1.0], [0, 1, 1]);
    const text2Y = useTransform(smoothProgress, [0.65, 0.75], [40, 0]);
    const videoOverlayOpacity = useTransform(smoothProgress, [0.65, 0.75], [0, 1]); // Overlay para leitura

    // Parallax de Fundo
    const bgScale = useTransform(smoothProgress, [0, 1], [1.0, 1.25]);
    const bgOpacity = useTransform(smoothProgress, [0, 0.3], [0, 1]);

    // Scroll to Pricing CTA
    const scrollToPricing = (e: React.MouseEvent) => {
        e.preventDefault();
        const el = document.getElementById('pricing');
        if (el) {
            const sectionTop = el.offsetTop;
            window.scrollTo({ top: sectionTop, behavior: 'instant' });

            const startPos = sectionTop;
            const endPos = el.offsetTop + el.offsetHeight - window.innerHeight;
            const distance = endPos - startPos;
            const duration = 2000;
            let startTimestamp: number | null = null;

            const smoothStep = (timestamp: number) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const ease = -(Math.cos(Math.PI * progress) - 1) / 2;
                window.scrollTo(0, startPos + distance * ease);
                if (progress < 1) {
                    requestAnimationFrame(smoothStep);
                }
            };
            requestAnimationFrame(smoothStep);
        }
    };

    // Toca o vídeo apenas após a fase de foto
    useEffect(() => {
        const unsubscribe = smoothProgress.on("change", (latest) => {
            if (videoRef.current && isVideoLoaded) {
                // More precise range to prevent excessive playback on edge cases
                const shouldPlay = latest > 0.34 && latest < 0.94;
                if (shouldPlay) {
                    if (videoRef.current.paused) {
                        videoRef.current.play().catch(() => { });
                    }
                } else {
                    if (!videoRef.current.paused) {
                        videoRef.current.pause();
                    }
                }
            }
        });
        return () => unsubscribe();
    }, [smoothProgress, isVideoLoaded]);

    return (
        <section ref={containerRef} className="relative z-10 bg-black min-h-[300vh]">

            <div className="sticky top-0 h-[100dvh] w-full overflow-hidden flex flex-col items-center justify-center pt-20 md:pt-32 pb-4 md:pb-8 px-4 md:px-8">

                {/* ── Background Ambiance ── */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <motion.div
                        style={{ scale: bgScale, opacity: bgOpacity }}
                        className="absolute inset-0 z-0"
                    >
                        <img
                            src={bgImg}
                            alt="Background Atmosphere"
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                        />
                    </motion.div>

                    <motion.div
                        style={{ scale: bgScale, opacity: bgOpacity }}
                        className="absolute inset-0 z-0 md:hidden mix-blend-screen opacity-60"
                    >
                        <img
                            src={bgImg}
                            alt="Background Atmosphere Top"
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover rotate-180"
                            style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)', WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)' }}
                        />
                    </motion.div>

                    <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
                    <div className="absolute inset-0 bg-blue-900/10 pointer-events-none" />

                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vh] rounded-full animate-pulse-slow pointer-events-none transform-gpu"
                        style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.15) 0%, transparent 70%)' }}
                    />
                </div>

                {/* ── THE CINEMATIC STAGE (Tudo acontece DENTRO deste card) ── */}
                <motion.div
                    style={{ scale: videoCardScale }}
                    // w-full e h-full travados para nunca cortarem o texto. aspect-ratio dinâmico.
                    className="relative w-full max-w-6xl h-full max-h-[65vh] md:max-h-[75vh] rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 bg-[#050505] z-20 flex flex-col items-center justify-center"
                >

                    {/* LAYER 1: FOTO ESTÁTICA BASE */}
                    <div className="absolute inset-0 z-10">
                        <img
                            src={staticImg}
                            className="w-full h-full object-cover md:object-center"
                            alt="Static Preview"
                            loading="lazy"
                            decoding="async"
                        />
                    </div>

                    {/* OVERLAY PARA TEXTO 1 */}
                    <motion.div
                        style={{ opacity: photoOverlayOpacity }}
                        className="absolute inset-0 z-[15] bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.3)_60%,transparent_100%)] pointer-events-none"
                    />

                    {/* LAYER 2: TEXTO 1 (A Arte em suas mãos) */}
                    <motion.div
                        style={{ opacity: text1Opacity, y: text1Y }}
                        className="absolute inset-0 z-[16] flex flex-col items-center justify-center text-center p-6 md:p-12 pointer-events-none"
                    >
                        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5rem] leading-[1.05] font-display font-medium text-white mb-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] tracking-tight">
                            O conteúdo estático <br />
                            <span className="relative inline-block px-2 mt-2 md:mt-3">
                                <span className="text-transparent bg-clip-text bg-gradient-to-l from-red-500 via-rose-500 to-pink-500 relative z-10">ficou no passado.</span>
                            </span>
                        </h2>

                        <div className="mt-8 md:mt-10 flex justify-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse" />
                                <span className="text-[10px] sm:text-xs font-mono tracking-[0.15em] text-red-50 font-bold uppercase opacity-90">Vamos transformar seu conteúdo</span>
                            </div>
                        </div>
                    </motion.div>


                    {/* LAYER 3: O VÍDEO (Revelado pelo Scanner) */}
                    <motion.div
                        className="absolute inset-0 z-20 overflow-hidden bg-black"
                        style={{ clipPath: useTransform(insetRight, (val) => `inset(0 ${val} 0 0)`) }}
                    >
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover scale-[1.01]"
                            muted
                            loop
                            playsInline
                            controls={false}
                            preload="metadata"
                            onLoadedData={() => setIsVideoLoaded(true)}
                        >
                            <source src={videoSrc} type="video/mp4" />
                        </video>
                    </motion.div>

                    {/* LAYER 4: A BARRA DO SCANNER */}
                    <motion.div
                        className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 z-30 shadow-[0_0_15px_rgba(34,211,238,0.6)] pointer-events-none"
                        style={{ left: scannerLeft, opacity: scannerOpacity }}
                    >
                        <div className="absolute top-1/2 -left-[3px] w-[8px] h-[60px] -translate-y-1/2 bg-white rounded-full blur-[1px]" />
                        <div className="absolute top-0 bottom-0 -left-[50px] w-[100px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-50" />
                    </motion.div>

                    {/* LAYER 5: OVERLAY PARA TEXTO 2 (Escurece o vídeo com gradiente) */}
                    <motion.div
                        style={{ opacity: videoOverlayOpacity }}
                        className="absolute inset-0 z-[35] bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.8)_0%,rgba(0,0,0,0.4)_50%,transparent_100%)] pointer-events-none"
                    />

                    {/* LAYER 6: TEXTO 2 E BOTÃO (O futuro é cinematográfico) */}
                    <motion.div
                        style={{ opacity: text2Opacity, y: text2Y }}
                        className="absolute inset-0 z-[40] flex flex-col items-center justify-center text-center p-6 md:p-12 pointer-events-none"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-white/10 border border-white/10 mb-4 md:mb-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse" />
                            <span className="text-[10px] sm:text-xs font-mono tracking-[0.15em] text-cyan-50 font-bold uppercase">A Nova Era</span>
                        </div>

                        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] leading-[1.05] font-display font-medium text-white mb-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] tracking-tight">
                            O futuro é <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-100 via-cyan-300 to-sky-500 animate-gradient-x relative z-10 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">cinematográfico.</span>
                        </h2>

                        <p className="text-blue-50/90 max-w-2xl mt-4 md:mt-6 font-light text-base sm:text-lg md:text-xl leading-relaxed drop-shadow-lg mx-auto">
                            Transformamos ativos parados em experiências visuais que prendem, emocionam e dominam a atenção da sua audiência.
                        </p>

                        {/* CTA Button */}
                        <div className="mt-8 md:mt-10 w-full flex justify-center pointer-events-auto">
                            <a
                                href="#pricing"
                                onClick={scrollToPricing}
                                className="group px-6 py-3.5 md:px-8 md:py-4 rounded-full text-white bg-white/10 border border-white/20 hover:bg-cyan-900/40 hover:border-cyan-400/50 backdrop-blur-2xl transition-all duration-500 font-medium tracking-wide active:scale-95 flex items-center justify-center gap-2 md:gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] text-sm md:text-base"
                            >
                                Começar Agora!
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 group-hover:translate-x-1.5 transition-transform duration-300"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                            </a>
                        </div>
                    </motion.div>

                    {/* Loading State */}
                    {!isVideoLoaded && (
                        <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center z-50">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-500 rounded-full animate-spin" />
                        </div>
                    )}
                </motion.div>
            </div>
        </section>
    );
};

export default Transformation;