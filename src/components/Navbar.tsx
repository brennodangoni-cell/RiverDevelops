import { Menu, X, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
    visible?: boolean;
}

const navItems = [
    { label: 'Portfólio', href: '#work' },
    {
        label: 'Pacotes',
        href: '#pricing',
        action: (e: any) => {
            e.preventDefault();
            const el = document.getElementById('pricing');
            if (el) {
                // 1. Pula direto para as "Realidades Intangíveis" (Teaser) de forma invisível
                const sectionTop = el.offsetTop;
                window.scrollTo({ top: sectionTop, behavior: 'auto' });

                // 2. ZERO demoras! Inicia no exato frame seguinte a descida cinematográfica hiper-suave
                const startPos = sectionTop;
                const endPos = el.offsetTop + el.offsetHeight - window.innerHeight;
                const distance = endPos - startPos;
                const duration = 2500; // Viagem de 2.5s
                let startTimestamp: number | null = null;

                const smoothStep = (timestamp: number) => {
                    if (!startTimestamp) startTimestamp = timestamp;
                    const progress = Math.min((timestamp - startTimestamp) / duration, 1);

                    // Sine Ease-In-Out (Muito mais fluido e leve pra GPU do que o Cubic, sem os saltos no meio)
                    const ease = -(Math.cos(Math.PI * progress) - 1) / 2;

                    window.scrollTo(0, startPos + distance * ease);

                    if (progress < 1) {
                        requestAnimationFrame(smoothStep);
                    }
                };

                // Browser encolhe o delay agendando para o primeiro frame livre
                requestAnimationFrame(smoothStep);
            }
        }
    }
];

const Navbar = ({ visible = false }: NavbarProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 py-6 transition-all duration-1000 cubic-bezier(0.16,1,0.3,1) ${visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-8 pointer-events-none'
                }`}
        >
            <div className="max-w-7xl mx-auto px-6">
                <div className="relative flex items-center justify-between pl-2 pr-6 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/5 shadow-2xl">

                    {/* Logo */}
                    <a
                        href="#hero"
                        onClick={(e) => {
                            e.preventDefault();
                            window.scrollTo({ top: 0, behavior: 'auto' });
                        }}
                        className="flex items-center gap-4 cursor-pointer group"
                    >
                        <div className="relative">
                            <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <img
                                src="/logo.webp"
                                alt="River Logo"
                                className="relative h-12 w-12 object-contain rounded-full group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <span className="text-xl font-display font-bold text-white tracking-wide group-hover:text-cyan-100 transition-colors duration-500">RIVER</span>
                    </a>

                    {/* Desktop Links (Correctly uses navItems) */}
                    <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                        {navItems.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                onClick={(e) => {
                                    if (item.action) {
                                        item.action(e);
                                    }
                                }}
                                className="px-5 py-2 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center">
                        <a
                            href="https://wa.me/5534992981424"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/5 border border-white/20 text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-white/10 hover:border-white/40 transition-all duration-300 flex items-center gap-2 group"
                        >
                            Iniciar Projeto <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-24 left-4 right-4 p-6 rounded-3xl bg-black/90 backdrop-blur-2xl border border-white/10 flex flex-col gap-2 shadow-[0_0_40px_rgba(0,0,0,0.8)] origin-top z-50 ring-1 ring-white/5"
                    >
                        {/* Mobile Links */}
                        {navItems.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className="text-xl font-display font-medium text-white/80 py-4 border-b border-white/5 last:border-0 hover:text-cyan-400 hover:pl-2 transition-all duration-300"
                                onClick={(e) => {
                                    setIsOpen(false);
                                    if (item.action) {
                                        item.action(e);
                                    }
                                }}
                            >
                                {item.label}
                            </a>
                        ))}

                        <div className="h-4" /> {/* Spacer */}

                        <a
                            href="https://wa.me/5534992981424"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-white/5 text-white border border-white/20 font-medium py-4 rounded-full mt-2 hover:bg-white/10 hover:border-white/40 transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 group"
                        >
                            Iniciar Projeto <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
