import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-24 bg-secondary">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <h1 className="text-4xl font-bold text-primary mb-8">
                    Bem-vindo ao Cardápio Digital White-Label
                </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-xl font-semibold mb-2 text-accent">Lanches</h2>
                    <p className="text-gray-600">Explore as melhores opções de burgers.</p>
                    <Link to="/login" className="mt-4 px-4 py-2 bg-primary text-white rounded-lg w-full font-medium inline-block text-center">
                        Acessar Sistema
                    </Link>
                </div>
            </div>

            <div className="mt-12 p-4 bg-gray-100 rounded-lg text-center">
                <p className="text-sm text-gray-500">
                    Esta é uma versão migrada para Vite + React SPA.
                </p>
            </div>
        </main>
    );
}
