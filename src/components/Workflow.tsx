
import { Upload, Zap, CheckCircle2 } from 'lucide-react';

const Workflow = () => {
    const steps = [
        {
            icon: Upload,
            title: "1. Envie seus Assets",
            desc: "Faça upload das fotos dos seus produtos. Sem briefing complexo. Apenas as imagens e links."
        },
        {
            icon: Zap,
            title: "2. Produção Acelerada",
            desc: "Nossos designers e editores transformam suas fotos em vídeos de alta conversão, com copy, motion e trilha."
        },
        {
            icon: CheckCircle2,
            title: "3. Pronto para Rodar",
            desc: "Receba, aprove e suba nas campanhas. Formatos otimizados para Meta, TikTok e YouTube."
        }
    ];

    return (
        <section id="process" className="py-32 bg-background relative z-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col items-center text-center mb-24">
                    <span className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-xs tracking-widest uppercase mb-6 animate-pulse-glow">
                        The Pipeline
                    </span>
                    <h2 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight mb-6">
                        From Raw to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Ripple Effect.</span>
                    </h2>
                    <p className="text-muted text-lg max-w-xl">
                        A seamless, friction-free process designed for speed. You upload, we flow.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    {/* Connecting Fluid Line */}
                    <div className="hidden md:block absolute top-[2.5rem] left-0 right-0 h-[2px] bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 z-0"></div>

                    {steps.map((step, i) => (
                        <div key={i} className="relative z-10 group">
                            <div className="glass-panel p-8 rounded-3xl hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 group-hover:shadow-[0_0_30px_rgba(56,189,248,0.2)]">
                                <div className="w-16 h-16 bg-surface rounded-2xl border border-white/10 flex items-center justify-center mb-6 text-white group-hover:bg-primary group-hover:text-black transition-all duration-300 shadow-lg relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <step.icon size={28} className="relative z-10" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 tracking-tight font-display">{step.title}</h3>
                                <p className="text-muted leading-relaxed text-sm font-light">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Workflow;
