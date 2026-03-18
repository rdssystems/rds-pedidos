'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Bot, ShoppingBag } from 'lucide-react';

export default function IntegrationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const tabs = [
        { name: 'WhatsApp', href: '/integrations/whatsapp', icon: MessageSquare, disabled: false },
        { name: 'Robô de IA', href: '/integrations/ai-bot', icon: Bot, disabled: false },
        { name: 'iFood', href: '/integrations/ifood', icon: ShoppingBag, disabled: true },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">Integrações</h1>
                <p className="text-gray-500 font-medium">Gerencie as conexões externas da sua loja.</p>
            </div>

            {/* Horizontal Tabs */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-2">
                {tabs.map((tab) => {
                    if (tab.disabled) {
                        return (
                            <button
                                key={tab.name}
                                onClick={() => alert(`A integração com ${tab.name} estará disponível em breve!`)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-gray-400 bg-gray-50 opacity-70 cursor-not-allowed hover:bg-gray-100"
                            >
                                <tab.icon size={18} />
                                <span>{tab.name}</span>
                                <span className="ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-100 text-orange-600">Em Breve</span>
                            </button>
                        );
                    }

                    const isActive = pathname.startsWith(tab.href);
                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
                                isActive 
                                ? 'bg-primary text-white shadow-md' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <tab.icon size={18} />
                            <span>{tab.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Tab Content Area */}
            <div className="animate-fade-in-up">
                {children}
            </div>
        </div>
    );
}
