
import { Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-[#020408] pt-32 pb-12 border-t border-white/5 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-12 gap-12 mb-24">
                    <div className="md:col-span-6">
                        <h2 className="text-4xl md:text-8xl font-display font-bold text-white mb-8 tracking-tighter leading-none">
                            FLOW WITH <br /> THE CURRENT.
                        </h2>
                        <div className="flex gap-4">
                            <button className="btn-primary">Start Creating</button>
                            <button className="btn-secondary">Contact Sales</button>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="text-white font-bold mb-6 font-mono text-xs uppercase tracking-widest text-[#38BDF8]">River</h4>
                        <ul className="space-y-4 text-muted text-sm font-light">
                            <li><a href="#" className="hover:text-primary ">Features</a></li>
                            <li><a href="#" className="hover:text-primary ">Pricing</a></li>
                            <li><a href="#" className="hover:text-primary ">API Keys</a></li>
                            <li><a href="#" className="hover:text-primary ">Showcase</a></li>
                        </ul>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="text-white font-bold mb-6 font-mono text-xs uppercase tracking-widest text-[#38BDF8]">Company</h4>
                        <ul className="space-y-4 text-muted text-sm font-light">
                            <li><a href="#" className="hover:text-primary ">Manifesto</a></li>
                            <li><a href="#" className="hover:text-primary ">Blog</a></li>
                            <li><a href="#" className="hover:text-primary ">Careers</a></li>
                        </ul>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="text-white font-bold mb-6 font-mono text-xs uppercase tracking-widest text-[#38BDF8]">Connect</h4>
                        <div className="flex gap-4">
                            <Twitter className="w-5 h-5 text-muted hover:text-primary cursor-pointer " />
                            <Instagram className="w-5 h-5 text-muted hover:text-primary cursor-pointer " />
                            <Linkedin className="w-5 h-5 text-muted hover:text-primary cursor-pointer " />
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-muted/40 font-mono">
                    <p>© 2026 RIVER LABS. ALL RIGHTS RESERVED.</p>
                    <div className="flex gap-8 mt-4 md:mt-0">
                        <a href="#">PRIVACY POLICY</a>
                        <a href="#">TERMS OF SERVICE</a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer;
