import React from 'react';
import { ShoppingBag, Plus } from 'lucide-react';

interface Product {
    id: number;
    nome: string;
    descricao: string;
    preco: string;
    imagem: string | null;
}

interface PublicProductCardProps {
    product: Product;
    accentColor: string;
    onClick: () => void;
    getImageUrl: (url: string | null) => string;
}

export const PublicProductCard: React.FC<PublicProductCardProps> = ({ 
    product, 
    accentColor, 
    onClick,
    getImageUrl
}) => {
    return (
        <button 
            onClick={onClick}
            className="w-full bg-white px-5 py-4 rounded-lg border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-300 text-left group flex items-center gap-5"
        >
            {/* Left side: Info */}
            <div className="flex-1 min-w-0">
                <div className="mb-1.5">
                    <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors text-base md:text-lg tracking-tight leading-tight">
                        {product.nome}
                    </h3>
                    {product.descricao && (
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-normal mt-1">
                            {product.descricao}
                        </p>
                    )}
                </div>
                
                <div className="flex items-center gap-3 mt-2">
                    <p className="text-lg font-bold tracking-tight text-gray-900">
                        R$ {product.preco}
                    </p>
                    <div className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Preço base
                    </div>
                </div>
            </div>
            
            {/* Right side: Image */}
            <div className="relative shrink-0 w-24 h-24 md:w-28 md:h-28">
                {product.imagem ? (
                    <div className="w-full h-full rounded-md overflow-hidden bg-gray-50 border border-gray-100">
                        <img 
                            src={getImageUrl(product.imagem)} 
                            alt={product.nome} 
                            className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" 
                        />
                    </div>
                ) : (
                    <div className="w-full h-full rounded-md bg-gray-50 flex items-center justify-center text-gray-300 border border-dashed border-gray-200">
                        <ShoppingBag size={24} strokeWidth={1.5} />
                    </div>
                )}
                
                {/* Floating Add Badge - More subtle */}
                <div 
                    className="absolute -bottom-1 -left-1 w-8 h-8 rounded-md shadow-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                    style={{ backgroundColor: accentColor || '#007A87' }}
                >
                    <Plus size={16} strokeWidth={3} />
                </div>
            </div>
        </button>
    );
};
