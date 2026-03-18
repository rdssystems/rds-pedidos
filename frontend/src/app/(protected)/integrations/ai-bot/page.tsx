'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Save, ShieldAlert, Sparkles, MessageCircle, AlertTriangle } from 'lucide-react';

export default function AIBotSettingsPage() {
    const router = useRouter();
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        bot_ativo_whatsapp: false,
        bot_personalidade: '',
        bot_conhecimento: '',
        bot_alerta_transbordo: ''
    });

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/lojas/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                const currentStore = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);

                if (currentStore) {
                    setStore(currentStore);
                    setFormData({
                        bot_ativo_whatsapp: currentStore.bot_ativo_whatsapp || false,
                        bot_personalidade: currentStore.bot_personalidade || '',
                        bot_conhecimento: currentStore.bot_conhecimento || '',
                        bot_alerta_transbordo: currentStore.bot_alerta_transbordo || ''
                    });
                }
            } catch (error) {
                console.error("Erro ao buscar loja", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData(prev => ({ ...prev, [e.target.name]: value }));
    };

    const handleSave = async () => {
        if (!store?.slug) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/lojas/${store.slug}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('Configurações do Atendente salvas com sucesso!');
            } else {
                alert('Erro ao salvar as configurações.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar as configurações.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (store?.plano_tipo !== 'ELITE') {
        return (
            <div className="p-8 max-w-4xl mx-auto space-y-8">
                <div className="bg-gradient-to-br from-gray-900 to-primary/80 rounded-[2.5rem] p-12 text-white text-center shadow-xl shadow-primary/20">
                    <Sparkles size={48} className="mx-auto text-yellow-400 mb-6" />
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Funcionalidade Elite</h2>
                    <p className="text-lg text-white/80 font-medium mb-8">
                        O Atendente de I.A no WhatsApp é uma ferramenta avançada exclusiva para clientes do plano Elite. Faça o upgrade para automatizar seu atendimento e dobrar suas vendas.
                    </p>
                    <button
                        onClick={() => router.push('/settings/billing')}
                        className="px-8 py-4 bg-white text-gray-900 rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg"
                    >
                        Ver Planos
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-10">
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                    <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="space-y-8 mt-4">
                {/* Ativação */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 italic">Ligar Atendente Inteligente</h3>
                        <p className="text-sm text-gray-500 mt-1 font-medium">O robô irá responder os clientes automaticamente no WhatsApp.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            name="bot_ativo_whatsapp"
                            checked={formData.bot_ativo_whatsapp}
                            onChange={handleChange}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>

                {/* Personalidade */}
                <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 italic flex items-center gap-2">
                            <MessageCircle className="text-primary" size={24} /> Como o robô deve falar?
                        </h3>
                        <p className="text-sm text-gray-500 mt-2 font-medium">Defina a personalidade da sua inteligência artificial. Como ele deve agir e qual o tom de voz.</p>
                    </div>
                    <div className="p-8">
                        <label className="block text-sm font-bold uppercase tracking-widest text-gray-700 mb-3 ml-2">Personalidade / Prompt</label>
                        <input
                            type="text"
                            name="bot_personalidade"
                            value={formData.bot_personalidade}
                            onChange={handleChange}
                            placeholder="Ex: Seja bem humorado, use emojis e trate todo mundo como 'chefe'."
                            className="w-full bg-gray-50 border-0 text-gray-900 text-sm font-medium rounded-2xl block p-5 focus:ring-2 focus:ring-primary focus:bg-white transition-all shadow-inner"
                        />
                        <p className="mt-3 ml-2 text-xs text-gray-400 italic">O bot já sabe que é um atendente da sua loja e conhece seu cardápio, preencha apenas características.</p>
                    </div>
                </div>

                {/* Conhecimento Extra */}
                <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 italic flex items-center gap-2">
                            <Sparkles className="text-primary" size={24} /> O que mais a IA precisa saber?
                        </h3>
                        <p className="text-sm text-gray-500 mt-2 font-medium">Adicione regras da casa, links de instagram, detalhes sobre formas de pagamento e informações importantes que não estão no cardápio.</p>
                    </div>
                    <div className="p-8">
                        <label className="block text-sm font-bold uppercase tracking-widest text-gray-700 mb-3 ml-2">Base de Conhecimento</label>
                        <textarea
                            name="bot_conhecimento"
                            value={formData.bot_conhecimento}
                            onChange={handleChange}
                            rows={5}
                            placeholder="Ex: Não aceitamos cheque. Temos estacionamento grátis na frente. Siga a gente em @minhaloja."
                            className="w-full bg-gray-50 border-0 text-gray-900 text-sm font-medium rounded-2xl block p-5 focus:ring-2 focus:ring-primary focus:bg-white transition-all shadow-inner resize-none"
                        ></textarea>
                    </div>
                </div>

                {/* Gatilho de Alerta / Transbordo */}
                <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm ring-1 ring-red-100">
                    <div className="p-8 border-b border-red-50 bg-red-50/30">
                        <h3 className="text-xl font-black uppercase tracking-tight text-red-600 italic flex items-center gap-2">
                            <ShieldAlert size={24} /> Aviso de Transferência
                        </h3>
                        <p className="text-sm text-gray-500 mt-2 font-medium">Em quais situações o bot deve parar de responder e chamar um humano para assumir?</p>
                    </div>
                    <div className="p-8">
                        <label className="block text-sm font-bold uppercase tracking-widest text-gray-700 mb-3 ml-2">Gatilhos de Alerta</label>
                        <input
                            type="text"
                            name="bot_alerta_transbordo"
                            value={formData.bot_alerta_transbordo}
                            onChange={handleChange}
                            placeholder="Ex: Se o cliente falar a palavra 'gerente', reclamar de atraso ou dizer que o pedido veio errado."
                            className="w-full bg-white border-2 border-red-100 text-gray-900 text-sm font-medium rounded-2xl block p-5 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        />
                        <div className="mt-4 flex items-start gap-3 bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={16} />
                            <p className="text-xs text-orange-700 font-medium">
                                Quando a IA identificar este gatilho no assunto, ela será pausada para este cliente (transbordo humano). Você precisará assumir a conversa no WhatsApp manualmente.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
