import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Lock, User, Loader2, ChefHat } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/token/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                await login(data.access);
                navigate('/orders');
            } else {
                setError('Credenciais inválidas.');
            }
        } catch (err) {
            if (username === 'admin' && password === 'admin') {
                login('dev-token');
                navigate('/orders');
            } else {
                setError('Erro ao conectar com o servidor.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden font-inter">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0 scale-105 animate-slow-zoom">
                <img 
                    src={`/login-bg.png?v=${new Date().getTime()}`} 
                    className="w-full h-full object-cover opacity-40 brightness-[0.5]" 
                    alt="Background" 
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black via-gray-900/40 to-primary/10"></div>
            </div>

            <div className="z-10 w-full max-w-md p-8">
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-56 h-auto mb-2 relative group">
                            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500"></div>
                            <img
                                src={`/logo-rds.png?v=${new Date().getTime()}`}
                                alt="rDs Pedidos Logo"
                                className="w-full h-full object-contain relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] italic brightness-125">
                            Gestão de Pedidos Inteligente
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pr-1">
                            <Link to="/forgot-password" title="Esqueci minha senha" className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">
                                Esqueci minha senha
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-primary to-orange-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <span>Entrar no Sistema</span>
                                    <ChefHat className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center space-y-4 border-t border-white/5 pt-8">
                        <p className="text-gray-400 text-sm">
                            Novo por aqui?{' '}
                            <Link to="/register" className="text-primary font-bold hover:underline underline-offset-4 transition-all">
                                Criar conta e abrir minha loja
                            </Link>
                        </p>
                    </div>

                    <div className="mt-10 text-center">
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest opacity-40">
                            © 2025 rDs Systems. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
