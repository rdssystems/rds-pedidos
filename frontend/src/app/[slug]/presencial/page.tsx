'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useSocket } from '@/context/SocketContext';
import { ProductModal } from '@/components/Menu/ProductModal';
import { ShoppingBag, ChevronRight, X, Clock, MapPin, Phone, User, Smartphone } from 'lucide-react';

interface StoreData {
    id: number;
    nome: string;
    cor_primaria: string;
    cor_secundaria: string;
    logo: string;
    whatsapp: string;
    endereco: string;
    horario_funcionamento: any;
    categorias: any[];
    banner?: string;
    tipo_taxa_entrega?: 'FIXA' | 'BAIRRO';
    taxa_entrega_fixa?: string;
    bairros_entrega?: { id: number, nome: string, taxa: string, ativo: boolean }[];
    modo_catalogo?: boolean;
    caixa_aberto?: boolean;
}

const DIAS_MAP: Record<number, string> = {
    0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab'
};

type PaymentMethod = 'DINHEIRO' | 'DEBITO' | 'CREDITO' | 'PIX';
type DeliveryMethod = 'RETIRADA' | 'MESA';

export default function InPersonMenuPage() {
    const { slug } = useParams();
    const searchParams = useSearchParams();
    const mesaParam = searchParams.get('mesa');
    const { cart, addToCart, removeFromCart, total, clearCart } = useCart();
    const { lastMessage } = useSocket();

    const [store, setStore] = useState<StoreData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isOpenStatus, setIsOpenStatus] = useState({ open: false, label: 'Fechado' });
    const [isScrolled, setIsScrolled] = useState(false);

    // Check-in State
    const [isCheckinRequired, setIsCheckinRequired] = useState(false);

    // Checkout State
    const [view, setView] = useState<'cart' | 'checkout'>('cart');
    const [checkoutData, setCheckoutData] = useState({
        nome: '',
        telefone: '',
        endereco_rua: '',
        endereco_numero: '',
        endereco_bairro: '',
        pagamento: 'PIX' as PaymentMethod,
        metodo_entrega: (mesaParam ? 'MESA' : 'RETIRADA') as DeliveryMethod,
        troco: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Load saved info
        const savedName = localStorage.getItem('rds_customer_name');
        const savedPhone = localStorage.getItem('rds_customer_phone');
        
        const hasSavedInfo = savedName && savedPhone;

        if (hasSavedInfo) {
            setCheckoutData(prev => ({
                ...prev,
                nome: savedName,
                telefone: savedPhone
            }));
        }

        // Only require check-in if mesa is present and no saved info
        if (mesaParam && !hasSavedInfo) {
            setIsCheckinRequired(true);
        }
    }, [mesaParam]);

    const checkStoreStatus = (data: StoreData) => {
        // Cashier check takes precedence
        if (data && data.caixa_aberto === false) {
            setIsOpenStatus({ open: false, label: 'Caixa Fechado' });
            return;
        }

        if (!data?.horario_funcionamento) return;
        const now = new Date();
        const diaSemana = DIAS_MAP[now.getDay()];
        const horarioHoje = data.horario_funcionamento[diaSemana];
        let isOpen = false;
        const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const isTimeInRange = (open: string, close: string, current: string) => {
            if (close < open) return current >= open || current <= close;
            return current >= open && current <= close;
        };
        if (horarioHoje) {
            if (typeof horarioHoje === 'string') {
                if (horarioHoje.toLowerCase() !== 'fechado' && horarioHoje.includes('-')) {
                    const [inicio, fim] = horarioHoje.split('-');
                    isOpen = isTimeInRange(inicio.trim(), fim.trim(), curTime);
                }
            } else if (typeof horarioHoje === 'object' && !horarioHoje.closed) {
                isOpen = isTimeInRange(horarioHoje.open, horarioHoje.close, curTime);
            }
        }
        if (!isOpen) {
            const yesterdayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
            const diaOntem = DIAS_MAP[yesterdayIndex];
            const horarioOntem = data.horario_funcionamento[diaOntem];
            if (horarioOntem && typeof horarioOntem === 'object' && !horarioOntem.closed) {
                if (horarioOntem.close < horarioOntem.open) {
                    if (curTime <= horarioOntem.close) isOpen = true;
                }
            }
        }
        setIsOpenStatus({ open: isOpen, label: isOpen ? 'Aberto' : 'Fechado' });
    };

    useEffect(() => {
        const fetchStore = async () => {
            if (!slug) return;
            const currentSlug = Array.isArray(slug) ? slug[0] : slug;
            try {
                const response = await fetch(`/api/lojas/${currentSlug}/?_t=${new Date().getTime()}`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                if (!response.ok) {
                    setStore(null);
                    setLoading(false);
                    return;
                }
                const data = await response.json();
                setStore(data);
                checkStoreStatus(data);
                
                // Set store ID for socket
                if (data.id) {
                    localStorage.setItem('activeStoreId', data.id.toString());
                }
            } catch (error) {
                console.error('Error fetching store:', error);
                setStore(null);
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [slug]);

    // Listen for real-time status updates
    useEffect(() => {
        if (lastMessage && lastMessage.type === 'CAIXA_UPDATE' && store) {
            const newStatus = lastMessage.status === 'ABERTO';
            const updatedStore = { ...store, caixa_aberto: newStatus };
            setStore(updatedStore);
            checkStoreStatus(updatedStore);
        }
    }, [lastMessage, store]);

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('backend:8000')) return url.split('backend:8000')[1];
        return url;
    };

    const formatCurrency = (val: number) => `R$ ${val.toFixed(2)}`;

    const formatWhatsappNumber = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length >= 10 && cleaned.length <= 11) return `55${cleaned}`;
        return cleaned;
    };

    const handleCheckin = () => {
        if (!checkoutData.nome || checkoutData.telefone.length < 10) {
            alert('Por favor, informe seu Nome e um WhatsApp válido.');
            return;
        }
        localStorage.setItem('rds_customer_name', checkoutData.nome);
        localStorage.setItem('rds_customer_phone', checkoutData.telefone);
        setIsCheckinRequired(false);
    };

    const handleSubmitOrder = async () => {
        if (!store) return;
        if (!isOpenStatus.open) {
            alert('A loja está fechada no momento.');
            return;
        }
        if (!checkoutData.nome || !checkoutData.telefone) {
            alert('Por favor, preencha seu Nome e Whatsapp.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                loja: store.id,
                cliente_nome: checkoutData.nome,
                cliente_whatsapp: checkoutData.telefone,
                endereco: mesaParam ? `Mesa ${mesaParam}` : 'Retirada na Loja',
                total: total,
                taxa_entrega: 0,
                forma_pagamento: checkoutData.pagamento,
                tipo: checkoutData.metodo_entrega,
                mesa: mesaParam ? parseInt(mesaParam) : null,
                itens: cart.map(item => ({
                    produto: item.productId,
                    quantidade: item.quantidade,
                    preco_unitario: item.precoBase + item.atributos.reduce((s, a) => s + a.preco, 0),
                    observacoes: '',
                    selecoes: item.atributos.map(attr => ({
                        grupo: attr.grupoNome,
                        opcao: attr.nome,
                        preco: attr.preco
                    }))
                }))
            };

            const response = await fetch('/api/pedidos/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Falha ao criar pedido');

            const orderId = `#${Date.now().toString().slice(-4)}`;
            let message = `*🪑 PEDIDO NA MESA ${mesaParam || ''} ${orderId}* \n\n`;
            message += `👤 *Cliente:* ${checkoutData.nome}\n`;
            message += `\n🛒 *RESUMO DO PEDIDO:*\n`;
            cart.forEach(item => {
                message += `▪️ ${item.quantidade}x *${item.nome}*\n`;
                item.atributos.forEach(attr => {
                    message += `   └ _${attr.nome}_\n`;
                });
                message += `\n`;
            });
            message += `💰 *TOTAL: ${formatCurrency(total)}*\n`;
            message += `\n_Pedido realizado via Mesa Digital_`;

            const encoded = encodeURIComponent(message);
            const storePhone = formatWhatsappNumber(store.whatsapp);
            window.open(`https://wa.me/${storePhone}?text=${encoded}`, '_blank');

            clearCart();
            setIsCartOpen(false);
            setView('cart');
            alert('Pedido enviado com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar pedido.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-pulse font-black text-primary italic uppercase tracking-widest">Carregando...</div>;
    if (!store) return <div className="min-h-screen flex items-center justify-center text-xl font-black italic uppercase tracking-tight text-gray-400">Loja não encontrada.</div>;

    return (
        <div className="min-h-screen pb-40 relative">
            {/* Check-in Modal */}
            {isCheckinRequired && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-[3rem] p-8 space-y-8 animate-slide-up shadow-2xl">
                        <div className="text-center space-y-2">
                            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <ShoppingBag size={40} />
                            </div>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Bem-vindo à Mesa {mesaParam}</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Informe seus dados para começar</p>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Seu Nome</label>
                                <div className="relative">
                                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                    <input type="text" value={checkoutData.nome} onChange={(e) => setCheckoutData({ ...checkoutData, nome: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-5 pl-14 rounded-2xl font-bold focus:outline-none focus:border-indigo-200 transition-all text-gray-900" placeholder="Como deseja ser chamado?" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Telefone (WhatsApp)</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                    <input type="tel" value={checkoutData.telefone} onChange={(e) => setCheckoutData({ ...checkoutData, telefone: e.target.value.replace(/\D/g, '') })} className="w-full bg-gray-50 border-2 border-gray-100 p-5 pl-14 rounded-2xl font-bold focus:outline-none focus:border-indigo-200 transition-all text-gray-900" placeholder="DDD + Número" maxLength={11} />
                                </div>
                            </div>
                        </div>
                        <button onClick={handleCheckin} className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black text-xl italic uppercase tracking-tighter shadow-xl hover:scale-[1.02] active:scale-95 transition-all">ACESSAR CARDÁPIO</button>
                    </div>
                </div>
            )}

            <div className="fixed inset-0 z-0">
                {store.banner ? (
                    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80" style={{ backgroundImage: `url(${getImageUrl(store.banner)})` }} />
                ) : (
                    <div className="absolute inset-0" style={{ backgroundColor: store.cor_secundaria }} />
                )}
            </div>

            <div className="relative z-10 pt-20">
                {/* Fixed Header Bar */}
                <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white flex-shrink-0">
                            <img src={getImageUrl(store.logo)} alt={store.nome} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="font-black italic uppercase tracking-tighter text-gray-900 text-sm leading-tight truncate">{store.nome}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Presencial</span>
                                {mesaParam && <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-2 rounded-full">Mesa {mesaParam}</span>}
                            </div>
                        </div>
                    </div>
                    {cart.length > 0 && !store.modo_catalogo && (
                        <button onClick={() => setIsCartOpen(true)} className="bg-primary text-white p-2.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2" style={{ backgroundColor: store.cor_primaria }}>
                            <ShoppingBag size={18} />
                            <span className="text-xs font-black">{cart.reduce((s, i) => s + i.quantidade, 0)}</span>
                        </button>
                    )}
                </div>

                <header className="relative w-full px-6 flex flex-col items-center pt-8">
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-2xl bg-white overflow-hidden">
                        <img src={getImageUrl(store.logo)} alt={store.nome} className="w-full h-full object-cover" />
                    </div>
                    <h1 className="mt-6 text-3xl font-black italic tracking-tighter uppercase leading-none text-gray-900 bg-white/60 backdrop-blur-md py-4 px-8 rounded-3xl shadow-sm text-center">
                        {store.nome}
                    </h1>
                </header>

                <main className="max-w-4xl mx-auto p-6 mt-8 space-y-10">
                    {store.categorias?.map((cat, idx) => (
                        <section key={cat.id} className="animate-slide-up" style={{ animationDelay: `${(idx + 1) * 100}ms` }}>
                            <h2 className="text-xl font-black uppercase italic tracking-tighter mb-4 border-l-4 pl-4" style={{ borderColor: store.cor_primaria }}>{cat.nome}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {cat.produtos.map(prod => (
                                    <button key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white p-4 rounded-[2rem] shadow-sm flex gap-4 hover:shadow-xl transition-all text-left group border border-gray-50">
                                        <div className="flex-1 space-y-1">
                                            <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">{prod.nome}</h3>
                                            <p className="text-[10px] text-gray-400 line-clamp-2 h-7 leading-relaxed">{prod.descricao || '...'}</p>
                                            <p className="text-lg font-black italic tracking-tighter" style={{ color: store.cor_primaria }}>R$ {prod.preco}</p>
                                        </div>
                                        {prod.imagem && (
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                                                <img src={getImageUrl(prod.imagem)} alt={prod.nome} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </main>

                {/* Footer Logic based on mode_catalogo */}
                {store.modo_catalogo ? (
                    <div className="fixed bottom-0 left-0 right-0 p-6 z-50">
                        <div className="flex justify-center w-full animate-slide-up">
                            <div className="w-full max-w-md bg-white border-2 border-indigo-100 p-6 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-2 text-center">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-1">
                                    <Phone size={20} />
                                </div>
                                <span className="font-black uppercase italic tracking-tighter text-sm text-gray-900">Apenas Visualização</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Um atendente irá até você para fazer o pedido.</span>
                                {mesaParam && <span className="text-[10px] font-black uppercase text-indigo-600 mt-2">Você está na Mesa {mesaParam}</span>}
                            </div>
                        </div>
                    </div>
                ) : (
                    cart.length > 0 && (
                        <div className="fixed bottom-0 left-0 right-0 p-6 z-50">
                            <button onClick={() => setIsCartOpen(true)} className="w-full max-w-md mx-auto text-white px-8 py-6 rounded-[2.5rem] shadow-2xl flex justify-between items-center transition-all hover:scale-[1.02] active:scale-95 group font-black uppercase italic tracking-tighter" style={{ backgroundColor: store.cor_primaria }}>
                                <div className="flex items-center gap-4">
                                    <div className="bg-white rounded-xl w-8 h-8 flex items-center justify-center text-sm font-black italic shadow-lg" style={{ color: store.cor_primaria }}>{cart.reduce((s, i) => s + i.quantidade, 0)}</div>
                                    <span className="text-lg">Finalizar na Mesa</span>
                                </div>
                                <span className="text-xl">R$ {total.toFixed(2)}</span>
                            </button>
                        </div>
                    )
                )}

                {/* Cart Drawer */}
                {isCartOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-end">
                        <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-slide-left rounded-l-[3rem] overflow-hidden">
                            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Minha Comanda</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mesa {mesaParam}</p>
                                </div>
                                <button onClick={() => setIsCartOpen(false)} className="p-3 bg-white shadow-sm hover:bg-gray-100 rounded-full transition-all active:scale-90"><X size={28} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                {cart.map(item => (
                                    <div key={item.id} className="flex gap-4 p-5 rounded-[2rem] border-2 border-gray-50">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-black text-lg text-gray-900 uppercase italic leading-tight">{item.quantidade}x {item.nome}</h4>
                                                <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500"><X size={20} /></button>
                                            </div>
                                            {item.atributos.map(a => (<p key={a.opcaoId} className="text-[10px] font-bold text-gray-400 capitalize">• {a.nome}</p>))}
                                            <p className="font-black text-xl italic mt-2" style={{ color: store.cor_primaria }}>{formatCurrency((item.precoBase + item.atributos.reduce((s, a) => s + a.preco, 0)) * item.quantidade)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-8 border-t bg-gray-50/50 space-y-6">
                                <div className="flex justify-between items-end">
                                    <span className="font-black text-xs text-gray-400 uppercase tracking-widest">Total a Pagar</span>
                                    <span className="font-black text-4xl italic tracking-tighter" style={{ color: store.cor_primaria }}>{formatCurrency(total)}</span>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Forma de Pagamento</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['PIX', 'CARTÃO', 'DINHEIRO'].map(m => (
                                            <button key={m} onClick={() => setCheckoutData({ ...checkoutData, pagamento: m as any })} className={`p-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all ${checkoutData.pagamento === m ? 'bg-indigo-900 border-indigo-900 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>{m}</button>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={handleSubmitOrder} disabled={isSubmitting} className="w-full py-6 bg-green-500 text-white rounded-[2rem] font-black text-xl italic uppercase tracking-tighter shadow-xl shadow-green-500/20 hover:brightness-110 active:scale-95 transition-all">{isSubmitting ? 'ENVIANDO...' : 'ENVIAR PEDIDO'}</button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedProduct && (
                    <ProductModal
                        isOpen={!!selectedProduct}
                        product={selectedProduct}
                        storeColor={store.cor_primaria}
                        modoCatalogo={store.modo_catalogo}
                        onClose={() => setSelectedProduct(null)}
                        onAddToCart={(item) => {
                            addToCart(item);
                            setSelectedProduct(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
