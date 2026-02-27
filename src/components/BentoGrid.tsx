
import { Zap, Layers, MousePointer2, Play } from 'lucide-react';

const BentoGrid = () => {
    return (
        <section id="studio" className="py-24 bg-background relative px-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-20 text-center">
                    <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6">
                        Engineered for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Liquid Scale.</span>
                    </h2>
                    <p className="text-muted text-lg max-w-2xl mx-auto">
                        A strictly fluid architecture designed to flood the feed with quality.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-4 md:grid-rows-2 gap-4 h-[1200px] md:h-[600px]">
                    {/* Large Card */}
                    <div className="md:col-span-2 md:row-span-2 rounded-3xl glass-panel p-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-primary border border-white/10">
                                    <Zap size={24} />
                                </div>
                                <h3 className="text-3xl font-display font-bold text-white mb-2">Real-time Stream</h3>
                                <p className="text-muted font-light">Generate hundreds of variations in minutes. Test angles, lighting, and environments instantly.</p>
                            </div>

                            <div className="mt-8 rounded-xl bg-black/40 border border-white/5 h-64 overflow-hidden relative group-hover:border-primary/30 transition-colors">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-60 group-hover:opacity-80 transition-opacity duration-700"></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

                                {/* Simulated UI Interface */}
                                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                                    <div className="flex gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500/80"></div>
                                        <div className="w-2 h-2 rounded-full bg-yellow-500/80"></div>
                                        <div className="w-2 h-2 rounded-full bg-green-500/80"></div>
                                    </div>
                                    <div className="px-2 py-1 rounded bg-black/50 backdrop-blur-md text-[10px] font-mono text-primary border border-primary/20">RENDER_LIVE</div>
                                </div>

                                {/* Animated Timeline */}
                                <div className="absolute bottom-4 left-4 right-4 h-12 bg-black/60 backdrop-blur-xl rounded-lg border border-white/5 flex items-center px-3 gap-3 overflow-hidden z-20">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Play size={10} className="fill-primary text-primary ml-0.5" />
                                    </div>
                                    <div className="flex-1 h-8 flex gap-[2px] items-center relative overflow-hidden">
                                        {[...Array(30)].map((_, i) => (
                                            <div key={i} className={`w-[2px] bg-white/10 rounded-full ${i % 3 === 0 ? 'h-3' : 'h-1.5'}`}></div>
                                        ))}
                                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary shadow-[0_0_15px_#38BDF8] animate-slide-right"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Medium Card 1 */}
                    <div className="md:col-span-1 md:row-span-2 rounded-3xl glass-panel p-8 relative overflow-hidden group transition-colors">
                        <h3 className="text-xl font-display font-bold text-white mb-2">Crystal Clarity</h3>
                        <p className="text-muted text-sm mb-4 font-light">4K Export Standard.</p>
                        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary/10 to-transparent"></div>
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-5xl font-mono font-black text-white/5 group-hover:text-primary/20 transition-colors">4K</div>
                    </div>

                    {/* Small Card 1 */}
                    <div className="md:col-span-1 md:row-span-1 rounded-3xl glass-panel p-6 flex flex-col justify-center items-center text-center group hover:bg-white/5 transition-colors">
                        <Layers className="text-secondary mb-3 group-hover:rotate-180 transition-transform duration-700 ease-in-out" size={32} />
                        <h3 className="text-white font-bold font-display">Deep Layers</h3>
                    </div>

                    {/* Small Card 2 */}
                    <div className="md:col-span-1 md:row-span-1 rounded-3xl glass-panel p-6 flex flex-col justify-center items-center text-center group hover:bg-white/5 transition-colors">
                        <MousePointer2 className="text-accent mb-3 group-hover:scale-110 transition-transform" size={32} />
                        <h3 className="text-white font-bold font-display">One-Click Flow</h3>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BentoGrid;
