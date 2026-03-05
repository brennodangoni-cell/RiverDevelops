import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, ArrowRight } from 'lucide-react';

export default function ClientLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post('/api/clients/login', { username, password });
            if (res.data.token) {
                localStorage.setItem('rivertasks_client_token', res.data.token);
                localStorage.setItem('rivertasks_client_user', JSON.stringify(res.data.client));
                toast.success('Acesso liberado!');
                navigate('/cliente');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Acesso negado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-white bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">

            {/* Go Back button */}
            <button onClick={() => navigate('/')} className="absolute top-8 left-8 text-white/40 hover:text-white transition-colors bg-white/5 p-3 rounded-full hover:bg-white/10 z-20 flex items-center gap-2 text-xs font-bold uppercase tracking-widest group">
                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">Voltar</span>
            </button>

            <div className="z-10 w-full max-w-[420px] bg-[#141414] border border-white/5 p-10 sm:p-12 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative group">
                {/* Top thin luminous line */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

                <div className="text-center mb-10 select-none flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-black border border-white/20 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-cyan-500/10" />
                        <img src="/logo.webp" alt="River Logo" className="w-10 h-10 object-contain relative z-10" />
                    </div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight mb-2 uppercase">Área do Cliente</h1>
                    <p className="text-white/40 text-sm font-light">Acesse suas entregas e materiais</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1 flex flex-col">
                        <label className="text-[10px] font-medium text-white/50 uppercase tracking-widest ml-1 mb-1 select-none pointer-events-none">Usuário</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all font-light"
                            required
                        />
                    </div>
                    <div className="space-y-1 flex flex-col">
                        <label className="text-[10px] font-medium text-white/50 uppercase tracking-widest ml-1 mb-1 select-none pointer-events-none">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all font-light placeholder:text-white/20"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-8 bg-cyan-500/10 ring-1 ring-inset ring-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:ring-cyan-500/50 hover:text-cyan-300 font-bold uppercase tracking-widest text-[10px] py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] group/btn select-none"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <>
                                Entrar na Plataforma
                                <ArrowRight className="w-4 h-4 opacity-70 group-hover/btn:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </div>

            <div className="absolute bottom-8 text-xs text-white/30 font-light tracking-widest select-none pointer-events-none z-10">
                RIVER CREATIVE LAB &copy; {new Date().getFullYear()}
            </div>
        </div>
    );
}
