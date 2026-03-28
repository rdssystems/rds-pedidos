import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Customer {
    name: string;
    phone: string;
    address_rua?: string;
    address_numero?: string;
    address_bairro?: string;
}

interface CustomerContextType {
    customer: Customer | null;
    loginCustomer: (name: string, phone: string, address?: Partial<Customer>) => void;
    updateCustomer: (data: Partial<Customer>) => void;
    logoutCustomer: () => void;
    isAuthenticated: boolean;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
    const [customer, setCustomer] = useState<Customer | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('public_customer');
        if (saved) {
            try {
                setCustomer(JSON.parse(saved));
            } catch (e) {
                localStorage.removeItem('public_customer');
            }
        }
    }, []);

    const loginCustomer = React.useCallback((name: string, phone: string, address?: Partial<Customer>) => {
        const newCustomer = { name, phone, ...address };
        setCustomer(newCustomer);
        localStorage.setItem('public_customer', JSON.stringify(newCustomer));
    }, []);

    const updateCustomer = React.useCallback((data: Partial<Customer>) => {
        setCustomer(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...data };
            localStorage.setItem('public_customer', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const logoutCustomer = React.useCallback(() => {
        setCustomer(null);
        localStorage.removeItem('public_customer');
    }, []);

    const isAuthenticated = !!customer;

    const value = React.useMemo(() => ({
        customer,
        loginCustomer,
        updateCustomer,
        logoutCustomer,
        isAuthenticated
    }), [customer, loginCustomer, updateCustomer, logoutCustomer, isAuthenticated]);

    return (
        <CustomerContext.Provider value={value}>
            {children}
        </CustomerContext.Provider>
    );
};

export const useCustomer = () => {
    const context = useContext(CustomerContext);
    if (context === undefined) {
        throw new Error('useCustomer must be used within a CustomerProvider');
    }
    return context;
};
