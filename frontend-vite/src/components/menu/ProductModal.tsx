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
    const [selections, setSelections] = useState<Record<number, number[]>>({});
    const [totalPrice, setTotalPrice] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setSelections({});
            setIsAnimating(true);
        }
    }, [isOpen, product]);

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
                return { ...prev, [grupoId]: [opcaoId] };
            } else {
                if (current.includes(opcaoId)) {
                    return { ...prev, [grupoId]: current.filter(id => id !== opcaoId) };
                } else {
                    if (current.length < max) {
                        return { ...prev, [grupoId]: [...current, opcaoId] };
                    }
                    return prev;
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
            id: `${product.id}-${Date.now()}`,
            productId: product.id,
            nome: product.nome,
            precoBase: parseFloat(product.preco),
            quantidade: quantity,
            atributos: atributosDetalhados,
            imagem: product.imagem
        });
        onClose();
    };

    const getImageUrl = (url: string | null) => {
        if (!url) return '';
        if (url.includes('backend:8000')) {
            return url.split('backend:8000')[1];
        }
        return url;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity duration-300" onClick={onClose} />
            <div className={`pointer-events-auto bg-white w-full md:max-w-lg md:rounded-xl rounded-t-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-transform duration-300 ${isAnimating ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="relative h-72 shrink-0">
                    {product.imagem ? (
                        <img src={getImageUrl(product.imagem)} className="w-full h-full object-cover" alt={product.nome} />
                    ) : (
                        <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-200">
                            <ShoppingBag size={64} />
                        </div>
                    )}
                    <button onClick={onClose} className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg text-gray-900 hover:scale-105 transition-transform z-20">
                        <X size={20} />
                    </button>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8 pointer-events-none">
                        <div className="text-white space-y-1.5">
                            <h2 className="text-2xl font-bold tracking-tight leading-tight">{product.nome}</h2>
                            <p className="text-white/80 text-sm line-clamp-2 font-medium">{product.descricao}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#F8F9FA] custom-scrollbar">
                    {product.grupos_atributos?.map(grupo => {
                        const currentSelected = selections[grupo.id] || [];
                        const isMinMet = currentSelected.length >= grupo.min_opcoes;
                        return (
                            <div key={grupo.id} className="space-y-4">
                                <div className="flex justify-between items-end border-l-2 pl-4" style={{ borderColor: isMinMet ? '#10B981' : storeColor }}>
                                    <div>
                                        <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs">{grupo.nome}</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                            {grupo.tipo === 'RADIO' ? 'Escolha 1' : `Mín: ${grupo.min_opcoes} / Máx: ${grupo.max_opcoes}`}
                                        </p>
                                    </div>
                                    {isMinMet ? (
                                        <div className="text-green-600 text-[10px] font-bold uppercase flex items-center gap-1.5 opacity-80">
                                            <Check size={12} strokeWidth={3} /> Concluído
                                        </div>
                                    ) : (
                                        <div className="text-amber-600 text-[10px] font-bold uppercase opacity-80">Obrigatório</div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {grupo.opcoes.map(opcao => {
                                        const isSelected = currentSelected.includes(opcao.id);
                                        return (
                                            <label
                                                key={opcao.id}
                                                className={`flex items-center justify-between p-4 rounded-lg cursor-pointer border transition-all ${isSelected ? 'border-gray-900 bg-white shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                                onClick={() => handleOptionToggle(grupo.id, opcao.id, grupo.tipo, grupo.max_opcoes)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-gray-900 bg-gray-900 scale-110' : 'border-gray-200 bg-white'}`}>
                                                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                    </div>
                                                    <span className={`font-bold text-sm ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{opcao.nome}</span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-900">
                                                    {parseFloat(opcao.preco_adicional) > 0 ? `+ R$ ${opcao.preco_adicional}` : 'Grátis'}
                                                </span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="p-8 bg-white border-t border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        {!modoCatalogo && (
                            <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-lg p-1">
                                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"><Minus size={14} /></button>
                                <span className="font-bold text-lg w-8 text-center text-gray-900">{quantity}</span>
                                <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"><Plus size={14} /></button>
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Subtotal do Item</p>
                            <p className="text-2xl font-bold tracking-tight text-gray-900">R$ {totalPrice.toFixed(2)}</p>
                        </div>
                    </div>
                    {!modoCatalogo ? (
                        <button onClick={handleConfirm} className="w-full py-5 bg-gray-900 text-white rounded-lg font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                            ADICIONAR À SACOLA 
                            <ShoppingBag size={18} />
                        </button>
                    ) : (
                        <button onClick={onClose} className="w-full py-5 bg-gray-900 text-white rounded-lg font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-black active:scale-[0.98] transition-all">FECHAR DETALHES</button>
                    )}
                </div>
            </div>
        </div>
    );
};
