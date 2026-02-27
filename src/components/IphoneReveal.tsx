import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';

interface Project {
    id: number;
    client: string;
    niche: string;
    logo: string;
    material: string;
    result: string;
    caption?: string;
    dark?: boolean;
}

const projects: Project[] = [
    {
        id: 1,
        client: "Lojas Dufins",
        niche: "Tênis Esportivos",
        logo: "https://res.cloudinary.com/dobo2yvgz/image/upload/v1771537332/dufins_2_a17a662e-2327-4f2c-97c6-91725f0a2f02_205x_2x_vjbw7k.png",
        material: "https://res.cloudinary.com/dobo2yvgz/image/upload/v1771539425/provasocial_i5rsy6.png",
        result: "https://res.cloudinary.com/dobo2yvgz/video/upload/v1771530888/Dufins_gpger0.mp4",
        caption: "Edição voltada para tração de vendas e tráfego pago."
    },
    {
        id: 2,
        client: "Fabullete",
        niche: "Moda Feminina",
        logo: "/fabullete-logo.webp",
        material: "https://res.cloudinary.com/dobo2yvgz/image/upload/v1771797602/IMG_8899_ss9scp.webp",
        result: "https://res.cloudinary.com/dobo2yvgz/video/upload/v1771797651/Fabullete_4_kfpygy.mp4",
        caption: "Transformação estética premium para moda e e-commerce."
    },
    {
        id: 3,
        client: "Catalão Náutica",
        niche: "Loja Náutica",
        logo: "https://res.cloudinary.com/dobo2yvgz/image/upload/v1772028038/catalao_nautica_loho_v9ndtv.webp",
        material: "https://res.cloudinary.com/dobo2yvgz/image/upload/v1772028613/provasocialnova_dpvdgn.webp",
        result: "https://res.cloudinary.com/dobo2yvgz/video/upload/v1772028151/bassbrasilboats_dpkdvm.mp4",
        caption: "Audiovisual de alto padrão para mercado náutico."
    },
    {
        id: 4,
        client: "Flag Watches",
        niche: "Loja de Relógios",
        logo: "https://res.cloudinary.com/dobo2yvgz/image/upload/v1772028886/flagwatcheslogo_nwbmlr.webp",
        material: "https://res.cloudinary.com/dobo2yvgz/image/upload/v1772029251/flagwatchesprova_dcixf6.webp",
        result: "https://res.cloudinary.com/dobo2yvgz/video/upload/v1772029082/flagwatches_legenda_branca_final_suave_xd3sxj.mp4",
        caption: "Visual imersivo para realçar prestígio e detalhes."
    }
];

const IphoneReveal = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "start start"]
    });

    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 60,
        damping: 20,
        restDelta: 0.001
    });

    // ─── Animations ───
    // Using 3D tilt and translation for a more cinematic entry
    const tiltX = useTransform(smoothProgress, [0.3, 1], ["20%", "0%"]);
    const scale = useTransform(smoothProgress, [0.3, 1], [0.95, 1]);
    const opacity = useTransform(smoothProgress, [0.2, 0.7], [0, 1]);
    const bgOpacity = useTransform(smoothProgress, [0, 0.4], [0, 1]);
    const bgScale = useTransform(smoothProgress, [0, 1], [1, 1.15]); // Extra scale for bg zoom effect

    const handleNext = () => {
        if (videoRef.current) {
            videoRef.current.pause();
        }
        setIsPlaying(false);
        setCurrentIndex((prev) => (prev + 1) % projects.length);
    };

    const handlePrev = () => {
        if (videoRef.current) {
            videoRef.current.pause();
        }
        setIsPlaying(false);
        setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
    };

    const handleVideoToggle = async () => {
        const video = videoRef.current;
        if (!video) return;

        try {
            if (video.paused) {
                video.muted = false;
                await video.play();
            } else {
                video.pause();
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            console.warn("Playback interaction error:", err);
            // Fallback for auto-play policy
            try {
                video.muted = true;
                await video.play();
            } catch (f) { /* ignore */ }
        }
    };

    useEffect(() => {
        // Sync ref-based state if needed, but primarily handle project switch
        if (videoRef.current) {
            videoRef.current.pause();
        }
    }, [currentIndex]);



    const currentProject = projects[currentIndex];

    return (
        <section id="work" ref={containerRef} className="relative z-10 bg-[#070707] min-h-screen w-full flex flex-col items-center justify-center overflow-hidden will-change-transform">


            <div className="sticky top-0 min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">

                {/* ── Background: Cloudinary Image with Cinematic Blend ── */}
                <div className="absolute inset-0 z-0 bg-[#070707] pointer-events-none overflow-hidden">
                    <motion.div style={{ opacity: bgOpacity, scale: bgScale }} className="absolute inset-0 transform-gpu will-change-transform">
                        <img
                            src="https://res.cloudinary.com/dobo2yvgz/image/upload/v1771536633/3a7f0b99-39fb-43bd-aa83-2da0ff50e266_1_pot63c.png"
                            alt="Background"
                            className="w-full h-full object-cover opacity-30 object-center"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/40 to-transparent transform-gpu" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-transparent to-transparent" />
                    </motion.div>
                </div>

                {/* ── Main Layout Container ── */}
                <div className="relative w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-16 flex flex-col md:flex-row items-center justify-center md:justify-between min-h-screen pt-24 pb-8 md:py-0 z-10 gap-6 lg:gap-16">

                    {/* ── LEFT: Typography & Navigation ── */}
                    <div className="w-full md:w-[45%] flex flex-col justify-center items-center md:items-start text-center md:text-left flex-shrink-0 pt-0 z-40 order-2 md:order-1 mt-2">

                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: false, amount: 0.3 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="flex flex-col mb-12"
                        >
                            <span className="text-white/40 uppercase tracking-[0.3em] text-[10px] md:text-xs font-semibold mb-4 md:mb-6 flex items-center justify-center md:justify-start gap-4 mx-auto md:mx-0">
                                <span className="w-8 md:w-12 h-[1px] bg-white/20"></span>
                                Nosso Portfólio
                            </span>
                            <h2 className="text-[2.5rem] leading-[0.95] sm:text-5xl md:text-7xl lg:text-8xl font-light text-white tracking-tight mb-4 md:mb-8">
                                Conheça os <br className="hidden md:block" />
                                <span className="font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 ml-2 md:ml-0">resultados</span>.
                            </h2>
                            <p className="text-white/50 text-sm md:text-lg max-w-sm font-light leading-relaxed hidden sm:block">
                                A prova real do nosso nível de produção. Arraste para visualizar a transformação completa.
                            </p>
                        </motion.div>

                        {/* ── Custom Editorial Navigator ── */}
                        <div className="flex items-center gap-4 md:gap-8 mt-6 md:mt-8 bg-white/[0.02] border border-white/5 rounded-full px-4 md:px-6 py-3 md:py-4 backdrop-blur-md shadow-2xl mx-auto md:mx-0 w-max max-w-full">
                            {/* Navigation Arrows */}
                            <div className="flex items-center gap-1 md:gap-2">
                                <button
                                    onClick={handlePrev}
                                    className="group flex flex-col items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all duration-300 active:scale-95 touch-manipulation"
                                    aria-label="Projeto Anterior"
                                >
                                    <ChevronLeft className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" strokeWidth={2} />
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="group flex flex-col items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all duration-300 active:scale-95 touch-manipulation"
                                    aria-label="Próximo Projeto"
                                >
                                    <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" strokeWidth={2} />
                                </button>
                            </div>

                            <div className="h-8 md:h-10 w-[1px] bg-white/10 mx-1 md:mx-2"></div>

                            {/* Client Active Detail */}
                            <div className="flex flex-col justify-center min-w-[120px] md:min-w-[140px] overflow-hidden text-center items-center">
                                <div className="flex flex-col items-center w-full">
                                    <div className="h-8 md:h-12 mb-1 flex items-center justify-center w-full px-2">
                                        <img
                                            key={`logo-${currentProject.id}`}
                                            src={currentProject.logo}
                                            alt={currentProject.client}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-auto max-w-[150px] md:max-w-[220px] object-contain brightness-0 invert opacity-100 drop-shadow-md"
                                        />
                                    </div>
                                    <span key={`niche-${currentProject.id}`} className="text-[9px] md:text-xs font-semibold tracking-wider text-white/40 uppercase truncate w-full px-2">
                                        {currentProject.niche}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Double Phone Composition (Overlapping) ── */}
                    <div className="w-full md:w-[55%] flex justify-center items-center h-auto md:h-full perspective-[2500px] relative order-1 md:order-2 mt-0 md:mt-0">

                        <div className="relative w-full max-w-[800px] flex items-center justify-center h-[55vh] sm:h-[60vh] md:h-[70vh]">

                            {/* ── BACK PHONE: Material do Cliente (Wrapper Centered Fixed Size) ── */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[87%] md:h-[93%] w-auto aspect-[9/19.5] z-20 pointer-events-none">
                                <motion.div
                                    style={{ rotateY: tiltX, x: "-38%", y: "-3%", scale: 1, opacity: opacity }}
                                    className="w-full h-full rounded-[2vh] md:rounded-[40px] border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] group/back pointer-events-auto transition-all duration-300 ease-out"
                                >
                                    <div className="absolute inset-0 bg-black/40 group-hover/back:bg-black/0 transition-colors duration-300 z-50 pointer-events-none"></div>

                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[35%] h-[4%] bg-black rounded-full z-40"></div>
                                    <div className="w-full h-full p-[6px] relative overflow-hidden rounded-[2.5vh] md:rounded-[40px]">
                                        <div className="w-full h-full relative overflow-hidden rounded-[2vh] md:rounded-[34px] bg-black">
                                            <img
                                                key={`mat-${currentProject.id}`}
                                                src={currentProject.material.includes('cloudinary') ? currentProject.material.replace('/upload/', '/upload/f_auto,q_auto,w_500/') : currentProject.material}
                                                alt={`Material ${currentProject.client}`}
                                                className="absolute inset-0 w-full h-full object-cover"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                            <div className="absolute inset-0 bg-black/25 pointer-events-none z-10" style={{ mixBlendMode: 'multiply' }}></div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* ── FRONT PHONE: Resultado River (Wrapper Centered Fixed Size) ── */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[92%] md:h-[98%] w-auto aspect-[9/19.5] z-30 pointer-events-none">
                                <motion.div
                                    style={{ rotateY: tiltX, x: "32%", y: "2%", scale: scale, opacity: opacity }}
                                    className="w-full h-full rounded-[3vh] md:rounded-[46px] border-[2px] border-white/10 bg-[#0a0a0a] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.95)] pointer-events-auto"
                                >
                                    <div className="absolute inset-0 rounded-[3vh] md:rounded-[46px] border border-white/5 pointer-events-none z-50" />
                                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[35%] h-[3.5%] bg-black rounded-full z-50 shadow-[0_2px_10px_rgba(0,0,0,0.5)]" />

                                    <div className="w-full h-full p-[8px] sm:p-[10px] relative overflow-hidden rounded-[3vh] md:rounded-[46px]">
                                        <div className="absolute inset-0 w-full h-full bg-black">
                                            {projects.map((p, index) => {
                                                const isActive = currentIndex === index;
                                                const videoUrl = p.result.includes('cloudinary')
                                                    ? p.result.replace('/upload/', '/upload/f_auto,q_auto,w_500/')
                                                    : p.result;
                                                const posterUrl = p.result.replace('.mp4', '.jpg').includes('cloudinary')
                                                    ? p.result.replace('.mp4', '.jpg').replace('/upload/', '/upload/f_auto,q_auto,w_500/')
                                                    : p.result.replace('.mp4', '.jpg');

                                                return (
                                                    <motion.div
                                                        key={`vid-container-${p.id}`}
                                                        initial={false}
                                                        animate={{
                                                            opacity: isActive ? 1 : 0,
                                                            scale: isActive ? 1 : 1.05,
                                                            filter: isActive ? 'blur(0px)' : 'blur(8px)'
                                                        }}
                                                        transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
                                                        className="absolute inset-0 w-full h-full cursor-pointer"
                                                        style={{
                                                            pointerEvents: isActive ? 'auto' : 'none',
                                                            zIndex: isActive ? 20 : 10
                                                        }}
                                                        onClick={handleVideoToggle}
                                                    >
                                                        <video
                                                            ref={isActive ? videoRef : null}
                                                            src={videoUrl}
                                                            poster={posterUrl}
                                                            className="w-full h-full object-cover shadow-inner"
                                                            playsInline
                                                            loop
                                                            muted
                                                            preload="none"
                                                            onPlay={() => isActive && setIsPlaying(true)}
                                                            onPause={() => isActive && setIsPlaying(false)}
                                                        />
                                                    </motion.div>
                                                );
                                            })}
                                        </div>

                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none z-20" />

                                        {/* Reels Info Overlay */}
                                        <div className="absolute bottom-4 md:bottom-6 left-3 md:left-5 right-3 md:right-5 z-40 flex flex-col gap-2 md:gap-3 pointer-events-none">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-black/60 border border-white/20 overflow-hidden flex items-center justify-center backdrop-blur-md">
                                                    <img width="24" height="24" src="/logo.webp" alt="River" className="w-[60%] h-auto object-contain brightness-0 invert" />
                                                </div>
                                                <span className="text-white text-[10px] md:text-xs font-semibold drop-shadow-lg tracking-wide">@riverdevelops</span>
                                            </div>
                                            <p className="text-white/80 text-[9px] md:text-[11px] leading-tight md:leading-snug font-extralight drop-shadow-md pr-2 md:pr-4">
                                                {currentProject.caption || "Transformação visual focada em reter e converter."} <br className="hidden md:block" />
                                                <span className="font-light text-white/50 tracking-wider text-[8px] md:text-[9px] mt-1 block">#resultado #produção</span>
                                            </p>
                                        </div>

                                        {/* Play Button Overlay */}
                                        <div
                                            className={`absolute inset-0 flex items-center justify-center z-50 cursor-pointer transition-all duration-150 ${isPlaying ? 'opacity-0 scale-125 pointer-events-none' : 'opacity-100 scale-100'}`}
                                            onClick={handleVideoToggle}
                                        >
                                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-black/40 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-2xl hover:scale-110 active:scale-95 transition-transform duration-300">
                                                <Play size={32} className="text-white fill-white ml-1.5" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default IphoneReveal;
