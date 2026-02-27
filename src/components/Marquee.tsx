
import { motion } from 'framer-motion';

const Marquee = () => {
    return (
        <div className="py-10 border-y border-white/5 bg-black/20 backdrop-blur-sm overflow-hidden flex flex-col items-center relative z-10 gap-4">
            <span className="text-xs font-mono text-muted/30 tracking-[0.2em] uppercase">Trusted by innovative teams at</span>
            <div className="w-full relative overflow-hidden flex">
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#050510] to-transparent z-10"></div>
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#050510] to-transparent z-10"></div>

                <motion.div
                    className="flex gap-20 items-center whitespace-nowrap"
                    animate={{ x: [0, -1000] }}
                    transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
                >
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex gap-20 items-center">
                            {['NIKE', 'ADIDAS', 'SAMSUNG', 'SONY', 'TESLA', 'APPLE', 'SPOTIFY', 'NETFLIX'].map((brand) => (
                                <span key={brand} className="text-2xl font-display font-bold text-white/20 hover:text-white/80 transition-colors cursor-default select-none">{brand}</span>
                            ))}
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default Marquee;
