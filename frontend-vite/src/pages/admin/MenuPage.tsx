import React, { useState, useEffect } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    Image as ImageIcon,
    LayoutGrid,
    List,
    Layers,
    UtensilsCrossed,
    ShoppingBag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CategoryModal } from '../../components/admin/CategoryModal';
import { ProductModalAdmin } from '../../components/admin/ProductModalAdmin';

interface Product {
    id: number;
    nome: string;
    preco: string;
    descricao: string;
    imagem: string | null;
    disponivel: boolean;
    controlar_estoque: boolean;
    estoque_atual: number;
}

interface Category {
    id: number;
    nome: string;
    produtos: Product[];
}

export default function MenuPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [targetCategoryId, setTargetCategoryId] = useState<number | undefined>(undefined);

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('backend:8000')) {
            return url.split('backend:8000')[1];
        }
        return url;
    };

    const fetchMenu = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/lojas/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.length > 0) {
                setCategories(data[0].categorias || []);
            }
        } catch (error) {
            console.error('Error fetching menu:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, []);

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir esta categoria e todos os seus produtos?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/categorias/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) fetchMenu();
        } catch (err) { console.error(err); }
    };

    const handleDeleteProduct = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/produtos/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) fetchMenu();
        } catch (err) { console.error(err); }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Gestor de Cardápio</h1>
                        <p className="text-gray-500 text-sm">Organize seus produtos e categorias</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            to="/menu/addons"
                            className="bg-white text-gray-700 border border-gray-200 px-6 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md hover:text-primary transition-all flex items-center gap-2"
                        >
                            <Layers size={20} />
                            <span>Adicionais</span>
                        </Link>
                        <button
                            onClick={() => { setSelectedCategory(null); setIsCategoryModalOpen(true); }}
                            className="bg-primary text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 flex-1 md:flex-none"
                        >
                            <Plus size={20} />
                            <span>Nova Categoria</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-10">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400">Carregando cardápio...</div>
                ) : categories.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 shadow-xl text-white space-y-6 relative overflow-hidden group">
                            <UtensilsCrossed size={40} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Seu cardápio está vazio</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">Comece criando uma categoria para organizar seus produtos.</p>
                        <button
                            onClick={() => { setSelectedCategory(null); setIsCategoryModalOpen(true); }}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-bold"
                        >
                            Criar Primeira Categoria
                        </button>
                    </div>
                ) : (
                    categories.map((cat) => (
                        <section key={cat.id} className="space-y-6">
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black text-gray-900 italic uppercase tracking-tight">{cat.nome}</h2>
                                    <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                        {cat.produtos.length} Itens
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-xl backdrop-blur-sm">
                                    <button
                                        onClick={() => { setSelectedCategory(cat); setIsCategoryModalOpen(true); }}
                                        className="p-2 text-gray-400 hover:text-primary transition-colors hover:bg-white rounded-lg"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors hover:bg-white rounded-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => { setSelectedProduct(null); setTargetCategoryId(cat.id); setIsProductModalOpen(true); }}
                                        className="bg-white border border-gray-200 p-2 text-primary rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm hover:shadow-md transition-all"
                                    >
                                        <Plus size={14} /> ADICIONAR PRODUTO
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {cat.produtos.map((prod) => (
                                    <div key={prod.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group relative">
                                        {/* Product Image */}
                                        <div className="h-40 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                                            {prod.imagem ? (
                                                <img src={getImageUrl(prod.imagem)} alt={prod.nome} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="text-gray-300" size={40} />
                                            )}
                                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleDeleteProduct(prod.id)}
                                                    className="bg-white/90 backdrop-blur p-2 rounded-xl text-red-500 shadow-lg"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                            <div className="absolute bottom-3 left-3 flex gap-2">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm ${prod.disponivel ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                    {prod.disponivel ? 'Disponível' : 'Esgotado'}
                                                </span>
                                                {prod.controlar_estoque && (
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm ${prod.estoque_atual > 0 ? 'bg-blue-500 text-white' : 'bg-red-500 text-white animate-pulse'}`}>
                                                        {prod.estoque_atual} un
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Product Info */}
                                        <div className="p-5 space-y-3">
                                            <div className="flex flex-col gap-0.5">
                                                <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">{prod.nome}</h4>
                                                <p className="font-black text-primary text-sm">R$ {prod.preco}</p>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2 h-8">{prod.descricao || 'Sem descrição cadastrada.'}</p>

                                            <div className="pt-4 border-t border-gray-50 flex items-center justify-end">
                                                <button
                                                    onClick={() => { setSelectedProduct(prod); setIsProductModalOpen(true); }}
                                                    className="text-xs font-bold text-gray-400 hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-wider"
                                                >
                                                    Editar <Edit2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => { setSelectedProduct(null); setTargetCategoryId(cat.id); setIsProductModalOpen(true); }}
                                    className="border-2 border-dashed border-gray-200 rounded-xl h-[288px] flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                        <Plus size={24} />
                                    </div>
                                    <span className="font-bold text-sm uppercase tracking-widest">Novo Produto</span>
                                </button>
                            </div>
                        </section>
                    ))
                )}
            </main>

            {/* Modals */}
            <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSuccess={fetchMenu}
                category={selectedCategory}
            />

            <ProductModalAdmin
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onSuccess={fetchMenu}
                product={selectedProduct}
                categories={categories}
                initialCategoryId={targetCategoryId}
            />

            {/* Floating Navigation (Mobile Only) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around md:hidden z-40">
                <Link to="/dashboard" className="flex flex-col items-center gap-1 text-gray-400">
                    <LayoutGrid size={24} />
                    <span className="text-[10px] font-bold">Início</span>
                </Link>
                <Link to="/orders" className="flex flex-col items-center gap-1 text-gray-400">
                    <ShoppingBag size={24} />
                    <span className="text-[10px] font-bold">Pedidos</span>
                </Link>
                <Link to="/menu" className="flex flex-col items-center gap-1 text-primary">
                    <List size={24} />
                    <span className="text-[10px] font-bold">Cardápio</span>
                </Link>
            </nav>
        </div>
    );
}
