'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import {
    ChevronLeft, Plus, Search, ShoppingCart,
    Trash2, CreditCard, Loader2, UtensilsCrossed,
    MessageSquare, CheckCircle2, Clock
} from 'lucide-react';
import { ProductModal } from '@/components/Menu/ProductModal';
import { useBilling } from '@/context/BillingContext';
import { useSocket } from '@/context/SocketContext';

const TableDetailPage = () => {
    const { user, loading } = useAuth();
    const { store, refreshBilling } = useBilling();
    const { lastMessage } = useSocket();
    const router = useRouter();
    const params = useParams();
    const mesaNum = params.id;

    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Simple Cart for Waiter
    const [cart, setCart] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Product Modal State
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchTableData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const storeId = localStorage.getItem('activeStoreId');

            // 1. Fetch Active Orders for this mesa
            const resOrders = await fetch(`/api/pedidos/?loja_id=${storeId}&mesa=${mesaNum}&status__in=NOVO,PREPARO,DESPACHADO`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Django filter note: our get_queryset filters based on tipo=MESA and mesa=Num if provided.
            // But exclude FINALIZADO, CANCELADO is better handled in a specific way or just filtering here.

            if (resOrders.ok) {
                const data = await resOrders.json();
                // Filter only MESA and not finished if not already done by backend
                setOrders(data.results || data);
            }

            // 2. Fetch Products
            const resProducts = await fetch('/api/produtos/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resProducts.ok) {
                setProducts(await resProducts.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (mesaNum) fetchTableData();
    }, [user, loading, mesaNum]);

    // Listen for real-time status updates
    useEffect(() => {
        if (lastMessage && lastMessage.type === 'CAIXA_UPDATE') {
            refreshBilling();
        }
    }, [lastMessage]);

    const addToCart = (product: any) => {
        // This is called from the ProductModal handleConfirm
        setCart(prev => {
            // Check if exact same product with same attributes already in cart
            const existingIndex = prev.findIndex(item =>
                item.productId === product.productId &&
                JSON.stringify(item.atributos) === JSON.stringify(product.atributos)
            );

            if (existingIndex > -1) {
                const newCart = [...prev];
                newCart[existingIndex].quantidade += product.quantidade;
                return newCart;
            }
            return [...prev, product];
        });
    };

    const openProductModal = (product: any) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const handleSendToKitchen = async () => {
        if (cart.length === 0) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const storeId = localStorage.getItem('activeStoreId');

            const total = cart.reduce((acc, item) => {
                const base = item.precoBase || parseFloat(item.preco);
                const addons = (item.atributos || []).reduce((a: number, b: any) => a + (b.preco || 0), 0);
                return acc + ((base + addons) * item.quantidade);
            }, 0);

            const payload = {
                loja: storeId,
                cliente_nome: `Mesa ${mesaNum}`,
                cliente_whatsapp: '',
                endereco: `Mesa ${mesaNum}`,
                total: total,
                tipo: 'MESA',
                mesa: parseInt(mesaNum as string),
                status: 'NOVO',
                itens: cart.map(item => ({
                    produto: item.productId || item.id,
                    quantidade: item.quantidade,
                    preco_unitario: item.precoBase || parseFloat(item.preco),
                    selecoes: item.atributos || []
                }))
            };

            const res = await fetch('/api/pedidos/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setCart([]);
                fetchTableData();
                alert('Pedido enviado para a cozinha!');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalInCart = cart.reduce((acc, item) => {
        const base = item.precoBase || parseFloat(item.preco);
        const addons = (item.atributos || []).reduce((a: number, b: any) => a + (b.preco || 0), 0);
        return acc + ((base + addons) * item.quantidade);
    }, 0);
    const totalCurrentOrders = orders.reduce((acc, order) => acc + parseFloat(order.total), 0);

    const filteredProducts = products.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <Loader2 className="animate-spin text-primary" size={32} />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-[250px] sm:pb-20">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 sticky top-0 z-10 flex items-center gap-4 shadow-sm">
                <button onClick={() => router.push('/mesas')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ChevronLeft size={24} className="text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">Mesa {mesaNum}</h1>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${orders.length > 0 ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                            {orders.length > 0 ? 'Em Atendimento' : 'Livre / Novo Pedido'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Mesa</p>
                    <p className="text-lg font-black text-primary">R$ {totalCurrentOrders.toFixed(2)}</p>
                </div>
            </header>

            {store && store.caixa_aberto === false && (
                <div className="bg-red-500 text-white px-6 py-2 text-center text-[10px] font-black uppercase tracking-widest animate-pulse">
                    O Caixa está fechado. Não é possível realizar novos pedidos.
                </div>
            )}

            <main className="p-6 space-y-8 max-w-4xl mx-auto">
                {/* Active Orders List */}
                {orders.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                            <Clock size={14} /> Consumo Atual
                        </h2>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y overflow-hidden">
                            {orders.flatMap(order => order.itens).map((item: any, idx) => (
                                <div key={idx} className="p-4 flex justify-between items-center group active:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 font-bold text-sm">
                                            {item.quantidade}x
                                        </div>
                                        <span className="font-bold text-gray-700">{item.produto_obj?.nome || 'Produto'}</span>
                                    </div>
                                    <span className="font-bold text-gray-400">R$ {(parseFloat(item.preco_unitario) * item.quantidade).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Product Search & Selection */}
                <section className="space-y-4">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                        <Plus size={14} /> Adicionar Itens
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar no cardápio..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-white pl-12 pr-4 py-4 rounded-2xl border border-gray-100 shadow-sm focus:outline-none focus:border-primary font-bold text-gray-700"
                        />
                    </div>


                    <div className="space-y-6">
                        {Object.keys(
                            filteredProducts.reduce((acc: any, product: any) => {
                                const category = product.categoria_nome || 'Sem Categoria';
                                if (!acc[category]) acc[category] = [];
                                acc[category].push(product);
                                return acc;
                            }, {})
                        ).sort().map(category => {
                            const categoryProducts = filteredProducts.filter(p => (p.categoria_nome || 'Sem Categoria') === category);
                            return (
                                <div key={category} className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 pl-1 border-l-4 border-primary">
                                        {category}
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {categoryProducts.map(product => (
                                            <button
                                                key={product.id}
                                                onClick={() => openProductModal(product)}
                                                disabled={store?.caixa_aberto === false}
                                                className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 text-center active:scale-[0.98] transition-all hover:border-primary/20 h-full disabled:opacity-50 disabled:grayscale"
                                            >
                                                <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                                    {product.imagem ? (
                                                        <img src={product.imagem} className="w-full h-full object-cover" alt={product.nome} />
                                                    ) : (
                                                        <UtensilsCrossed className="text-gray-300" size={24} />
                                                    )}
                                                </div>
                                                <div className="flex-1 w-full flex flex-col justify-between gap-1">
                                                    <p className="font-bold text-gray-800 text-xs line-clamp-2 leading-tight">{product.nome}</p>
                                                    <p className="text-xs font-black text-primary uppercase">R$ {parseFloat(product.preco).toFixed(2)}</p>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-active:bg-primary group-active:text-white transition-colors shrink-0 mt-1">
                                                    <Plus size={16} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>

            {/* Float Cart - Floating Action Bar */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-6 z-[60] animate-slide-up sm:max-w-md sm:mx-auto">
                    <div className="bg-gray-900 text-white rounded-[32px] shadow-2xl overflow-hidden border border-white/10">
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center px-2">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="text-primary" size={20} />
                                    <span className="font-black uppercase tracking-widest text-xs">Novo Pedido</span>
                                </div>
                                <span className="text-2xl font-black">R$ {totalInCart.toFixed(2)}</span>
                            </div>

                            <div className="max-h-[120px] overflow-y-auto space-y-2 py-2">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-white/5 rounded-xl p-3">
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-primary">{item.quantidade || item.quantity}x</span>
                                            <div>
                                                <span className="font-bold text-sm line-clamp-1">{item.nome}</span>
                                                {item.atributos?.length > 0 && (
                                                    <p className="text-[10px] text-gray-400 font-medium">
                                                        {item.atributos.map((a: any) => a.nome).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-400 p-1">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleSendToKitchen}
                                disabled={isSubmitting || store?.caixa_aberto === false}
                                className="w-full bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-primary/20"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        <CheckCircle2 size={24} />
                                        <span>ENVIAR PARA COZINHA</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isModalOpen && selectedProduct && (
                <ProductModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    product={selectedProduct}
                    onAddToCart={addToCart}
                    storeColor={store?.cor_primaria || '#f97316'}
                />
            )}
        </div>
    );
};

export default TableDetailPage;
