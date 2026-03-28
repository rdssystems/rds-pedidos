import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartItem {
    id: string; // Unique ID for this specific selection (product + attributes)
    productId: number;
    nome: string;
    precoBase: number;
    quantidade: number;
    atributos: {
        grupoId: number;
        grupoNome: string;
        opcaoId: number;
        nome: string;
        preco: number;
    }[];
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (id: string) => void;
    updateQuantidade: (id: string, delta: number) => void;
    clearCart: () => void;
    total: number;
    setStoreId: (id: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [storeId, setStoreIdState] = useState<number | null>(null);

    // Initial load from localStorage when storeId is set
    const setStoreId = React.useCallback((id: number) => {
        setStoreIdState(prev => {
            if (id === prev) return prev;
            
            const saved = localStorage.getItem(`cart_store_${id}`);
            if (saved) {
                try {
                    setCart(JSON.parse(saved));
                } catch (e) {
                    setCart([]);
                }
            } else {
                setCart([]);
            }
            return id;
        });
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (storeId !== null) {
            localStorage.setItem(`cart_store_${storeId}`, JSON.stringify(cart));
        }
    }, [cart, storeId]);

    const addToCart = React.useCallback((newItem: CartItem) => {
        setCart(prev => {
            const existingIndex = prev.findIndex(item => item.id === newItem.id);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex].quantidade += newItem.quantidade;
                return updated;
            }
            return [...prev, newItem];
        });
    }, []);

    const removeFromCart = React.useCallback((id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    }, []);

    const updateQuantidade = React.useCallback((id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const nq = Math.max(1, item.quantidade + delta);
                return { ...item, quantidade: nq };
            }
            return item;
        }));
    }, []);

    const clearCart = React.useCallback(() => {
        setCart([]);
        if (storeId) localStorage.removeItem(`cart_store_${storeId}`);
    }, [storeId]);

    const totalArr = cart.reduce((acc, item) => {
        const precoAtributos = item.atributos.reduce((sum, attr) => sum + attr.preco, 0);
        return acc + (item.precoBase + precoAtributos) * item.quantidade;
    }, 0);

    const value = React.useMemo(() => ({
        cart,
        addToCart,
        removeFromCart,
        updateQuantidade,
        clearCart,
        total: totalArr,
        setStoreId
    }), [cart, addToCart, removeFromCart, updateQuantidade, clearCart, totalArr, setStoreId]);

    return (
        <CartContext.Provider value={value}>
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
