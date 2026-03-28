import React from 'react';

interface Category {
    id: number;
    nome: string;
}

interface CategorySidebarProps {
    categories: Category[];
    activeCategory: number | null;
    onCategoryClick: (id: number) => void;
    accentColor: string;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({ 
    categories, 
    activeCategory, 
    onCategoryClick,
    accentColor
}) => {
    return (
        <aside className="hidden md:block w-64 sticky top-24 self-start h-[calc(100vh-120px)] overflow-y-auto pr-4 custom-scrollbar">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 ml-4">Categorias</h3>
            <nav className="space-y-1">
                {categories.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => onCategoryClick(cat.id)}
                            className={`w-full text-left px-5 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-between group relative overflow-hidden ${
                                isActive 
                                ? 'bg-white shadow-sm ring-1 ring-gray-100' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                            }`}
                        >
                            <span className={isActive ? 'text-primary' : ''}>{cat.nome}</span>
                            
                            {/* Active Indicator: Vertical Bar */}
                            <div 
                                className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-r-sm transition-all duration-300 ${
                                    isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
                                }`}
                                style={{ backgroundColor: accentColor || '#007A87' }}
                            />
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
};
