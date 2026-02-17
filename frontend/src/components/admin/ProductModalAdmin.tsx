'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, ImageIcon, Upload, Check } from 'lucide-react';

interface ProductModalAdminProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product?: any | null;
    categories: { id: number; nome: string }[];
    initialCategoryId?: number;
}

export const ProductModalAdmin = ({ isOpen, onClose, onSuccess, product, categories, initialCategoryId }: ProductModalAdminProps) => {
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [preco, setPreco] = useState('');
    const [categoriaId, setCategoriaId] = useState<number | string>('');
    const [disponivel, setDisponivel] = useState(true);
    const [controlarEstoque, setControlarEstoque] = useState(false);
    const [estoqueAtual, setEstoqueAtual] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Addons State
    const [addons, setAddons] = useState<any[]>([]);
    const [selectedAddons, setSelectedAddons] = useState<number[]>([]);

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (typeof url !== 'string') return url;
        if (url.includes('backend:8000')) {
            return url.split('backend:8000')[1];
        }
        return url;
    };

    // Fetch Addons
    useEffect(() => {
        const fetchAddons = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch('/api/atributos/', { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                setAddons(data);
            } catch (err) { console.error("Error fetching addons:", err); }
        };
        if (isOpen) fetchAddons();
    }, [isOpen]);

    useEffect(() => {
        if (product) {
            setNome(product.nome);
            setDescricao(product.descricao || '');
            setPreco(product.preco);
            setCategoriaId(product.categoria || '');
            setDisponivel(product.disponivel);
            setControlarEstoque(product.controlar_estoque || false);
            setEstoqueAtual(product.estoque_atual || 0);
            setImagePreview(product.imagem);

            // Sync selected addons
            if (product.grupos_atributos && Array.isArray(product.grupos_atributos)) {
                // If populated objects, map to ID. If IDs, just use.
                const ids = product.grupos_atributos.map((g: any) => typeof g === 'object' ? g.id : g);
                setSelectedAddons(ids);
            } else {
                setSelectedAddons([]);
            }
        } else {
            setDescricao('');
            setPreco('');
            setControlarEstoque(false);
            setEstoqueAtual('');
            setCategoriaId(initialCategoryId || '');
            setDisponivel(true);
            setImagePreview(null);
            setSelectedAddons([]);
        }
        setImageFile(null);
    }, [product, isOpen, initialCategoryId]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const url = product ? `/api/produtos/${product.id}/` : '/api/produtos/';
            const method = product ? 'PATCH' : 'POST';

            const formData = new FormData();
            formData.append('nome', nome);
            formData.append('descricao', descricao);
            formData.append('preco', preco);
            formData.append('categoria', String(categoriaId));
            formData.append('disponivel', String(disponivel));
            formData.append('controlar_estoque', String(controlarEstoque));
            formData.append('estoque_atual', String(estoqueAtual || 0));

            // Append Addons (Many-to-Many via FormData needs multiple entries with same key)
            selectedAddons.forEach(id => {
                formData.append('grupos_atributos', String(id));
            });

            if (imageFile) {
                formData.append('imagem', imageFile);
            }

            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            if (response.ok) {
                onSuccess();
                onClose();
            } else {
                const data = await response.json();
                setError(JSON.stringify(data) || 'Erro ao salvar produto');
            }
        } catch (err: any) {
            setError(err.message || 'Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                            {product ? 'Editar Produto' : 'Novo Produto'}
                        </h2>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Detalhes do item</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {error && (
                        <div className="col-span-full bg-red-50 text-red-500 p-4 rounded-2xl text-sm flex items-center gap-2">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nome do Produto</label>
                            <input
                                type="text"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all font-bold"
                                placeholder="Ex: Pizza de Calabresa"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Categoria</label>
                            <select
                                value={categoriaId}
                                onChange={(e) => setCategoriaId(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all font-bold appearance-none cursor-pointer"
                                required
                            >
                                <option value="">Selecionar Categoria</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Preço (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={preco}
                                    onChange={(e) => setPreco(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all font-black text-primary"
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Status</label>
                                <div
                                    onClick={() => setDisponivel(!disponivel)}
                                    className={`w-full h-[60px] rounded-2xl flex items-center justify-center cursor-pointer transition-all border-2 ${disponivel
                                        ? 'bg-green-50 border-green-100 text-green-600'
                                        : 'bg-red-50 border-red-100 text-red-600'
                                        }`}
                                >
                                    <span className="font-black uppercase text-[10px] tracking-widest">
                                        {disponivel ? 'Disponível' : 'Esgotado'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Inventory Section */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${controlarEstoque ? 'bg-primary' : 'bg-gray-200'}`}
                                    onClick={() => setControlarEstoque(!controlarEstoque)}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${controlarEstoque ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest cursor-pointer select-none" onClick={() => setControlarEstoque(!controlarEstoque)}>
                                    Controlar Estoque?
                                </label>
                            </div>

                            {controlarEstoque && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Quantidade em Estoque</label>
                                    <input
                                        type="number"
                                        value={estoqueAtual}
                                        onChange={(e) => setEstoqueAtual(e.target.value)}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all font-bold text-gray-800"
                                        placeholder="0"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Descrição</label>
                            <textarea
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all font-medium text-sm h-[130px] resize-none"
                                placeholder="Descreva os ingredientes ou detalhes do produto..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Imagem do Produto</label>
                            <input
                                type="file"
                                id="product-image"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <div
                                onClick={() => document.getElementById('product-image')?.click()}
                                className="border-2 border-dashed border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer group h-[130px] relative overflow-hidden"
                            >
                                {imagePreview ? (
                                    <>
                                        <img src={getImageUrl(imagePreview)} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="Preview" />
                                        <div className="relative z-10 flex flex-col items-center">
                                            <Upload size={20} className="text-primary" />
                                            <span className="text-[10px] font-black uppercase text-primary tracking-wider">Trocar Foto</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-3 bg-white rounded-xl shadow-sm group-hover:text-primary transition-colors text-gray-400">
                                            <Upload size={20} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Subir Foto</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Addons Section */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Grupos de Adicionais</label>
                            {addons.length > 0 ? (
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 max-h-[150px] overflow-y-auto custom-scrollbar space-y-2">
                                    {addons.map(addon => (
                                        <label key={addon.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100 group">
                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedAddons.includes(addon.id) ? 'bg-primary border-primary' : 'border-gray-300 bg-white'}`}>
                                                {selectedAddons.includes(addon.id) && <Check size={12} className="text-white" />}
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={selectedAddons.includes(addon.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedAddons([...selectedAddons, addon.id]);
                                                        else setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <span className={`text-sm font-bold ${selectedAddons.includes(addon.id) ? 'text-primary' : 'text-gray-600'}`}>{addon.nome}</span>
                                                <div className="flex gap-2">
                                                    <span className="text-[10px] uppercase text-gray-400 font-bold">{addon.tipo}</span>
                                                    <span className="text-[10px] uppercase text-gray-400">Min: {addon.min_opcoes} / Max: {addon.max_opcoes}</span>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic p-2">Nenhum grupo de adicionais criado.</p>
                            )}
                        </div>
                    </div>

                    <div className="col-span-full pt-4 border-t border-gray-50 flex gap-4">
                        {/* Buttons... */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {loading ? 'Processando...' : (
                                <>
                                    <Save size={20} />
                                    <span>{product ? 'Atualizar Produto' : 'Cadastrar Produto'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
