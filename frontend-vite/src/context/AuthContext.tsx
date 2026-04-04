import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface Role {
    id: number;
    store_slug: string;
    store_name: string;
    role: 'owner' | 'manager' | 'waiter' | 'kitchen' | 'driver';
}

interface User {
    username: string;
    email: string;
    first_name: string;
    roles: Role[];
}

interface AuthContextType {
    user: User | null;
    login: (token: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchUser = async (token: string) => {
        try {
            const response = await fetch('/api/users/me/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));

                // Also set/validate activeStoreId
                const roles = userData.roles || [];
                const currentActiveStoreId = localStorage.getItem('activeStoreId');
                
                // Check if current stored ID is valid for this user
                const isValidStore = roles.some((r: any) => String(r.id) === String(currentActiveStoreId));
                
                if (!isValidStore && roles.length > 0) {
                    const firstStoreId = roles[0]?.id;
                    if (firstStoreId) {
                        localStorage.setItem('activeStoreId', String(firstStoreId));
                    }
                } else if (!currentActiveStoreId && roles.length > 0) {
                    const firstStoreId = roles[0]?.id;
                    localStorage.setItem('activeStoreId', String(firstStoreId));
                }

                return userData;
            } else {
                logout();
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            logout();
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
            // Validate/Refresh user data in background
            fetchUser(token);
        }
        setLoading(false);
    }, []);

    const login = async (token: string) => {
        setLoading(true);
        localStorage.setItem('token', token);
        await fetchUser(token);
        setLoading(false);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('activeStoreId');
        navigate('/login');
    };

    const refreshUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            await fetchUser(token);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
