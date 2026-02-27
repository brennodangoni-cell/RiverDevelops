import { useRef, useState, useEffect } from 'react';



interface HeroProps {
    onIntroComplete?: () => void;
}

const Hero = ({ onIntroComplete }: HeroProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasTriggeredRevealRef = useRef(false);

    // Changed phase to simpler states for video
    const [phase, setPhase] = useState<'loading' | 'playing' | 'revealing' | 'done'>('loading');
    const [progress, setProgress] = useState(0);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [videoReady, setVideoReady] = useState(false);

    // Using Cloudinary URL for all devices since we cleaned up the local public folder
    const [videoSrc] = useState('https://res.cloudinary.com/dobo2yvgz/video/upload/f_auto,q_auto/v1771527902/hero-final-v2_ggubeo.mp4');

    // EXPLICIT IMAGE PRELOADER - Only load critical above-the-fold assets
    useEffect(() => {
        const imageUrls = [
            'https://res.cloudinary.com/dobo2yvgz/image/upload/f_auto,q_auto/v1771536633/3a7f0b99-39fb-43bd-aa83-2da0ff50e266_1_pot63c.png'
        ];
        let loadedCount = 0;

        if (imageUrls.length === 0) {
            setImagesLoaded(true);
            return;
        }

        const handleImageLoad = () => {
            loadedCount++;
            if (loadedCount === imageUrls.length) {
                setImagesLoaded(true);
            }
        };

        imageUrls.forEach(url => {
            const img = new Image();
            img.src = url;
            img.onload = handleImageLoad;
            img.onerror = handleImageLoad;
        });
    }, []);

    // Safety Net AND Main trigger evaluator
    useEffect(() => {
        if (phase === 'loading') {
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 95) {
                        return (imagesLoaded && videoReady) ? 100 : 95;
                    }
                    const inc = Math.max(1, (95 - prev) / 10);
                    return Math.min(95, prev + inc);
                });
            }, 50);

            if (imagesLoaded && videoReady) {
                setProgress(100);
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play().catch(e => {
                            if (e.name !== 'AbortError') console.warn("Video play error:", e);
                        });
                    }
                    setPhase('playing');
                }, 200);
            }

            const timeout = setTimeout(() => {
                setProgress(100);
                setPhase('playing');
            }, 6000);

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }

        if (phase === 'playing') {
            const revealTimeout = setTimeout(() => {
                if (!hasTriggeredRevealRef.current) {
                    hasTriggeredRevealRef.current = true;
                    setPhase('revealing');
                    if (onIntroComplete) onIntroComplete();
                }
            }, 2000);
            return () => clearTimeout(revealTimeout);
        }
    }, [phase, imagesLoaded, videoReady, onIntroComplete]);

    // Handle Video Progress
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;

        const videoProgress = video.currentTime / video.duration;

        // Optimized trigger point: Reveal sooner (30% instead of 60%) to feel faster
        if (phase === 'playing' && videoProgress > 0.30 && !hasTriggeredRevealRef.current) {
            hasTriggeredRevealRef.current = true;
            setPhase('revealing');
            if (onIntroComplete) onIntroComplete();
        }
    };

    const handleVideoEnd = () => {
        // Ensure we end up in done state and video stops
        if (videoRef.current) {
            videoRef.current.pause();
        }
        setPhase('done');
    };

    const handleCanPlay = async () => {
        if (videoReady) return;
        setVideoReady(true);
    };

    const isRevealed = phase === 'revealing' || phase === 'done';
    const isLoading = phase === 'loading';

    return (
        <div className="relative min-h-[100dvh] overflow-hidden flex items-center justify-center bg-black">

            {/* ── Loading Screen ── */}
            <div
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#020408] gap-8 transition-opacity duration-700 ease-out"
                style={{
                    opacity: isLoading ? 1 : 0,
                    pointerEvents: isLoading ? 'auto' : 'none',
                    zIndex: 100
                }}
            >
                <div className="relative">
                    <img src="/logo.webp" alt="River Flow" width="64" height="64" fetchPriority="high" className="w-16 h-16 object-contain" />
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse-slow" />
                </div>

                {/* Progress Bar & Percentage */}
                <div className="flex flex-col items-center gap-2">
                    <div className="w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-200 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono text-cyan-500/80 tracking-widest tabular-nums">
                        {Math.round(progress)}%
                    </span>
                </div>
            </div>

            {/* ── Video Layer ── */}
            <div className="absolute top-0 left-0 w-screen h-full z-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#020408] to-black">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover scale-[1.02]"
                    muted
                    playsInline
                    autoPlay
                    controls={false}
                    preload="auto"
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleVideoEnd}
                    onCanPlayThrough={handleCanPlay}
                    style={{
                        transform: phase === 'playing' || isRevealed ? 'scale(1.08)' : 'scale(1.0)',
                        filter: 'contrast(1.1) saturate(1.1)',
                        transition: 'transform 3s ease-out'
                    }}
                >
                    <source src={videoSrc} type="video/mp4" />
                </video>
            </div>

            {/* iOS/Android Autoplay Fallback Button */}
            {phase === 'playing' && !isRevealed && (
                <div
                    className="absolute inset-0 z-40 flex items-center justify-center md:hidden"
                    onClick={() => {
                        if (videoRef.current) {
                            videoRef.current.play();
                            videoRef.current.muted = false; // Optional: unmute on manual play
                        }
                    }}
                >
                    {/* Invisible overlay to catch touches if needed, or just rely on the user tapping the screen naturally */}
                </div>
            )}

            {/* ── Overlays (Blends Removed) ── */}

            {/* ── Dark Fade Overlay ── */}
            <div
                className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-1000 ease-out"
                style={{ opacity: isRevealed ? 1 : 0 }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />
            </div>

            {/* ── Hero Content ── */}
            <div
                className="relative z-20 flex flex-col items-center text-center px-6 max-w-5xl mx-auto w-full"
                style={{
                    opacity: isRevealed ? 1 : 0,
                    transform: isRevealed ? 'translate3d(0,0,0)' : 'translate3d(0, 30px, 0)',
                    filter: isRevealed ? 'none' : 'blur(4px)',
                    transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[150%] max-w-[900px] pointer-events-none -z-10 transform-gpu"
                    style={{
                        transform: 'translate3d(-50%, -50%, 0)',
                        background: 'radial-gradient(ellipse, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 45%, transparent 70%)'
                    }}
                />

                {/* 
                    Premium Text Protection (Vignette)
                    This elegant radial gradient protects the text and matches the circular background. 
                */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] aspect-square max-w-[1000px] rounded-full pointer-events-none -z-10"
                    style={{
                        background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0) 70%)',
                        transform: 'translate3d(-50%, -50%, 0)'
                    }}
                />

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md mb-8 hover:bg-white/10 transition-colors duration-300">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse" />
                    <span className="text-xs font-mono tracking-widest text-cyan-100 font-bold uppercase">River Creative Lab</span>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-6xl lg:text-8xl font-display font-bold tracking-tighter leading-[0.85] md:leading-[0.8] mb-8 flex flex-col items-center">
                    <span className="text-white drop-shadow-2xl">Fotos comuns viram</span>
                    <span className="relative inline-block -mt-1 md:-mt-3">
                        {/* Dark Glow Behind replacing the Cyan Glow (Mobile GPU Friendly) */}
                        <span className="absolute inset-[10%] -z-10 rounded-[50%] scale-150 transform-gpu"
                            style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.95) 20%, rgba(0,0,0,0.4) 70%, transparent 100%)' }}
                        />
                        {/* Main Text with Premium Gradient */}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-100 via-cyan-300 to-sky-500 animate-gradient-x bg-[length:200%_auto] pb-2 relative z-10 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                            conteúdos que vendem
                        </span>
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg md:text-xl text-blue-100/90 font-sans font-light max-w-xl leading-relaxed mb-10 [text-shadow:_0_4px_10px_rgba(0,0,0,0.8)] px-4">
                    Produções de alto padrão a partir do que você já tem. Transforme sua marca com a estética do futuro.
                </p>

                {/* Buttons */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full md:w-auto items-center justify-center mt-6 md:mt-0">
                    <a href="#work" className="px-8 py-4 rounded-full text-white bg-white/5 border border-white/20 hover:bg-white/10 backdrop-blur-md transition-all duration-300 font-medium tracking-wide w-full md:w-auto active:scale-95 text-center flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        Ver Portfólio
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Hero;
