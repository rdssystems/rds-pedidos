'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

import { PosProvider, usePos } from '@/context/PosContext';
import { ShiftManager } from '@/components/pos/ShiftManager';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, Users, Loader2, ChefHat, Printer, UserPlus, X, AlertCircle } from 'lucide-react';

const ProductAttributesModal = ({ product, onClose, onAdd }: { product: any, onClose: () => void, onAdd: (selections: any[], obs: string) => void }) => {
    const [selections, setSelections] = useState<any[]>([]);
    const [itemObs, setItemObs] = useState('');

    const toggleOption = (grupo: any, opcao: any) => {
        const isSelected = selections.some(s => s.opcao_id === opcao.id);

        if (isSelected) {
            setSelections(prev => prev.filter(s => s.opcao_id !== opcao.id));
        } else {
            // Check limits
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
        // Simple validation of min_opcoes
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
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
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
                            className="w-full p-4 rounded-2xl border border-gray-100 focus:outline-none focus:border-primary bg-gray-50/50 text-sm font-medium resize-none h-24"
                        />
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t">
                    <button
                        onClick={handleConfirm}
                        className="w-full py-5 bg-primary text-white font-black text-lg uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
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
    const [searchTerm, setSearchTerm] = useState('');

    // Cliente Info
    const [clienteNome, setClienteNome] = useState('Consumidor Final');
    const [clienteWhatsapp, setClienteWhatsapp] = useState('');
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);

    // Checkout State
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('DINHEIRO');
    const [amountPaid, setAmountPaid] = useState('');
    const [change, setChange] = useState(0);

    // Order States
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [orderObservation, setOrderObservation] = useState('');

    // Table Selection State
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [mesas, setMesas] = useState<any[]>([]);
    const [loadingMesas, setLoadingMesas] = useState(false);

    // Products are now fetched and managed by PosContext via WebSocket

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

    // Filter Products
    const filteredProducts = products.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle Checkout
    const handleCheckout = async () => {
        try {
            await checkout(paymentMethod, parseFloat(amountPaid) || total, { nome: clienteNome, whatsapp: clienteWhatsapp }, orderObservation);
            setIsCheckoutModalOpen(false);
            clearCart();
            setClienteNome('Consumidor Final');
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
            setClienteNome('Consumidor Final');
            setClienteWhatsapp('');
            setOrderObservation('');
            alert('Pedido realizado com sucesso!');
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Calculate Change
    useEffect(() => {
        const paid = parseFloat(amountPaid);
        if (!isNaN(paid) && paid >= total) {
            setChange(paid - total);
        } else {
            setChange(0);
        }
    }, [amountPaid, total]);


    // Group Products by Category
    const groupedProducts = filteredProducts.reduce((acc: any, product: any) => {
        const category = product.categoria_nome || 'Sem Categoria';
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
    }, {});

    const sortedCategories = Object.keys(groupedProducts).sort();

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden relative">
            {/* Shift Manager Overlay/Indicator */}
            <div className="absolute top-4 right-4 z-50">
                <ShiftManager />
            </div>

            {/* Left Column: Product Grid */}
            <div className="flex-1 flex flex-col border-r border-gray-200">
                <header className="h-16 bg-white border-b flex items-center px-6 justify-between shrink-0">
                    <div className="flex items-center gap-6">
                        <h1 className="font-bold text-xl text-gray-800">Frente de Caixa</h1>
                        <button
                            onClick={() => { setIsTableModalOpen(true); fetchMesas(); }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            <Users size={18} />
                            MESAS ABERTAS
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar produto (F2)..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-gray-100 pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-primary w-80 font-medium"
                            autoFocus
                        />
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-y-auto bg-gray-50/50 space-y-8">
                    {sortedCategories.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 italic">Nenhum produto encontrado.</div>
                    ) : (
                        sortedCategories.map(category => (
                            <div key={category} className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <span className="w-2 h-6 bg-primary rounded-full"></span>
                                    {category}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                                            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-2 border border-transparent hover:border-primary/20 active:scale-95 disabled:opacity-50 disabled:grayscale group"
                                        >
                                            {product.imagem ? (
                                                <img src={product.imagem} alt={product.nome} className="w-24 h-24 object-cover rounded-lg group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
                                                    <ShoppingCart size={32} />
                                                </div>
                                            )}
                                            <span className="font-medium text-sm text-gray-700 line-clamp-2 h-10">{product.nome}</span>
                                            <span className="font-black text-primary">R$ {parseFloat(product.preco).toFixed(2)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </main>

                <footer className="h-12 bg-white border-t flex items-center px-6 text-xs text-gray-500 shrink-0">
                    Atalhos: F2 Buscar | F4 Finalizar | Esc Cancelar
                </footer>
            </div>

            {/* Right Column: Cart & Checkout */}
            <div className="w-96 bg-white flex flex-col shadow-xl z-20 shrink-0">
                <div className="h-16 border-b flex items-center px-6 bg-gray-50 shrink-0">
                    <div onClick={() => setIsClientModalOpen(true)} className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-gray-800">{clienteNome}</p>
                            <p className="text-xs text-gray-400">{clienteWhatsapp || 'Não identificado'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                    {cart.length === 0 ? (
                        <div className="text-center py-20 text-gray-300 italic flex flex-col items-center gap-4">
                            <ShoppingCart size={48} className="opacity-20" />
                            Nenhum item lançado
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.uuid} className="flex justify-between items-start border-b border-gray-50 pb-3 animate-slide-left">
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{item.nome}</h4>

                                    {item.selecoes && item.selecoes.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {item.selecoes.map((sel: any, i: number) => (
                                                <span key={i} className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded font-medium">
                                                    {sel.opcao}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {item.observacoes && (
                                        <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                                            <AlertCircle size={10} /> {item.observacoes}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                            {item.quantidade}x R$ {item.precoUnitario.toFixed(2)}
                                        </div>
                                        <span className="font-black text-sm text-primary">
                                            R$ {item.total.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.uuid)}
                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="px-4 pb-4 bg-white border-b border-gray-50">
                    <textarea
                        value={orderObservation}
                        onChange={e => setOrderObservation(e.target.value)}
                        placeholder="Observações do pedido (opcional)..."
                        className="w-full text-xs p-3 rounded-xl border border-gray-100 focus:outline-none focus:border-primary resize-none h-16 bg-gray-50/50 font-medium"
                    />
                </div>

                <div className="bg-gray-50 border-t p-6 space-y-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <span className="text-gray-500 font-medium">Subtotal</span>
                        <span className="text-xl font-bold text-gray-800">R$ {total.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleSendToKitchen}
                            disabled={cart.length === 0 || !caixa || caixa.status === 'FECHADO'}
                            className="py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm uppercase rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center gap-1"
                        >
                            <ChefHat size={18} />
                            Fazer Pedido
                        </button>
                        <button
                            onClick={() => setIsCheckoutModalOpen(true)}
                            disabled={cart.length === 0 || !caixa || caixa.status === 'FECHADO'}
                            className="py-3 bg-green-500 hover:bg-green-600 text-white font-black text-sm uppercase rounded-xl shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center gap-1"
                        >
                            <ShoppingCart size={18} />
                            Finalizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Checkout Modal */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Pagamento</h2>
                            <button onClick={() => setIsCheckoutModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">ESC</button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="text-center space-y-1">
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total a Pagar</p>
                                <p className="text-5xl font-black text-gray-900 tracking-tighter">R$ {total.toFixed(2)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {['DINHEIRO', 'DEBITO', 'CREDITO', 'PIX'].map(method => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={`p-4 rounded-xl border-2 font-bold uppercase text-sm transition-all flex flex-col items-center gap-2 ${paymentMethod === method
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-gray-100 hover:border-gray-200 text-gray-500'
                                            }`}
                                    >
                                        {method === 'DINHEIRO' && <Banknote size={24} />}
                                        {method === 'DEBITO' && <CreditCard size={24} />}
                                        {method === 'CREDITO' && <CreditCard size={24} />}
                                        {method === 'PIX' && <QrCode size={24} />}
                                        {method}
                                    </button>
                                ))}
                            </div>

                            {paymentMethod === 'DINHEIRO' && (
                                <div className="space-y-2 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                    <label className="text-xs font-bold uppercase text-yellow-700">Valor Recebido</label>
                                    <div className="flex gap-4 items-center">
                                        <input
                                            type="number"
                                            value={amountPaid}
                                            onChange={e => setAmountPaid(e.target.value)}
                                            className="flex-1 text-2xl font-black bg-white p-2 rounded-lg border border-yellow-200 focus:outline-none focus:border-yellow-400"
                                            placeholder="0,00"
                                            autoFocus
                                        />
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-gray-400 uppercase">Troco</p>
                                            <p className="text-xl font-black text-gray-800">R$ {change.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleCheckout}
                                className="w-full py-5 bg-green-600 hover:bg-green-700 text-white font-black text-xl uppercase tracking-widest rounded-xl shadow-lg transition-transform active:scale-95"
                            >
                                Confirmar Pagamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Selection Modal */}
            {isTableModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
                        <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Importar Mesa / Comanda</h2>
                            <button onClick={() => setIsTableModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">FECHAR</button>
                        </div>

                        <div className="p-8">
                            {loadingMesas ? (
                                <div className="text-center py-10"><Loader2 className="animate-spin inline-block mr-2" /> Carregando mesas...</div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                    {mesas.length === 0 ? (
                                        <div className="col-span-full py-10 text-center text-gray-400 font-medium italic">Nenhuma mesa ocupada no momento.</div>
                                    ) : (
                                        mesas.map(m => (
                                            <button
                                                key={m.mesa}
                                                onClick={() => handleImportTable(m.mesa)}
                                                className="bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-black text-lg">
                                                    {m.mesa}
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-black text-red-600 uppercase tracking-tighter">R$ {parseFloat(m.total).toFixed(2)}</p>
                                                    <p className="text-[10px] font-bold text-red-400 uppercase">{m.itens_count} itens</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 border-t text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
                            Selecione uma mesa para carregar os itens no checkout
                        </div>
                    </div>
                </div>
            )}
            {/* Client Identification Modal */}
            {isClientModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Identificar Cliente</h2>
                            <button onClick={() => setIsClientModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">FECHAR</button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-400">Nome do Cliente</label>
                                <input
                                    type="text"
                                    value={clienteNome}
                                    onChange={e => setClienteNome(e.target.value)}
                                    className="w-full text-lg font-bold bg-gray-50 p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary"
                                    placeholder="Ex: João Silva"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-400">WhatsApp (Opcional)</label>
                                <input
                                    type="text"
                                    value={clienteWhatsapp}
                                    onChange={e => setClienteWhatsapp(e.target.value)}
                                    className="w-full text-lg font-bold bg-gray-50 p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary"
                                    placeholder="Ex: 5511999999999"
                                />
                            </div>
                            <button
                                onClick={() => setIsClientModalOpen(false)}
                                className="w-full py-4 bg-primary text-white font-black text-lg uppercase tracking-widest rounded-xl shadow-lg transition-transform active:scale-95"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Attributes Modal */}
            {selectedProduct && (
                <ProductAttributesModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onAdd={(selections, obs) => {
                        addToCart(selectedProduct, selections, obs);
                        setSelectedProduct(null);
                    }}
                />
            )}
        </div>
    );
};

export default function PosPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

    return (
        <PosProvider>
            <PosContent />
        </PosProvider>
    );
}
