import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PosProvider, usePos } from '../../context/PosContext';
import { useBilling } from '../../context/BillingContext';
import { ShiftManager } from '../../components/pos/ShiftManager';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, Users, Loader2, ChefHat, UserPlus, X, AlertCircle, Image as ImageIcon } from 'lucide-react';

const ProductAttributesModal = ({ product, onClose, onAdd }: { product: any, onClose: () => void, onAdd: (selections: any[], obs: string) => void }) => {
    const [selections, setSelections] = useState<any[]>([]);
    const [itemObs, setItemObs] = useState('');

    const toggleOption = (grupo: any, opcao: any) => {
        const isSelected = selections.some(s => s.opcao_id === opcao.id);

        if (isSelected) {
            setSelections(prev => prev.filter(s => s.opcao_id !== opcao.id));
        } else {
            const currentInGroup = selections.filter(s => s.grupo_id === grupo.id);
            if (grupo.tipo === 'SINGLE') {
                setSelections(prev => [...prev.filter(s => s.grupo_id !== grupo.id), {
                    grupo_id: grupo.id,
                    grupo_nome: grupo.nome,
                    opcao_id: opcao.id,
                    opcao: opcao.nome,
                    preco: opcao.preco_adicional
                }]);
            } else if (!grupo.max_opcoes || currentInGroup.length < grupo.max_opcoes) {
                setSelections(prev => [...prev, {
                    grupo_id: grupo.id,
                    grupo_nome: grupo.nome,
                    opcao_id: opcao.id,
                    opcao: opcao.nome,
                    preco: opcao.preco_adicional
                }]);
            }
        }
    };

    const isOptionSelected = (opcaoId: number) => selections.some(s => s.opcao_id === opcaoId);

    const handleConfirm = () => {
        for (const grupo of (product.grupos_atributos || [])) {
            const currentInGroup = selections.filter(s => s.grupo_id === grupo.id);
            if (grupo.min_opcoes > 0 && currentInGroup.length < grupo.min_opcoes) {
                alert(`Por favor, selecione pelo menos ${grupo.min_opcoes} opção(ões) em "${grupo.nome}"`);
                return;
            }
        }
        onAdd(selections, itemObs);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">{product.nome}</h2>
                        <p className="text-xs font-bold text-gray-400">Personalize seu pedido</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {(product.grupos_atributos || []).map((grupo: any) => (
                        <div key={grupo.id} className="space-y-4">
                            <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                <h3 className="font-black text-gray-800 uppercase text-sm tracking-wide">{grupo.nome}</h3>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                    {grupo.tipo === 'SINGLE' ? 'Selecione 1' : `Mín ${grupo.min_opcoes || 0} / Máx ${grupo.max_opcoes || '∞'}`}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {grupo.opcoes.map((opcao: any) => (
                                    <button
                                        key={opcao.id}
                                        onClick={() => toggleOption(grupo, opcao)}
                                        className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all ${isOptionSelected(opcao.id)
                                                ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                                                : 'border-gray-50 hover:border-gray-100 bg-gray-50/50'
                                            }`}
                                    >
                                        <span className={`font-bold ${isOptionSelected(opcao.id) ? 'text-primary' : 'text-gray-600'}`}>{opcao.nome}</span>
                                        {parseFloat(opcao.preco_adicional) > 0 && (
                                            <span className="text-xs font-black text-gray-400">+ R$ {parseFloat(opcao.preco_adicional).toFixed(2)}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="space-y-3">
                        <h3 className="font-black text-gray-800 uppercase text-sm tracking-wide">Observações do Item</h3>
                        <textarea
                            value={itemObs}
                            onChange={e => setItemObs(e.target.value)}
                            placeholder="Alguma recomendação?"
                            className="w-full p-4 rounded-xl border border-gray-100 focus:outline-none focus:border-primary bg-gray-50/50 text-sm font-medium resize-none h-24"
                        />
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t">
                    <button
                        onClick={handleConfirm}
                        className="w-full py-5 bg-primary text-white font-black text-lg uppercase tracking-widest rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        CONFIRMAR E ADICIONAR
                    </button>
                </div>
            </div>
        </div>
    );
};

const PosContent = () => {
    const { caixa, cart, addToCart, removeFromCart, clearCart, total, checkout, products, loadTableOrders, sendToKitchen } = usePos();
    const { store } = useBilling();
    const [searchTerm, setSearchTerm] = useState('');
    const [clienteNome, setClienteNome] = useState('');
    const [clienteWhatsapp, setClienteWhatsapp] = useState('');
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('DINHEIRO');
    const [amountPaid, setAmountPaid] = useState('');
    const [change, setChange] = useState(0);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [orderObservation, setOrderObservation] = useState('');
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [mesas, setMesas] = useState<any[]>([]);
    const [loadingMesas, setLoadingMesas] = useState(false);
    const [isCartMobileOpen, setIsCartMobileOpen] = useState(false);
    
    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('backend:8000')) {
            return url.split('backend:8000')[1];
        }
        return url;
    };

    const fetchMesas = async () => {
        setLoadingMesas(true);
        try {
            const token = localStorage.getItem('token');
            const storeId = localStorage.getItem('activeStoreId');
            const res = await fetch(`/api/pedidos/mesas/?loja_id=${storeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setMesas(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMesas(false);
        }
    };

    const handleImportTable = async (num: number) => {
        await loadTableOrders(num);
        setIsTableModalOpen(false);
    };

    const filteredProducts = products.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCheckout = async () => {
        try {
            await checkout(paymentMethod, parseFloat(amountPaid) || total, { nome: clienteNome, whatsapp: clienteWhatsapp }, orderObservation);
            setIsCheckoutModalOpen(false);
            clearCart();
            setClienteNome('');
            setClienteWhatsapp('');
            setOrderObservation('');
            alert('Venda realizada com sucesso!');
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleSendToKitchen = async () => {
        try {
            await sendToKitchen({ nome: clienteNome, whatsapp: clienteWhatsapp }, orderObservation);
            setClienteNome('');
            setClienteWhatsapp('');
            setOrderObservation('');
            alert('Pedido realizado com sucesso!');
        } catch (err: any) {
            alert(err.message);
        }
    };

    useEffect(() => {
        const paid = parseFloat(amountPaid);
        if (!isNaN(paid) && paid >= total) {
            setChange(paid - total);
        } else {
            setChange(0);
        }
    }, [amountPaid, total]);

    const groupedProducts = filteredProducts.reduce((acc: any, product: any) => {
        const category = product.categoria_nome || 'Sem Categoria';
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
    }, {});

    // Map each category to its order (from the products data)
    const categoryOrders = filteredProducts.reduce((acc: any, p: any) => {
        const name = p.categoria_nome || 'Sem Categoria';
        // We take the minimum order/id seen for this category name
        if (!(name in acc) || (p.categoria_ordem < acc[name].order)) {
            acc[name] = { order: p.categoria_ordem ?? 999, id: p.categoria_id ?? 999 };
        }
        return acc;
    }, {});

    const sortedCategories = Object.keys(groupedProducts).sort((a, b) => {
        const orderA = categoryOrders[a]?.order ?? 999;
        const orderB = categoryOrders[b]?.order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        
        // Fallback to ID (Creation Order)
        const idA = categoryOrders[a]?.id ?? 999;
        const idB = categoryOrders[b]?.id ?? 999;
        return idA - idB;
    });

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-gray-100 overflow-hidden relative">
            <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 overflow-hidden">
                <header className="bg-white border-b flex flex-col shrink-0 px-4 py-2 lg:py-0 lg:h-16 lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-4 overflow-hidden">
                    <div className="flex items-center justify-between w-full lg:w-auto gap-2 lg:gap-4 shrink-0">
                        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                            <h1 className="font-black text-xl text-gray-900 xl:block uppercase tracking-tighter italic shrink-0">Caixa</h1>
                            <button
                                onClick={() => { setIsTableModalOpen(true); fetchMesas(); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl font-bold text-xs lg:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20 shrink-0"
                            >
                                <Users size={16} />
                                <span className="hidden sm:inline">MESAS</span>
                            </button>
                        </div>
                        <div className="flex-1 lg:flex-none flex justify-end">
                            <ShiftManager />
                        </div>
                    </div>
                    <div className="relative w-full lg:max-w-[240px] xl:max-w-xs shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar produtos..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-gray-100 pl-8 pr-3 py-2 lg:py-2 text-xs lg:text-sm rounded-xl border border-transparent focus:bg-white focus:border-primary w-full font-medium transition-all outline-none"
                        />
                    </div>
                </header>

                <main className="flex-1 p-3 lg:p-6 pb-28 lg:pb-6 overflow-y-auto bg-gray-50/50 space-y-6">
                    {sortedCategories.length === 0 ? (
                        <div className="text-center py-10 lg:py-20 text-gray-400 italic text-sm">Nenhum produto encontrado.</div>
                    ) : (
                        sortedCategories.map(category => (
                            <div key={category} className="space-y-3 lg:space-y-4">
                                <h3 className="text-base lg:text-lg font-bold text-gray-700 flex items-center gap-2 pb-1 lg:pb-2 border-b border-gray-200">
                                    <span className="w-1.5 h-4 lg:w-2 lg:h-6 bg-primary rounded-full"></span>
                                    {category}
                                </h3>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4">
                                    {groupedProducts[category].map((product: any) => (
                                        <button
                                            key={product.id}
                                            onClick={() => {
                                                if (product.grupos_atributos?.length > 0) {
                                                    setSelectedProduct(product);
                                                } else {
                                                    addToCart(product);
                                                }
                                            }}
                                            disabled={!product.disponivel || !caixa || caixa.status === 'FECHADO'}
                                            className="bg-white p-2 lg:p-3 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-1.5 lg:gap-2.5 border border-transparent hover:border-primary/20 active:scale-95 disabled:opacity-50 disabled:grayscale group relative overflow-hidden h-full"
                                        >
                                            {/* Miniatura da Imagem */}
                                            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 group-hover:border-primary/20 transition-all">
                                                {product.imagem ? (
                                                    <img 
                                                        src={getImageUrl(product.imagem)} 
                                                        alt={product.nome} 
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                                    />
                                                ) : (
                                                    <ImageIcon className="text-gray-200 group-hover:text-primary/20 transition-colors" size={20} strokeWidth={1.5} />
                                                )}
                                            </div>

                                            <div className="flex flex-col items-center gap-0.5 lg:gap-1 px-1">
                                                <span className="font-bold text-[9px] lg:text-[11px] text-gray-700 line-clamp-2 leading-tight uppercase tracking-tight">
                                                    {product.nome}
                                                </span>
                                                <span className="font-black text-[10px] lg:text-sm text-primary leading-none italic">
                                                    R$ {parseFloat(product.preco).toFixed(2)}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </main>
            </div>

            {/* Mobile Cart Floating Bar */}
            {!isCartMobileOpen && (
                <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-white border border-gray-100 rounded-xl p-4 z-30 flex justify-between items-center shadow-2xl">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Total</span>
                        <span className="text-xl font-black text-primaryleading-none">R$ {total.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setIsCartMobileOpen(true)} className="bg-primary text-white flex items-center gap-2 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/30 transition-transform active:scale-95">
                        <ShoppingCart size={18} />
                        CARRINHO ({cart.reduce((acc, item) => acc + item.quantidade, 0)})
                    </button>
                </div>
            )}

            {isCartMobileOpen && (
                <div className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setIsCartMobileOpen(false)} />
            )}

            <div className={`
                fixed inset-x-0 bottom-0 z-50 bg-white flex flex-col shadow-2xl rounded-t-xl transition-transform duration-300
                fixed inset-x-0 bottom-0 z-50 bg-white flex flex-col shadow-2xl rounded-t-lg transition-transform duration-300
                lg:static lg:w-96 lg:h-auto lg:rounded-none lg:shadow-xl lg:z-20 lg:translate-y-0 lg:border-l lg:border-gray-200 shrink-0
                ${isCartMobileOpen ? 'translate-y-0 h-[90vh]' : 'translate-y-full lg:translate-y-0 h-[90vh] lg:h-auto'}
            `}>
                <div className="h-16 border-b flex items-center justify-between px-6 bg-gray-50 shrink-0 rounded-t-lg lg:rounded-none">
                    <div onClick={() => setIsClientModalOpen(true)} className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 -ml-2 rounded-lg transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-gray-800">{clienteNome || 'Identificar Cliente'}</p>
                            <p className="text-xs text-gray-400">{clienteWhatsapp || 'Nenhum'}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsCartMobileOpen(false)} className="lg:hidden p-2 text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                    {cart.map(item => (
                        <div key={item.uuid} className="flex justify-between items-start border-b border-gray-50 pb-3">
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-gray-800">{item.nome}</h4>
                                <div className="text-xs font-bold text-gray-500">
                                    {item.quantidade}x R$ {item.precoUnitario.toFixed(2)}
                                </div>
                                <span className="font-black text-sm text-primary">R$ {item.total.toFixed(2)}</span>
                            </div>
                            <button onClick={() => removeFromCart(item.uuid)} className="p-2 text-gray-300 hover:text-red-500">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="bg-gray-50 border-t p-6 pb-8 lg:pb-6 space-y-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <span className="text-gray-500 font-medium">Subtotal</span>
                        <span className="text-2xl font-black text-gray-800 leading-none">R$ {total.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleSendToKitchen} disabled={cart.length === 0} className="py-3 bg-blue-500 text-white font-bold text-sm uppercase rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50">
                            <ChefHat size={18} /> Cozinha
                        </button>
                        <button onClick={() => setIsCheckoutModalOpen(true)} disabled={cart.length === 0} className="py-3 bg-green-500 text-white font-black text-sm uppercase rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-green-500/20 active:scale-95 disabled:opacity-50">
                            <ShoppingCart size={18} /> Finalizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Modais de Checkout e Mesa seriam migrados aqui... (simplificado para MVP de visualização) */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden p-8 space-y-6">
                        <h2 className="text-xl font-black text-gray-800 uppercase text-center border-b pb-4">Pagamento</h2>
                        <div className="text-center bg-gray-50 py-6 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total a Pagar</span>
                            <p className="text-4xl font-black text-gray-900 mt-1">R$ {total.toFixed(2)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {['DINHEIRO', 'DEBITO', 'CREDITO', 'PIX'].map(method => (
                                <button key={method} onClick={() => setPaymentMethod(method)} className={`p-4 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${paymentMethod === method ? 'border-primary bg-primary/5 text-primary ring-4 ring-primary/10' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>{method}</button>
                            ))}
                        </div>
                        <div className="pt-4 space-y-3">
                            <button onClick={handleCheckout} className="w-full py-5 bg-green-500 text-white font-black text-lg uppercase tracking-widest rounded-xl shadow-xl hover:bg-green-600 active:scale-95 transition-all">FINALIZAR VENDA</button>
                            <button onClick={() => setIsCheckoutModalOpen(false)} className="w-full py-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-600 transition-colors">CANCELAR</button>
                        </div>
                    </div>
                </div>
            )}

            {isTableModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-black text-gray-800 uppercase italic tracking-tight">Vincular/Importar Mesa</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selecione uma mesa ocupada para importar ou livre para vincular</p>
                            </div>
                            <button onClick={() => setIsTableModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {loadingMesas ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="animate-spin text-primary" size={48} />
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Carregando Mesas...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                                    {Array.from({ length: store?.quantidade_mesas || 0 }, (_, i) => i + 1).map(num => {
                                        const status = mesas.find(m => String(m.mesa) === String(num));
                                        const isOccupied = !!status;
                                        return (
                                            <button 
                                                key={num} 
                                                onClick={() => handleImportTable(num)}
                                                className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl border-2 transition-all p-2 group ${isOccupied 
                                                    ? 'bg-red-50 border-red-200 shadow-md shadow-red-500/5' 
                                                    : 'bg-white border-gray-100 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1'
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${isOccupied 
                                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                                                    : 'bg-gray-100 text-gray-400 group-hover:bg-primary/20 group-hover:text-primary'
                                                }`}>
                                                    <span className="text-lg font-black">{num}</span>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isOccupied ? 'text-red-600' : 'text-gray-300 group-hover:text-primary'}`}>
                                                    {isOccupied ? 'OCUPADA' : 'LIVRE'}
                                                </span>
                                                {isOccupied && (
                                                    <div className="mt-1.5 px-2 py-0.5 bg-red-100 rounded-full border border-red-200">
                                                        <p className="text-[9px] font-black text-red-700 leading-none">R$ {status.total.toFixed(0)}</p>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function PosPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

    return (
        <PosProvider>
            <PosContent />
        </PosProvider>
    );
}

PosPage.displayName = 'PosPage';
