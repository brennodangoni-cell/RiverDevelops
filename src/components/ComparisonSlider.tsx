import React, { useRef, useState } from 'react';

const ComparisonSlider = () => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const position = ((x - rect.left) / rect.width) * 100;
        setSliderPosition(Math.min(Math.max(position, 0), 100));
    };

    return (
        <section id="showcase" className="py-24 bg-background relative z-10">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-16">
                    <span className="text-accent font-mono text-xs tracking-widest uppercase mb-4 block">Zero Latency Preview</span>
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
                        Before vs <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">RiverFlow</span>
                    </h2>
                </div>

                <div
                    ref={containerRef}
                    className="relative w-full aspect-video rounded-3xl overflow-hidden cursor-ew-resize border border-white/10 shadow-[0_0_50px_-10px_rgba(56,189,248,0.2)] group select-none"
                    onMouseMove={handleDrag}
                    onTouchMove={handleDrag}
                >
                    <div className="absolute inset-0 bg-black">
                        <img loading="lazy" src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1280&auto=format&fit=crop" alt="Cinematic After" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                        <span className="absolute top-8 right-8 text-primary font-mono text-xs bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-primary/20 tracking-widest font-bold">RIVER_PROCESSED</span>
                    </div>

                    <div
                        className="absolute inset-0 bg-gray-900 border-r border-white/50 will-change-[width] overflow-hidden"
                        style={{ width: `${sliderPosition}%` }}
                    >
                        <img loading="lazy" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1280&auto=format&fit=crop" alt="Raw Before" className="absolute inset-0 w-full h-full object-cover grayscale opacity-80" style={{ width: '100vw', maxWidth: 'none' }} />
                        <span className="absolute top-8 left-8 text-white/50 font-mono text-xs bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 tracking-widest">RAW_INPUT</span>
                    </div>

                    <div
                        className="absolute top-0 bottom-0 w-1 bg-white ml-[-2px] z-20 pointer-events-none"
                        style={{ left: `${sliderPosition}%` }}
                    ></div>

                    <div
                        className="absolute top-1/2 -mt-6 w-12 h-12 -ml-6 flex items-center justify-center z-30 group-active:scale-95 transition-transform"
                        style={{ left: `${sliderPosition}%` }}
                    >
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                            <div className="flex gap-[3px]">
                                <div className="w-[1px] h-4 bg-black"></div>
                                <div className="w-[1px] h-4 bg-black"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ComparisonSlider;
