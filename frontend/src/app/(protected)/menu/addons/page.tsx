'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';
import { AddonGroupModal } from '@/components/admin/AddonGroupModal';

interface Option {
    id: number;
    nome: string;
    preco_adicional: string;
}

interface AddonGroup {
    id: number;
    nome: string;
    tipo: 'RADIO' | 'CHECKBOX';
    min_opcoes: number;
    max_opcoes: number;
    opcoes: Option[];
}

export default function AddonManagementPage() {
    const [addons, setAddons] = useState<AddonGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<AddonGroup | null>(null);

    const fetchAddons = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/atributos/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setAddons(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddons();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza? Isso removerá este grupo de todos os produtos.')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/atributos/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchAddons();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/menu" className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Adicionais e Opções</h1>
                            <p className="text-gray-500 text-sm">Gerencie os complementos do seu cardápio</p>
                        </div>
                    </div>

                    <button
                        onClick={() => { setSelectedGroup(null); setIsModalOpen(true); }}
                        className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2"
                    >
                        <Plus size={20} />
                        <span>Novo Grupo</span>
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-6 space-y-6">
                {loading ? (
                    <div className="text-center py-20 text-gray-400">Carregando grupos...</div>
                ) : addons.length === 0 ? (
                    <div className="text-center py-20 space-y-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-300">
                            <Tag size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Nenhum grupo cadastrado</h3>
                        <p className="text-gray-500 text-sm">Crie grupos como "Adicionais", "Molhos" ou "Tamanho" para personalizar seus produtos.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {addons.map(group => (
                            <div key={group.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all group relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{group.nome}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">
                                                {group.tipo}
                                            </span>
                                            <span className="text-[10px] font-bold bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full uppercase">
                                                Min: {group.min_opcoes} / Max: {group.max_opcoes}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setSelectedGroup(group); setIsModalOpen(true); }}
                                            className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(group.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t border-gray-50 pt-4">
                                    {group.opcoes && group.opcoes.length > 0 ? (
                                        group.opcoes.map(opt => (
                                            <div key={opt.id} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                                                <span className="text-gray-600 font-medium">{opt.nome}</span>
                                                <span className="text-gray-900 font-bold">
                                                    {parseFloat(opt.preco_adicional) > 0 ? `+ R$ ${opt.preco_adicional}` : 'Grátis'}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 text-xs italic">Nenhuma opção cadastrada.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <AddonGroupModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAddons}
                group={selectedGroup}
            />
        </div>
    );
}
