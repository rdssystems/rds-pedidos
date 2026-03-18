'use client';

import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, ShoppingBag, Check } from 'lucide-react';

interface Opcao {
    id: number;
    nome: string;
    preco_adicional: string;
}

interface GrupoAtributos {
    id: number;
    nome: string;
    tipo: 'RADIO' | 'CHECKBOX';
    min_opcoes: number;
    max_opcoes: number;
    opcoes: Opcao[];
}

interface Produto {
    id: number;
    nome: string;
    descricao: string;
    preco: string;
    imagem: string;
    grupos_atributos: GrupoAtributos[];
}

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Produto;
    onAddToCart: (item: any) => void;
    storeColor?: string;
    modoCatalogo?: boolean;
}

export const ProductModal = ({ isOpen, onClose, product, onAddToCart, storeColor = '#000', modoCatalogo = false }: ProductModalProps) => {
    const [quantity, setQuantity] = useState(1);
    const [selections, setSelections] = useState<Record<number, number[]>>({}); // grupoId -> [opcaoId, opcaoId]
    const [totalPrice, setTotalPrice] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setSelections({});
            setIsAnimating(true);
        }
    }, [isOpen, product]);

    // Calculate total price effect
    useEffect(() => {
        if (!product) return;
        let base = parseFloat(product.preco);

        Object.entries(selections).forEach(([grupoId, opcaoIds]) => {
            const grupo = product.grupos_atributos.find(g => g.id === Number(grupoId));
            if (grupo) {
                opcaoIds.forEach(optId => {
                    const opt = grupo.opcoes.find(o => o.id === optId);
                    if (opt) base += parseFloat(opt.preco_adicional);
                });
            }
        });

        setTotalPrice(base * quantity);
    }, [selections, quantity, product]);

    if (!isOpen || !product) return null;

    const handleOptionToggle = (grupoId: number, opcaoId: number, tipo: 'RADIO' | 'CHECKBOX', max: number) => {
        setSelections(prev => {
            const current = prev[grupoId] || [];

            if (tipo === 'RADIO') {
                // Se já estiver selecionado, não faz nada (rádio obrigatório geralmente)
                // Ou permite desmarcar se min=0? Assumindo comportamento padrão de rádio: troca.
                return { ...prev, [grupoId]: [opcaoId] };
            } else {
                // Checkbox
                if (current.includes(opcaoId)) {
                    return { ...prev, [grupoId]: current.filter(id => id !== opcaoId) };
                } else {
                    if (current.length < max) {
                        return { ...prev, [grupoId]: [...current, opcaoId] };
                    }
                    return prev; // Max atingido
                }
            }
        });
    };

    const validateSelections = () => {
        for (const grupo of product.grupos_atributos || []) {
            const selectedCount = (selections[grupo.id] || []).length;
            if (selectedCount < grupo.min_opcoes) {
                alert(`Por favor, selecione pelo menos ${grupo.min_opcoes} opção(ões) em "${grupo.nome}".`);
                return false;
            }
        }
        return true;
    };

    const handleConfirm = () => {
        if (!validateSelections()) return;

        // Construct cart item with details
        const atributosDetalhados: any[] = [];
        Object.entries(selections).forEach(([grupoId, opcaoIds]) => {
            const grupo = product.grupos_atributos.find(g => g.id === Number(grupoId));
            if (grupo) {
                opcaoIds.forEach(optId => {
                    const opt = grupo.opcoes.find(o => o.id === optId);
                    if (opt) {
                        atributosDetalhados.push({
                            grupoId: grupo.id,
                            grupoNome: grupo.nome,
                            opcaoId: opt.id,
                            nome: opt.nome,
                            preco: parseFloat(opt.preco_adicional)
                        });
                    }
                });
            }
        });

        onAddToCart({
            id: `${product.id}-${Date.now()}`, // Unique ID for cart item variant
            productId: product.id,
            nome: product.nome,
            precoBase: parseFloat(product.preco),
            quantidade: quantity,
            atributos: atributosDetalhados,
            imagem: product.imagem
        });
        onClose();
    };

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (typeof url !== 'string') return url;
        if (url.includes('backend:8000')) {
            return url.split('backend:8000')[1];
        }
        return url;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className={`pointer-events-auto bg-white w-full md:max-w-lg md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] md:max-h-[85vh] transition-transform duration-300 ${isAnimating ? 'translate-y-0' : 'translate-y-full'}`}>

                {/* Header Image */}
                <div className="relative h-64 shrink-0">
                    {product.imagem ? (
                        <img src={getImageUrl(product.imagem)} className="w-full h-full object-cover" alt={product.nome} />
                    ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                            <ShoppingBag size={64} />
                        </div>
                    )}

                    {/* Close Button - Garantir z-index maior que o gradiente */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg text-gray-800 hover:scale-110 transition-transform z-20"
                    >
                        <X size={24} />
                    </button>

                    {/* Gradient Overlay - Adicionado pointer-events-none para não bloquear cliques */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8 pointer-events-none">
                        <div className="text-white space-y-1">
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none shadow-black/50 drop-shadow-md">{product.nome}</h2>
                            <p className="text-white/90 font-medium text-sm line-clamp-2">{product.descricao}</p>
                        </div>
                    </div>
                </div>

                {/* Content - Addons */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50 custom-scrollbar">
                    {product.grupos_atributos && product.grupos_atributos.length > 0 ? (
                        product.grupos_atributos.map(grupo => {
                            const currentSelected = selections[grupo.id] || [];
                            const isMinMet = currentSelected.length >= grupo.min_opcoes;
                            const isMaxMet = currentSelected.length >= grupo.max_opcoes;

                            return (
                                <div key={grupo.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 animate-slide-up">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-gray-900 uppercase tracking-tight text-lg">{grupo.nome}</h3>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                                {grupo.tipo === 'RADIO' ? 'Escolha 1' : `Mín: ${grupo.min_opcoes} / Máx: ${grupo.max_opcoes}`}
                                            </p>
                                        </div>
                                        {isMinMet ? (
                                            <div className="bg-green-100 text-green-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                <Check size={10} /> OK
                                            </div>
                                        ) : (
                                            <div className="bg-amber-100 text-amber-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                Obrigatório
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {grupo.opcoes.map(opcao => {
                                            const isSelected = currentSelected.includes(opcao.id);
                                            return (
                                                <label
                                                    key={opcao.id}
                                                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer border-2 transition-all ${isSelected
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-gray-50 hover:border-gray-100 bg-gray-50/50'}`}
                                                    onClick={() => handleOptionToggle(grupo.id, opcao.id, grupo.tipo, grupo.max_opcoes)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`}>
                                                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                        </div>
                                                        <span className={`font-bold text-sm ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{opcao.nome}</span>
                                                    </div>
                                                    <span className="text-sm font-black text-gray-900">
                                                        {parseFloat(opcao.preco_adicional) > 0 ? `+ R$ ${opcao.preco_adicional}` : 'Grátis'}
                                                    </span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm italic">
                            Este produto não possui adicionais disponíveis.
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-6 bg-white border-t border-gray-100 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        {!modoCatalogo ? (
                            <div className="flex items-center gap-4 bg-gray-100 rounded-2xl p-1">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-900 hover:text-primary transition-colors active:scale-95"
                                >
                                    <Minus size={18} />
                                </button>
                                <span className="font-black text-xl w-6 text-center">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(q => q + 1)}
                                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-900 hover:text-primary transition-colors active:scale-95"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest bg-gray-50 px-4 py-2 rounded-xl border border-dashed border-gray-200">
                                Visualização apenas
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total do Item</p>
                            <p className="text-2xl font-black italic tracking-tighter" style={{ color: storeColor }}>
                                R$ {totalPrice.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {!modoCatalogo ? (
                        <button
                            onClick={handleConfirm}
                            className="w-full py-5 text-white rounded-[2rem] font-black text-xl uppercase italic tracking-tighter shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                            style={{ backgroundColor: storeColor }}
                        >
                            <span>Adicionar à Sacola</span>
                            <div className="bg-white/20 p-1.5 rounded-full">
                                <Plus size={16} />
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-xl uppercase italic tracking-tighter shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <span>Fechar Detalhes</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
