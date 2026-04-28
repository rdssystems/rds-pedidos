import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface SocketContextType {
    lastMessage: any;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const [lastMessage, setLastMessage] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        let socket: WebSocket | null = null;
        let timeoutId: any = null;

        const connect = () => {
            const storeId = localStorage.getItem('activeStoreId');
            if (!storeId) {
                console.log('Socket: No activeStoreId found, waiting...');
                timeoutId = setTimeout(connect, 2000);
                return;
            }

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const clientWhatsapp = localStorage.getItem('client_whatsapp');
            
            // Use the loja-specific endpoint to get notifications for this store
            let socketUrl = `${protocol}//${host}/ws/loja/${storeId}/`;
            if (clientWhatsapp) {
                socketUrl += `?whatsapp=${clientWhatsapp}`;
            }

            console.log(`Socket: Connecting to ${socketUrl}`);
            socket = new WebSocket(socketUrl);

            socket.onopen = () => {
                console.log('WebSocket Connected to store:', storeId);
                setIsConnected(true);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('WebSocket Message Received:', data);
                    // Standardize message format if needed, here we just pass the message object
                    setLastMessage(data);
                } catch (e) {
                    console.error('Error parsing socket message:', e);
                }
            };

            socket.onclose = (e) => {
                console.log('WebSocket Disconnected. Reconnecting in 3s...', e.reason);
                setIsConnected(false);
                timeoutId = setTimeout(connect, 3000);
            };

            socket.onerror = (error) => {
                console.error('WebSocket Error:', error);
                if (socket) socket.close();
            };
        };

        connect();

        return () => {
            if (socket) socket.close();
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    return (
        <SocketContext.Provider value={{ lastMessage, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
