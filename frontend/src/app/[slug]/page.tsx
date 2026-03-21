'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useSocket } from '@/context/SocketContext';
import { ProductModal } from '@/components/Menu/ProductModal';
import { ShoppingBag, ChevronRight, X, Clock, MapPin, Phone } from 'lucide-react';

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
type DeliveryMethod = 'ENTREGA' | 'RETIRADA';

export default function PublicMenuPage() {
    const { slug } = useParams();
    const { cart, addToCart, removeFromCart, total, clearCart } = useCart();
    const { lastMessage } = useSocket();

    const [store, setStore] = useState<StoreData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isOpenStatus, setIsOpenStatus] = useState({ open: false, label: 'Fechado' });
    const [isScrolled, setIsScrolled] = useState(false);

    // Checkout State
    const [view, setView] = useState<'cart' | 'checkout'>('cart');
    const [checkoutData, setCheckoutData] = useState({
        nome: '',
        telefone: '',
        endereco_rua: '',
        endereco_numero: '',
        endereco_bairro: '',
        pagamento: 'PIX' as PaymentMethod,
        metodo_entrega: 'ENTREGA' as DeliveryMethod,
        troco: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Load saved info
        const savedName = localStorage.getItem('rds_customer_name');
        const savedPhone = localStorage.getItem('rds_customer_phone');
        if (savedName || savedPhone) {
            setCheckoutData(prev => ({
                ...prev,
                nome: savedName || '',
                telefone: savedPhone || ''
            }));
        }
    }, []);

    const deliveryFee = React.useMemo(() => {
        if (!store || checkoutData.metodo_entrega !== 'ENTREGA') return 0;

        if (store.tipo_taxa_entrega === 'BAIRRO') {
            if (!store.bairros_entrega) return 0;
            const bairroSelecionado = store.bairros_entrega.find(b => b.nome === checkoutData.endereco_bairro);
            return bairroSelecionado ? parseFloat(bairroSelecionado.taxa) : 0;
        }

        return parseFloat(store.taxa_entrega_fixa || '0');
    }, [store, checkoutData.metodo_entrega, checkoutData.endereco_bairro]);

    const grandTotal = total + deliveryFee;

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
            if (close < open) {
                return current >= open || current <= close;
            }
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
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 200);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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

                // Set store ID for socket if not set or different
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

    useEffect(() => {
        if (!store) return;
        const interval = setInterval(() => checkStoreStatus(store), 60000);
        return () => clearInterval(interval);
    }, [store]);

    // Listen for real-time status updates
    useEffect(() => {
        if (lastMessage && lastMessage.type === 'CAIXA_UPDATE' && store) {
            // Update store data with new cashier status
            const newStatus = lastMessage.status === 'ABERTO';
            const updatedStore = { ...store, caixa_aberto: newStatus };
            setStore(updatedStore);
            checkStoreStatus(updatedStore);
        }
    }, [lastMessage, store]);

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('backend:8000')) {
            return url.split('backend:8000')[1];
        }
        return url;
    };

    const formatCurrency = (val: number) => `R$ ${val.toFixed(2)}`;

    const formatWhatsappNumber = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length >= 10 && cleaned.length <= 11) {
            return `55${cleaned}`;
        }
        return cleaned;
    };

    const handleSubmitOrder = async () => {
        if (!store) return;

        if (!isOpenStatus.open) {
            alert('A loja está fechada no momento. Confira o horário de funcionamento.');
            return;
        }

        const cleanPhone = checkoutData.telefone.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            alert('Por favor, informe um número de Whatsapp válido (10 ou 11 dígitos, ex: 11999999999).');
            return;
        }

        if (!checkoutData.nome || !checkoutData.telefone) {
            alert('Por favor, preencha seu Nome e Whatsapp.');
            return;
        }

        if (checkoutData.metodo_entrega === 'ENTREGA' && (!checkoutData.endereco_rua || !checkoutData.endereco_numero || !checkoutData.endereco_bairro)) {
            alert('Para receber em casa, por favor, preencha o Endereço completo.');
            return;
        }

        if (checkoutData.pagamento === 'DINHEIRO' && checkoutData.troco) {
            const trocoValor = parseFloat(checkoutData.troco.replace('R$', '').replace('.', '').replace(',', '.').trim());
            if (isNaN(trocoValor)) {
                alert('Valor de troco inválido.');
                return;
            }
            if (trocoValor < grandTotal) {
                alert(`O valor para troco (R$ ${trocoValor.toFixed(2)}) não pode ser menor que o total do pedido (R$ ${grandTotal.toFixed(2)}).`);
                return;
            }
        }

        const fullAddress = checkoutData.metodo_entrega === 'ENTREGA'
            ? `${checkoutData.endereco_rua}, ${checkoutData.endereco_numero} - ${checkoutData.endereco_bairro}`
            : 'Retirada na Loja';

        setIsSubmitting(true);

        try {
            const payload = {
                loja: store.id,
                cliente_nome: checkoutData.nome,
                cliente_whatsapp: checkoutData.telefone,
                endereco: fullAddress,
                total: grandTotal,
                taxa_entrega: deliveryFee,
                forma_pagamento: checkoutData.pagamento,
                tipo: checkoutData.metodo_entrega,
                mesa: null,
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

            if (!response.ok) {
                const err = await response.text();
                throw new Error('Falha ao criar pedido: ' + err);
            }

            const orderId = `#${Date.now().toString().slice(-4)}`;
            let message = `*🔔 NOVO PEDIDO ${orderId}* 🔔\n\n`;
            message += `👤 *Cliente:* ${checkoutData.nome}\n`;
            if (checkoutData.telefone) message += `📞 *Contato:* ${checkoutData.telefone}\n\n`;
            message += `🛒 *RESUMO DO PEDIDO:*\n`;
            cart.forEach(item => {
                const totalAttrs = item.atributos.reduce((sum, attr) => sum + Number(attr.preco), 0);
                message += `▪️ ${item.quantidade}x *${item.nome}*\n`;
                item.atributos.forEach(attr => {
                    message += `   └ _${attr.nome} (+${formatCurrency(Number(attr.preco))})_\n`;
                });
                message += `\n`;
            });

            if (checkoutData.metodo_entrega === 'ENTREGA') {
                message += `📍 *ENTREGA:*\n${fullAddress}\n`;
                message += `🛵 *Taxa de Entrega:* ${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}\n\n`;
            } else {
                message += `🛍️ *RETIRADA:*\nO cliente vai retirar o pedido na loja.\n\n`;
            }

            message += `💳 *PAGAMENTO:*\n`;
            message += `Forma: ${checkoutData.pagamento}\n`;
            if (checkoutData.pagamento === 'DINHEIRO' && checkoutData.troco) {
                message += `Troco para: R$ ${checkoutData.troco}\n`;
            }

            message += `\n💰 *SUBTOTAL:* ${formatCurrency(total)}\n`;
            if (checkoutData.metodo_entrega === 'ENTREGA' && deliveryFee > 0) {
                message += `💰 *TAXA ENTREGA:* ${formatCurrency(deliveryFee)}\n`;
            }
            message += `💰 *TOTAL A PAGAR: ${formatCurrency(grandTotal)}*\n`;
            message += `\n_Pedido enviado via Cardápio Digital_`;

            const encoded = encodeURIComponent(message);
            const storePhone = formatWhatsappNumber(store.whatsapp).replace(/\D/g, '');
            window.open(`https://wa.me/${storePhone}?text=${encoded}`, '_blank');

            clearCart();
            setIsCartOpen(false);
            setView('cart');
            setCheckoutData({
                nome: '',
                telefone: '',
                endereco_rua: '',
                endereco_numero: '',
                endereco_bairro: '',
                pagamento: 'PIX',
                metodo_entrega: 'ENTREGA',
                troco: ''
            });

            // Save info for next time
            localStorage.setItem('rds_customer_name', payload.cliente_nome);
            localStorage.setItem('rds_customer_phone', payload.cliente_whatsapp);

            alert('Pedido enviado com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Ocorreu um erro ao enviar o pedido.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-pulse font-black text-primary italic uppercase tracking-widest">Carregando...</div>;
    if (!store) return <div className="min-h-screen flex items-center justify-center text-xl font-black italic uppercase tracking-tight text-gray-400">Loja não encontrada.</div>;

    return (
        <div className="min-h-screen pb-40 relative">
            <div className="fixed inset-0 z-0">
                {store.banner ? (
                    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80" style={{ backgroundImage: `url(${getImageUrl(store.banner)})` }} />
                ) : (
                    <div className="absolute inset-0" style={{ backgroundColor: store.cor_secundaria }} />
                )}
            </div>

            <div className="relative z-10 pt-20 md:pt-24">
                {/* Fixed Header Bar */}
                <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 md:gap-4 overflow-hidden flex-1">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white flex-shrink-0">
                            <img src={getImageUrl(store.logo)} alt={store.nome} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <h2 className="font-black italic uppercase tracking-tighter text-gray-900 text-sm md:text-lg leading-tight break-words">
                                {store.nome}
                            </h2>
                            <div className="hidden lg:flex items-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mt-1">
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <Clock size={12} className="text-primary" style={{ color: store.cor_primaria }} />
                                    {(() => {
                                        const now = new Date();
                                        const h = store.horario_funcionamento?.[DIAS_MAP[now.getDay()]];
                                        if (!h || h.closed) return 'Fechado';
                                        return `${h.open} - ${h.close}`;
                                    })()}
                                </div>
                                <div className="flex items-center gap-1.5 border-l border-gray-100 pl-4 flex-shrink-0">
                                    <Phone size={12} className="text-primary" style={{ color: store.cor_primaria }} />
                                    <span>{store.whatsapp}</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-l border-gray-100 pl-4 min-w-0 max-w-sm lg:max-w-md overflow-hidden">
                                    <MapPin size={12} className="text-primary shrink-0" style={{ color: store.cor_primaria }} />
                                    <span className="whitespace-nowrap" title={store.endereco}>{store.endereco}</span>
                                </div>
                            </div>
                            <div className="lg:hidden flex items-center gap-3 mt-0.5">
                                <button
                                    onClick={() => {
                                        const el = document.getElementById('store-mobile-info');
                                        if (el) el.classList.toggle('hidden');
                                    }}
                                    className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100"
                                    style={{ color: store.cor_primaria }}
                                >
                                    + Ver Infos <ChevronRight size={10} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isOpenStatus.open ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <div className={`w-1 h-1 rounded-full ${isOpenStatus.open ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                            {isOpenStatus.label}
                        </div>
                        {cart.length > 0 && (
                            <button onClick={() => setIsCartOpen(true)} className="bg-primary text-white p-2.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2" style={{ backgroundColor: store.cor_primaria }}>
                                <ShoppingBag size={18} />
                                <span className="text-[10px] md:text-xs font-black">{cart.reduce((s, i) => s + i.quantidade, 0)}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Info Overlay */}
                <div id="store-mobile-info" className="fixed top-[64px] left-0 right-0 z-[49] bg-white/95 backdrop-blur-xl border-b border-gray-100 p-6 flex flex-col gap-4 shadow-2xl hidden animate-slide-down">
                    <div className="flex items-center justify-between">
                         <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Dados da Loja</h3>
                         <button onClick={() => document.getElementById('store-mobile-info')?.classList.add('hidden')} className="text-gray-300"><X size={20} /></button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-sm font-bold text-gray-800">
                             <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-primary" style={{ color: store.cor_primaria }}><Clock size={16} /></div>
                             <div className="flex flex-col">
                                 <span className="text-[9px] uppercase tracking-widest opacity-40">Horário</span>
                                 <span>{(() => {
                                        const now = new Date();
                                        const h = store.horario_funcionamento?.[DIAS_MAP[now.getDay()]];
                                        if (!h || h.closed) return 'Fechado hoje';
                                        return `${h.open} - ${h.close}`;
                                    })()}</span>
                             </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-bold text-gray-800">
                             <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-primary" style={{ color: store.cor_primaria }}><Phone size={16} /></div>
                             <div className="flex flex-col"><span className="text-[9px] uppercase tracking-widest opacity-40">WhatsApp</span><span>{store.whatsapp}</span></div>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-bold text-gray-800">
                             <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-primary" style={{ color: store.cor_primaria }}><MapPin size={16} /></div>
                             <div className="flex flex-col"><span className="text-[9px] uppercase tracking-widest opacity-40">Endereço</span><span className="leading-tight">{store.endereco}</span></div>
                        </div>
                    </div>
                </div>

                <header className="relative w-full">
                    <div className="h-24 md:h-32 w-full relative overflow-hidden" />
                    <div className="relative -mt-10 px-6 flex flex-col items-center z-20">
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-2xl bg-white overflow-hidden">
                            <img src={getImageUrl(store.logo)} alt={store.nome} className="w-full h-full object-cover" />
                        </div>
                        <div className="mt-6 text-center space-y-4 animate-slide-up w-full max-w-2xl flex flex-col items-center">
                            <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-gray-900 drop-shadow-sm bg-white/60 backdrop-blur-md py-4 px-8 rounded-3xl inline-block shadow-sm">
                                {store.nome}
                            </h1>
                        </div>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto p-6 mt-8 space-y-12">
                    {store.categorias?.map((cat, idx) => (
                        <section key={`${cat.id}-${idx}`} className="animate-slide-up" style={{ animationDelay: `${(idx + 2) * 100}ms` }}>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-[2px] flex-1 bg-gray-100"></div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: store.cor_primaria }}>{cat.nome}</h2>
                                <div className="h-[2px] flex-1 bg-gray-100"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {cat.produtos.map(prod => (
                                    <button key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white p-5 rounded-[2.5rem] shadow-sm flex gap-5 hover:shadow-2xl hover:-translate-y-2 transition-all text-left group border border-gray-50">
                                        <div className="flex-1 space-y-1">
                                            <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">{prod.nome}</h3>
                                            <p className="text-[11px] text-gray-400 line-clamp-2 h-8 leading-relaxed">{prod.descricao || 'Sem descrição cadastrada.'}</p>
                                            <p className="text-xl font-black italic tracking-tighter" style={{ color: store.cor_primaria }}>R$ {prod.preco}</p>
                                        </div>
                                        {prod.imagem ? (
                                            <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-lg border-2 border-white group-hover:rotate-3 transition-transform">
                                                <img src={getImageUrl(prod.imagem)} alt={prod.nome} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-24 h-24 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-200"><ShoppingBag size={32} /></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </main>

                <div className="fixed bottom-0 left-0 right-0 p-6 flex flex-col gap-3 pointer-events-none z-50">
                    {cart.length > 0 ? (
                        <div className="flex justify-center w-full pointer-events-auto animate-slide-up">
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="w-full max-w-md text-white px-8 py-5 rounded-[2rem] shadow-2xl flex justify-between items-center transition-all hover:scale-[1.02] active:scale-95 group"
                                style={{ backgroundColor: store.cor_primaria }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-white rounded-2xl w-8 h-8 flex items-center justify-center text-sm font-black italic shadow-lg" style={{ color: store.cor_primaria }}>
                                        {cart.reduce((s, i) => s + i.quantidade, 0)}
                                    </div>
                                    <span className="font-black uppercase italic tracking-widest text-sm">Ver Sacola</span>
                                </div>
                                <span className="font-black text-xl italic tracking-tighter">R$ {total.toFixed(2)}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center w-full pointer-events-auto animate-slide-up">
                            <button
                                onClick={() => window.open(`https://wa.me/${formatWhatsappNumber(store.whatsapp)}`)}
                                className="w-full max-w-md bg-white text-gray-900 border-b-4 px-8 py-5 rounded-[2rem] shadow-2xl flex justify-between items-center transition-all hover:scale-[1.02] active:scale-95 group font-black uppercase italic tracking-tighter text-sm"
                                style={{ borderBottomColor: store.cor_primaria }}
                            >
                                <span>Dúvidas? Chame no WhatsApp</span>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white animate-pulse"><ShoppingBag size={18} /></div>
                            </button>
                        </div>
                    )}
                </div>

                {isCartOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-end transition-all">
                        <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-slide-left rounded-l-[3rem] overflow-hidden">
                            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{view === 'cart' ? 'Sua Sacola' : 'Finalizar Pedido'}</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{view === 'cart' ? 'Confirme seus itens' : 'Informe seus dados'}</p>
                                </div>
                                <button onClick={() => { setIsCartOpen(false); setView('cart'); }} className="p-3 bg-white shadow-sm hover:bg-gray-100 rounded-full transition-all active:scale-90"><X size={28} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                {view === 'cart' ? (
                                    <>
                                        {cart.map(item => (
                                            <div key={item.id} className="flex gap-5 p-6 rounded-[2.5rem] border-2 border-gray-50 hover:border-primary/10 transition-colors relative group">
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-black text-lg text-gray-900 uppercase italic tracking-tight">{item.quantidade}x {item.nome}</h4>
                                                        <button onClick={() => removeFromCart(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><X size={20} /></button>
                                                    </div>
                                                    {item.atributos.map(a => (<p key={a.opcaoId} className="text-xs font-bold text-gray-400 mt-0.5">• {a.nome}</p>))}
                                                    <p className="font-black text-xl italic tracking-tighter mt-3" style={{ color: store.cor_primaria }}>{formatCurrency((item.precoBase + item.atributos.reduce((s, a) => s + a.preco, 0)) * item.quantidade)}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {cart.length === 0 && (
                                            <div className="text-center py-40 space-y-4 opacity-30 select-none">
                                                <ShoppingBag size={80} className="mx-auto" />
                                                <p className="text-xl font-black uppercase italic tracking-tighter">Sacola Vazia</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="space-y-6 animate-slide-up">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Seu Nome</label>
                                            <input type="text" value={checkoutData.nome} onChange={(e) => setCheckoutData({ ...checkoutData, nome: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold focus:outline-none focus:border-gray-300" placeholder="Ex: João Silva" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Telefone (WhatsApp)</label>
                                            <input type="tel" value={checkoutData.telefone} onChange={(e) => setCheckoutData({ ...checkoutData, telefone: e.target.value.replace(/\D/g, '') })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold focus:outline-none focus:border-gray-300" placeholder="Ex: 11999999999" maxLength={11} />
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-2">* Somente números com DDD</p>
                                        </div>
                                        {checkoutData.metodo_entrega === 'ENTREGA' && (
                                            <div className="space-y-4 animate-slide-up">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Endereço de Entrega</label>
                                                    <input type="text" value={checkoutData.endereco_rua} onChange={(e) => setCheckoutData({ ...checkoutData, endereco_rua: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold focus:outline-none focus:border-gray-300" placeholder="Rua / Avenida" />
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <input type="text" value={checkoutData.endereco_numero} onChange={(e) => setCheckoutData({ ...checkoutData, endereco_numero: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold focus:outline-none focus:border-gray-300" placeholder="Número" />
                                                        </div>
                                                        <div className="flex-[2]">
                                                            {store.tipo_taxa_entrega === 'BAIRRO' ? (
                                                                <select value={checkoutData.endereco_bairro} onChange={(e) => setCheckoutData({ ...checkoutData, endereco_bairro: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold focus:outline-none focus:border-gray-300 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-[size:1.25em_1.25em]">
                                                                    <option value="" disabled>Selecione seu Bairro</option>
                                                                    {store.bairros_entrega?.map(b => (
                                                                        <option key={b.id} value={b.nome}>{b.nome} - R$ {parseFloat(b.taxa).toFixed(2)}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input type="text" value={checkoutData.endereco_bairro} onChange={(e) => setCheckoutData({ ...checkoutData, endereco_bairro: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold focus:outline-none focus:border-gray-300" placeholder="Bairro" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="h-px bg-gray-100 w-full my-4"></div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Como vai querer receber?</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {['ENTREGA', 'RETIRADA'].map((method) => (
                                                    <button
                                                        key={method}
                                                        onClick={() => setCheckoutData({ ...checkoutData, metodo_entrega: method as DeliveryMethod })}
                                                        className={`p-4 rounded-2xl font-black text-sm uppercase tracking-wide transition-all border-2 ${checkoutData.metodo_entrega === method ? 'bg-blue-900 text-white border-blue-900 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                                                    >
                                                        {method === 'ENTREGA' ? 'Receber em Casa' : 'Retirar na Loja'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Forma de Pagamento</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {['DINHEIRO', 'DEBITO', 'CREDITO', 'PIX'].map((method) => (
                                                    <button key={method} onClick={() => setCheckoutData({ ...checkoutData, pagamento: method as PaymentMethod })} className={`p-4 rounded-2xl font-black text-sm uppercase tracking-wide transition-all border-2 ${checkoutData.pagamento === method ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>
                                                        {method}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {checkoutData.pagamento === 'DINHEIRO' && (
                                            <div className="space-y-2 animate-slide-up">
                                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Troco para quanto?</label>
                                                <input type="text" value={checkoutData.troco} onChange={(e) => setCheckoutData({ ...checkoutData, troco: e.target.value.replace(/[^0-9.,]/g, '') })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold focus:outline-none focus:border-gray-300" placeholder="Ex: 50.00" />
                                            </div>
                                        )}
                                        <div className="bg-blue-50 p-6 rounded-[2rem] space-y-2 mt-4">
                                            <div className="flex justify-between text-gray-500 text-sm font-bold"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
                                            <div className="flex justify-between text-gray-500 text-sm font-bold"><span>Taxa de Entrega</span><span>{checkoutData.metodo_entrega === 'ENTREGA' ? (deliveryFee > 0 ? formatCurrency(deliveryFee) : (store.tipo_taxa_entrega === 'BAIRRO' && !checkoutData.endereco_bairro ? 'A calcular' : 'Grátis')) : 'Grátis'}</span></div>
                                            <div className="h-[1px] bg-blue-100 my-2"></div>
                                            <div className="flex justify-between text-2xl font-black text-blue-900"><span>Total</span><span>{formatCurrency(grandTotal)}</span></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-8 bg-gray-50/80 backdrop-blur border-t space-y-6">
                                {view === 'cart' ? (
                                    <>
                                        <div className="flex justify-between items-end">
                                            <span className="font-black text-xs text-gray-400 uppercase tracking-widest">Valor do Pedido</span>
                                            <span className="font-black text-4xl italic tracking-tighter" style={{ color: store.cor_primaria }}>{formatCurrency(total)}</span>
                                        </div>
                                        <button onClick={() => setView('checkout')} disabled={cart.length === 0} className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black text-xl italic uppercase tracking-tighter shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none">CONTINUAR</button>
                                    </>
                                ) : (
                                    <div className="flex gap-4">
                                        <button onClick={() => setView('cart')} className="px-6 py-6 bg-white text-gray-900 border-2 border-gray-200 rounded-[2rem] font-black text-lg shadow-sm hover:bg-gray-50 transition-all uppercase tracking-tight">Voltar</button>
                                        <button onClick={handleSubmitOrder} disabled={isSubmitting} className="flex-1 py-6 bg-green-500 text-white rounded-[2rem] font-black text-xl italic uppercase tracking-tighter shadow-xl shadow-green-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70">{isSubmitting ? 'ENVIANDO...' : 'ENVIAR PEDIDO'}</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {selectedProduct && (
                    <ProductModal
                        isOpen={!!selectedProduct}
                        product={selectedProduct}
                        storeColor={store.cor_primaria}
                        modoCatalogo={false}
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
