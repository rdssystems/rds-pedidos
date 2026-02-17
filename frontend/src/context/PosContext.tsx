'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';

// Types
interface Caixa {
    id: number;
    saldo_inicial: string;
    status: 'ABERTO' | 'FECHADO';
}

interface CartItem {
    produtoId: number;
    uuid: string; // Unique ID for cart item (handle same product different addons)
    nome: string;
    precoUnitario: number;
    quantidade: number;
    total: number;
}

interface PosContextType {
    caixa: Caixa | null;
    isLoading: boolean;
    cart: CartItem[];
    total: number;
    products: any[];
    abrirCaixa: (saldoInicial: number) => Promise<void>;
    fecharCaixa: (saldoFinal: number) => Promise<void>;
    refreshCaixa: () => Promise<void>;
    refreshProducts: () => Promise<void>;
    addToCart: (product: any) => void;
    removeFromCart: (uuid: string) => void;
    clearCart: () => void;
    checkout: (paymentMethod: string, amountPaid: number, cliente?: any) => Promise<any>;
    loadTableOrders: (mesaNum: number) => Promise<void>;
}

const PosContext = createContext<PosContextType>({} as PosContextType);

export const PosProvider = ({ children }: { children: React.ReactNode }) => {
    const [caixa, setCaixa] = useState<Caixa | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [activeMesaOrders, setActiveMesaOrders] = useState<number[]>([]);
    const [activeMesaNum, setActiveMesaNum] = useState<number | null>(null);

    const total = cart.reduce((acc, item) => acc + item.total, 0);

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/produtos/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchCaixa = async () => {
        try {
            // Get current store from URL or Context (Assuming user has one store for now or store_id is stored)
            // Ideally we get store_id from a higher context or user profile
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);
            // This is a simplification. In real app, we need to know WHICH store the user is operating.
            // For MVP, lets assume the first store of the user or pass it as prop.
            // We will fetch based on the logged user's active shift

            // We need a way to get the Current Store ID. 
            // For now, let's try to fetch without store_id first (if backend supports) 
            // OR fetch user's stores and use the first one.

            // BETTER: The backend 'status' endpoint needs loja_id.
            // Let's assume we store 'activeStoreId' in localStorage or similar.
            let storeId = localStorage.getItem('activeStoreId');
            if (!storeId) {
                // Fallback: derive from user object
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userData = JSON.parse(userStr);
                    if (userData.roles?.length > 0) {
                        storeId = String(userData.roles[0].id);
                        localStorage.setItem('activeStoreId', storeId);
                    }
                }
            }

            if (!storeId) {
                setIsLoading(false);
                return;
            }

            const token = localStorage.getItem('token');

            // Parallel fetch
            fetchProducts();

            const res = await fetch(`/api/caixa/status/?loja_id=${storeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setCaixa(data); // might be null if no open shift
            } else {
                setCaixa(null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCaixa();
    }, []);

    const { lastMessage } = useSocket();

    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'stock_update') {
            const { id, estoque_atual, disponivel } = lastMessage.message || lastMessage;
            setProducts(prev => prev.map(p =>
                p.id === id ? { ...p, estoque_atual, disponivel } : p
            ));
        }

        if (lastMessage.type === 'order_update') {
            // Se necessário, atualizar caixa/mesas
        }
    }, [lastMessage]);

    const abrirCaixa = async (saldoInicial: number) => {
        let storeId = localStorage.getItem('activeStoreId');
        if (!storeId) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userData = JSON.parse(userStr);
                if (userData.roles?.length > 0) {
                    storeId = String(userData.roles[0].id);
                    localStorage.setItem('activeStoreId', storeId);
                }
            }
        }

        if (!storeId) throw new Error("Loja não selecionada");

        const token = localStorage.getItem('token');
        const res = await fetch('/api/caixa/abrir/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ loja_id: storeId, saldo_inicial: saldoInicial })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao abrir caixa');
        }

        const data = await res.json();
        setCaixa(data);
    };

    const fecharCaixa = async (saldoFinal: number) => {
        if (!caixa) return;

        const token = localStorage.getItem('token');
        const res = await fetch(`/api/caixa/${caixa.id}/fechar/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ saldo_final: saldoFinal })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao fechar caixa');
        }

        setCaixa(null);
    };

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(p => p.produtoId === product.id);
            if (existing) {
                return prev.map(p => p.produtoId === product.id
                    ? { ...p, quantidade: p.quantidade + 1, total: (p.precoUnitario * (p.quantidade + 1)) }
                    : p
                );
            }
            return [...prev, {
                produtoId: product.id,
                uuid: crypto.randomUUID(),
                nome: product.nome,
                precoUnitario: parseFloat(product.preco),
                quantidade: 1,
                total: parseFloat(product.preco)
            }];
        });
    };

    const removeFromCart = (uuid: string) => {
        setCart(prev => prev.filter(p => p.uuid !== uuid));
    };

    const clearCart = () => setCart([]);

    const checkout = async (paymentMethod: string, amountPaid: number, cliente: any = null) => {
        if (!caixa) throw new Error("Caixa fechado");
        const storeId = localStorage.getItem('activeStoreId');
        const token = localStorage.getItem('token');

        const payload = {
            caixa: caixa.id,
            forma_pagamento: paymentMethod,
            valor: total,
            total_pago: amountPaid,
            mesa_orders: activeMesaOrders,
            itens: cart.map(item => ({
                produto: item.produtoId,
                quantidade: item.quantidade,
                preco_unitario: item.precoUnitario,
                selecoes: []
            })),
            cliente_nome: cliente?.nome || (activeMesaNum ? `Mesa ${activeMesaNum}` : 'Consumidor Final'),
            cliente_whatsapp: cliente?.whatsapp || ''
        };

        const res = await fetch('/api/caixa/venda/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Erro ao processar venda');
        }

        const data = await res.json();
        setActiveMesaOrders([]);
        setActiveMesaNum(null);
        clearCart();
        return data;
    };

    const loadTableOrders = async (mesaNum: number) => {
        setActiveMesaNum(mesaNum);
        const storeId = localStorage.getItem('activeStoreId');
        const token = localStorage.getItem('token');

        // Fetch all non-finalized orders for this mesa
        const res = await fetch(`/api/pedidos/?loja_id=${storeId}&mesa=${mesaNum}&status__in=NOVO,PREPARO,DESPACHADO`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const orders = await res.json();
            const results = orders.results || orders;

            // Consolidate all items from all orders of this table
            const tableItems: CartItem[] = [];
            results.forEach((order: any) => {
                order.itens.forEach((item: any) => {
                    tableItems.push({
                        produtoId: item.produto,
                        uuid: crypto.randomUUID(),
                        nome: item.produto_obj?.nome || 'Produto',
                        precoUnitario: parseFloat(item.preco_unitario),
                        quantidade: item.quantidade,
                        total: parseFloat(item.preco_unitario) * item.quantidade
                    });
                });
            });

            setCart(tableItems);
            setActiveMesaOrders(results.map((o: any) => o.id));
        }
    };

    return (
        <PosContext.Provider value={{
            caixa, isLoading, cart, total, products,
            abrirCaixa, fecharCaixa, refreshCaixa: fetchCaixa, refreshProducts: fetchProducts,
            addToCart, removeFromCart, clearCart, checkout, loadTableOrders
        }}>
            {children}
        </PosContext.Provider>
    );
};

export const usePos = () => useContext(PosContext);
