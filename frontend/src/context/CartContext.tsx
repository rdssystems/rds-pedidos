'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CartItem {
    id: string; // Unique ID for this specific selection (product + attributes)
    productId: number;
    nome: string;
    precoBase: number;
    quantidade: number;
    atributos: {
        grupoId: number;
        opcaoId: number;
        nome: string;
        preco: number;
    }[];
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cart, setCart] = useState<CartItem[]>([]);

    const addToCart = (newItem: CartItem) => {
        setCart(prev => {
            const existingIndex = prev.findIndex(item => item.id === newItem.id);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex].quantidade += newItem.quantidade;
                return updated;
            }
            return [...prev, newItem];
        });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const clearCart = () => setCart([]);

    const total = cart.reduce((acc, item) => {
        const precoAtributos = item.atributos.reduce((sum, attr) => sum + attr.preco, 0);
        return acc + (item.precoBase + precoAtributos) * item.quantidade;
    }, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
