'use client';

import React, { useState, useEffect } from 'react';
import {
    ShoppingBag,
    RefreshCw,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    Info,
    ArrowRight,
    Save,
    ExternalLink,
    Download,
    Upload,
    Link2,
    Check
} from 'lucide-react';

export default function IFoodPage() {
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [importingMenu, setImportingMenu] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState({
        ifood_merchant_id: '',
        ifood_active: false
    });

    const fetchStore = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/lojas/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const storeData = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);

            if (storeData) {
                setStore(storeData);
                setFormData({
                    ifood_merchant_id: storeData.ifood_merchant_id || '',
                    ifood_active: storeData.ifood_active || false
                });
            }
        } catch (err) {
            console.error('Error fetching store data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStore();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/lojas/${store.slug}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Configurações do iFood salvas com sucesso!' });
                fetchStore();
            } else {
                setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro de conexão.' });
        } finally {
            setSaving(false);
        }
    };

    const handleVerifySync = async () => {
        setVerifying(true);
        setMessage(null);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/lojas/${store.slug}/ifood-verify/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setMessage({ type: 'success', text: data.message });
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro ao verificar conexão.' });
        } finally {
            setVerifying(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/lojas/${store.slug}/ifood-sync/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: data.message });
            } else {
                setMessage({ type: 'error', text: data.error || 'Erro na sincronização.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro de conexão ao sincronizar.' });
        } finally {
            setSyncing(false);
        }
    };

    const handleImportMenu = async () => {
        if (!confirm('Deseja importar o cardápio do iFood? Isso criará novas categorias e produtos no seu sistema local.')) return;

        setImportingMenu(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/lojas/${store.slug}/ifood-import-menu/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: data.message });
            } else {
                setMessage({ type: 'error', text: data.error || 'Erro na importação.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro de conexão ao importar.' });
        } finally {
            setImportingMenu(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 mt-4">

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                    <p className="font-bold italic text-sm">{message.text}</p>
                </div>
            )}

            <div className="space-y-8">
                {/* Main Config Card */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    <form onSubmit={handleSave} className="p-10 space-y-8">
                        <div className="flex items-center justify-between bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${formData.ifood_active ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status da Integração</p>
                                    <h2 className={`text-xl font-black italic uppercase tracking-tighter ${formData.ifood_active ? 'text-green-600' : 'text-gray-900'}`}>
                                        {formData.ifood_active ? 'Conectado e Ativo' : 'Desconectado'}
                                    </h2>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData.ifood_active}
                                    onChange={(e) => setFormData({ ...formData, ifood_active: e.target.checked })}
                                />
                                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Link2 size={12} /> Merchant ID (Código da Loja)
                                    </label>
                                    <a
                                        href="https://parceiro.ifood.com.br"
                                        target="_blank"
                                        className="text-[10px] font-black text-red-600 uppercase hover:underline flex items-center gap-1"
                                    >
                                        Onde encontro? <ExternalLink size={10} />
                                    </a>
                                </div>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={formData.ifood_merchant_id}
                                        onChange={(e) => setFormData({ ...formData, ifood_merchant_id: e.target.value })}
                                        placeholder="Digite o ID da sua loja no iFood"
                                        className="flex-1 px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-red-500 focus:bg-white rounded-2xl outline-none transition-all font-bold italic"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleVerifySync}
                                        disabled={verifying || !formData.ifood_merchant_id}
                                        className="px-6 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all disabled:opacity-30 flex items-center gap-2"
                                    >
                                        {verifying ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                                        Validar
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 italic font-medium ml-1">O Merchant ID é o identificador único da sua unidade no iFood.</p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-600/20 hover:shadow-red-600/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} />}
                            Salvar Alterações
                        </button>
                    </form>
                </div>

                {/* Operations Card */}
                {formData.ifood_active && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                        <div className="p-10 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-gray-900 text-white">
                                    <ShoppingBag size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Operações</p>
                                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">Sincronização de Dados</h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button
                                    onClick={handleSync}
                                    disabled={syncing}
                                    className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-transparent hover:border-red-500 hover:bg-white transition-all text-left group relative overflow-hidden shadow-sm hover:shadow-md"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        {syncing ? <RefreshCw className="animate-spin" size={24} /> : <RefreshCw size={24} />}
                                    </div>
                                    <p className="font-black italic uppercase tracking-tight text-gray-900 mb-1">Pedidos</p>
                                    <p className="text-xs text-gray-400 font-medium italic">Buscar novas vendas no iFood agora.</p>
                                </button>

                                <button
                                    onClick={handleImportMenu}
                                    disabled={importingMenu}
                                    className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-transparent hover:border-red-500 hover:bg-white transition-all text-left group relative overflow-hidden shadow-sm hover:shadow-md"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        {importingMenu ? <RefreshCw className="animate-spin" size={24} /> : <Download size={24} />}
                                    </div>
                                    <p className="font-black italic uppercase tracking-tight text-gray-900 mb-1">Catálogo</p>
                                    <p className="text-xs text-gray-400 font-medium italic">Importar itens do menu iFood para o app.</p>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-center gap-8 py-4 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                    <div className="flex items-center gap-2 font-black italic uppercase tracking-widest text-[10px] text-gray-400">
                        <ShieldCheck size={14} /> Integração Oficial
                    </div>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    <div className="flex items-center gap-2 font-black italic uppercase tracking-widest text-[10px] text-gray-400">
                        <Check size={14} /> Canal Prioritário
                    </div>
                </div>
            </div>
        </div>
    );
}
