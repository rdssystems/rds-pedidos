import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ChevronLeft, Plus, Search, ShoppingCart,
    Trash2, Loader2, UtensilsCrossed, CheckCircle2, Clock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBilling } from '@/context/BillingContext';
import { useSocket } from '@/context/SocketContext';
import { ProductModal } from '@/components/menu/ProductModal';

const TableDetailPage = () => {
    const { user, loading } = useAuth();
    const { store, refreshBilling } = useBilling();
    const { lastMessage } = useSocket();
    const navigate = useNavigate();
    const { id: mesaNum } = useParams();

    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchTableData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const storeId = localStorage.getItem('activeStoreId');

            const resOrders = await fetch(`/api/pedidos/?loja_id=${storeId}&mesa=${mesaNum}&status__in=NOVO,PREPARO,DESPACHADO`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resOrders.ok) {
                const data = await resOrders.ok ? await resOrders.json() : [];
                setOrders(data.results || data);
            }

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
    }, [mesaNum]);

    useEffect(() => {
        if (lastMessage && lastMessage.type === 'CAIXA_UPDATE') {
            refreshBilling();
            fetchTableData();
        }
    }, [lastMessage]);

    const addToCart = (product: any) => {
        setCart(prev => {
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

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const handleSendToKitchen = async () => {
        if (cart.length === 0) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const storeId = localStorage.getItem('activeStoreId');

            const total = cart.reduce((acc, item) => {
                const base = item.precoBase;
                const addons = (item.atributos || []).reduce((a: number, b: any) => a + (b.preco || 0), 0);
                return acc + ((base + addons) * item.quantidade);
            }, 0);

            const payload = {
                loja: storeId,
                cliente_nome: `Mesa ${mesaNum}`,
                endereco: `Mesa ${mesaNum}`,
                total: total,
                tipo: 'MESA',
                mesa: parseInt(mesaNum as string),
                status: 'NOVO',
                itens: cart.map(item => ({
                    produto: item.productId,
                    quantidade: item.quantidade,
                    preco_unitario: item.precoBase,
                    selecoes: item.atributos.map((a: any) => a.opcaoId)
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
        const base = item.precoBase;
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
            <header className="bg-white border-b px-6 py-4 sticky top-0 z-10 flex items-center gap-4 shadow-sm">
                <button onClick={() => navigate('/mesas')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ChevronLeft size={24} className="text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-black text-gray-800 uppercase">Mesa {mesaNum}</h1>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${orders.length > 0 ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{orders.length > 0 ? 'Em Atendimento' : 'Livre'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total Mesa</p>
                    <p className="text-lg font-black text-primary">R$ {totalCurrentOrders.toFixed(2)}</p>
                </div>
            </header>

            <main className="p-6 space-y-8 max-w-4xl mx-auto">
                {orders.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1"><Clock size={14} /> Consumo Atual</h2>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y overflow-hidden">
                            {orders.flatMap(order => order.itens).map((item: any, idx) => (
                                <div key={idx} className="p-4 flex justify-between items-center group active:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 font-bold text-sm">{item.quantidade}x</div>
                                        <span className="font-bold text-gray-700">{item.produto_obj?.nome || 'Produto'}</span>
                                    </div>
                                    <span className="font-bold text-gray-400">R$ {(parseFloat(item.preco_unitario) * item.quantidade).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="space-y-4">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1"><Plus size={14} /> Adicionar Itens</h2>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Buscar no cardápio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white pl-12 pr-4 py-4 rounded-xl border border-gray-100 shadow-sm font-bold text-gray-700" />
                    </div>

                    <div className="space-y-6">
                        {Object.entries(
                            filteredProducts.reduce((acc: any, product: any) => {
                                const category = product.categoria_nome || 'Sem Categoria';
                                if (!acc[category]) acc[category] = [];
                                acc[category].push(product);
                                return acc;
                            }, {})
                        ).map(([category, categoryProducts]: [string, any]) => (
                            <div key={category} className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 pl-1 border-l-4 border-primary">{category}</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {categoryProducts.map((product: any) => (
                                        <button key={product.id} onClick={() => { setSelectedProduct(product); setIsModalOpen(true); }} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 text-center h-full">
                                            <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
                                                {product.imagem ? <img src={product.imagem} className="w-full h-full object-cover" /> : <UtensilsCrossed className="text-gray-300" size={24} />}
                                            </div>
                                            <div className="flex-1 w-full text-left">
                                                <p className="font-bold text-gray-800 text-xs line-clamp-2">{product.nome}</p>
                                                <p className="text-xs font-black text-primary">R$ {parseFloat(product.preco).toFixed(2)}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-6 z-[60] sm:max-w-md sm:mx-auto">
                    <div className="bg-gray-900 text-white rounded-[32px] shadow-2xl overflow-hidden p-6 space-y-4 border border-white/10">
                        <div className="flex justify-between items-center px-2">
                            <div className="flex items-center gap-2"><ShoppingCart className="text-primary" size={20} /><span className="font-black uppercase tracking-widest text-xs">Novo Pedido</span></div>
                            <span className="text-2xl font-black">R$ {totalInCart.toFixed(2)}</span>
                        </div>
                        <div className="max-h-[120px] overflow-y-auto space-y-2 py-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-white/5 rounded-xl p-3">
                                    <div className="flex items-center gap-3"><span className="font-black text-primary">{item.quantidade}x</span><span className="font-bold text-sm">{item.nome}</span></div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-gray-500"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleSendToKitchen} disabled={isSubmitting || store?.caixa_aberto === false} className="w-full bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-black py-5 rounded-xl flex items-center justify-center gap-3">
                            {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24} /><span>ENVIAR PARA COZINHA</span></>}
                        </button>
                    </div>
                </div>
            )}

            {isModalOpen && selectedProduct && (
                <ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} product={selectedProduct} onAddToCart={addToCart} storeColor={store?.cor_primaria || '#f97316'} />
            )}
        </div>
    );
};

export default TableDetailPage;
