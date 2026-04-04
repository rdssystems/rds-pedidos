import React, { useState, useRef, useEffect } from 'react';
import { useBilling } from '@/context/BillingContext';
import { useAuth } from '@/context/AuthContext';
import { Send, X, Minimize2, Maximize2, Sparkles, Bot as BotIcon } from 'lucide-react';

interface Message {
    role: 'user' | 'ai';
    content: string;
}

export default function AIFinanceChat() {
    const { store } = useBilling();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [query, setQuery] = useState('');

    const initialGreeting = `Olá${user?.first_name ? ' ' + user.first_name : ''}! Sou seu Especialista em Finanças. Como posso ajudar na gestão do seu negócio hoje?`;

    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: initialGreeting }
    ]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isEligible = store?.plano_tipo === 'PRO' || store?.plano_tipo === 'ELITE';
    const isOwner = user?.roles?.some(r => r.role === 'owner');

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (!isOwner) return null;


    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim() || loading || !isEligible) return;

        const userMsg = query.trim();
        setQuery('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/lojas/${store?.slug}/especialista-financeiro/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query: userMsg })
            });

            const data = await response.json();
            if (data.response) {
                setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', content: 'Desculpe, tive um problema ao processar sua solicitação.' }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', content: 'Erro de conexão com o servidor.' }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isEligible) {
        return (
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-4 bg-gray-400 text-white rounded-full shadow-2xl hover:scale-105 transition-all group relative"
                >
                    <BotIcon size={28} />
                    <div className="absolute bottom-full right-0 mb-4 w-48 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <p className="text-[10px] font-black uppercase text-gray-500 italic tracking-tighter">Especialista em Finanças</p>
                        <p className="text-[9px] font-bold text-primary mt-1">Disponível nos planos PRO e ELITE</p>
                    </div>
                </button>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-4 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 hover:scale-110 transition-all flex items-center justify-center relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <BotIcon size={28} className="relative z-10" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                </button>
            </div>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 z-50 w-[350px] bg-white rounded-[2rem] shadow-2xl shadow-gray-200 border border-gray-100 flex flex-col transition-all duration-300 overflow-hidden ${isMinimized ? 'h-[70px]' : 'h-[500px]'}`}>
            <div className="p-5 bg-gray-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary rounded-xl">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black italic uppercase tracking-tight">Especialista <span className="text-primary italic">Finanças</span></h4>
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Online via Gemini AI</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="text-gray-400 hover:text-white transition-colors">
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed ${msg.role === 'user'
                                    ? 'bg-primary text-white rounded-tr-none shadow-md'
                                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm italic text-[10px] text-gray-400 flex items-center gap-2">
                                    <span className="animate-bounce">●</span>
                                    <span className="animate-bounce delay-75">●</span>
                                    <span className="animate-bounce delay-150">●</span>
                                    Analisando dados financeiros...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-2 flex flex-wrap gap-2 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-hide">
                        {['Qual faturamento hoje?', 'Melhor produto?', 'Insights da semana'].map(s => (
                            <button
                                key={s}
                                onClick={() => { setQuery(s); }}
                                className="px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-black uppercase text-gray-500 hover:border-primary hover:text-primary transition-all shadow-sm"
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-50 flex gap-2 shrink-0">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Pergunte sobre faturamento, produtos..."
                            className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="p-3 bg-gray-900 text-white rounded-xl hover:bg-primary transition-all disabled:opacity-50 active:scale-95"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}

AIFinanceChat.displayName = 'AIFinanceChat';
