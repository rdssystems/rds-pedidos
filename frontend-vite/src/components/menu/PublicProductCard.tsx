import React from 'react';
import { ShoppingBag, Plus } from 'lucide-react';

interface Product {
    id: number;
    nome: string;
    descricao: string;
    preco: string;
    imagem: string | null;
    controlar_estoque?: boolean;
    estoque_atual?: number;
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
    // Check if product is out of stock
    const isOutOfStock = product.controlar_estoque && product.estoque_atual !== undefined && product.estoque_atual !== null && Number(product.estoque_atual) <= 0;

    return (
        <button 
            onClick={isOutOfStock ? undefined : onClick}
            disabled={isOutOfStock}
            className={`w-full bg-white px-5 py-4 rounded-lg border border-gray-200 text-left flex items-center gap-5 transition-all duration-300 ${
                isOutOfStock 
                ? 'opacity-60 cursor-not-allowed grayscale' 
                : 'hover:border-primary/30 hover:shadow-md group cursor-pointer'
            }`}
        >
            {/* Left side: Info */}
            <div className="flex-1 min-w-0">
                <div className="mb-1.5 flex justify-between items-start gap-2">
                    <h3 className={`font-bold text-base md:text-lg tracking-tight leading-tight ${isOutOfStock ? 'text-gray-500' : 'text-gray-900 group-hover:text-primary transition-colors'}`}>
                        {product.nome}
                    </h3>
                    {isOutOfStock && (
                        <div className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase tracking-widest shrink-0">
                            Esgotado
                        </div>
                    )}
                </div>
                {product.descricao && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-normal mt-1">
                        {product.descricao}
                    </p>
                )}
                
                <div className="flex items-center gap-3 mt-2">
                    <p className={`text-lg font-bold tracking-tight ${isOutOfStock ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        R$ {product.preco}
                    </p>
                    {!isOutOfStock && (
                        <div className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold uppercase tracking-wider text-gray-400">
                            Preço base
                        </div>
                    )}
                </div>
            </div>
            
            {/* Right side: Image */}
            <div className="relative shrink-0 w-24 h-24 md:w-28 md:h-28">
                {product.imagem ? (
                    <div className="w-full h-full rounded-md overflow-hidden bg-gray-50 border border-gray-100">
                        <img 
                            src={getImageUrl(product.imagem)} 
                            alt={product.nome} 
                            className={`w-full h-full object-cover transition-all duration-500 ${isOutOfStock ? 'grayscale opacity-70' : 'grayscale-[0.2] group-hover:grayscale-0'}`} 
                        />
                    </div>
                ) : (
                    <div className="w-full h-full rounded-md bg-gray-50 flex items-center justify-center text-gray-300 border border-dashed border-gray-200">
                        <ShoppingBag size={24} strokeWidth={1.5} />
                    </div>
                )}
                
                {/* Floating Add Badge - Only show if not out of stock */}
                {!isOutOfStock && (
                    <div 
                        className="absolute -bottom-1 -left-1 w-8 h-8 rounded-md shadow-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                        style={{ backgroundColor: accentColor || '#007A87' }}
                    >
                        <Plus size={16} strokeWidth={3} />
                    </div>
                )}
            </div>
        </button>
    );
};
