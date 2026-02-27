
import { motion } from 'framer-motion';

const projects = [
    { id: 1, title: 'Summer Collection', category: 'Fashion', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop' },
    { id: 2, title: 'Tech Launch', category: 'Product', image: 'https://images.unsplash.com/photo-1531297461136-82lw85295982?q=80&w=2070&auto=format&fit=crop' },
    { id: 3, title: 'Urban Style', category: 'Lifestyle', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop' },
    { id: 4, title: 'Neon Vibes', category: 'Creative', image: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=1000&auto=format&fit=crop' },
    { id: 5, title: 'Minimalist Watch', category: 'Luxury', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1999&auto=format&fit=crop' },
    { id: 6, title: 'Dynamic Sport', category: 'Motion', image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070&auto=format&fit=crop' },
];

const Portfolio = () => {
    return (
        <section id="work" className="py-24 px-6 bg-background relative z-10">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tighter mb-4">
                            Selected <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-accent">Works</span>
                        </h2>
                        <div className="h-1 w-20 bg-primary rounded-full"></div>
                    </div>

                    <button className="btn-secondary group">
                        View Full Archive
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project, index) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.6 }}
                            viewport={{ once: true }}
                            className="group relative h-[450px] rounded-3xl overflow-hidden cursor-pointer"
                        >
                            <img
                                src={project.image}
                                alt={project.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />

                            {/* Glass Overlay on Hover */}
                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                <div className="glass-panel p-4 rounded-xl border border-white/10 backdrop-blur-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-primary text-xs font-mono font-bold tracking-widest uppercase">{project.category}</span>
                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white font-display mb-1">{project.title}</h3>
                                    <p className="text-white/60 text-sm">Automated Campaign • 2.4M Views</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Portfolio;
