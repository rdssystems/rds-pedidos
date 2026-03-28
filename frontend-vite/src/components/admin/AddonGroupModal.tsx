import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, AlertCircle } from 'lucide-react';

interface Option {
    id?: number;
    nome: string;
    preco_adicional: string | number;
}

interface AddonGroup {
    id?: number;
    nome: string;
    tipo: 'RADIO' | 'CHECKBOX';
    min_opcoes: number;
    max_opcoes: number;
    opcoes: Option[];
}

interface AddonGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    group?: AddonGroup | null;
}

export const AddonGroupModal = ({ isOpen, onClose, onSuccess, group }: AddonGroupModalProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [nome, setNome] = useState('');
    const [tipo, setTipo] = useState<'RADIO' | 'CHECKBOX'>('RADIO');
    const [minOpcoes, setMinOpcoes] = useState(0);
    const [maxOpcoes, setMaxOpcoes] = useState(1);
    const [opcoes, setOpcoes] = useState<Option[]>([]);

    useEffect(() => {
        if (isOpen) {
            setError('');
            if (group) {
                setNome(group.nome);
                setTipo(group.tipo);
                setMinOpcoes(group.min_opcoes);
                setMaxOpcoes(group.max_opcoes);
                setOpcoes(group.opcoes ? group.opcoes.map(o => ({ ...o })) : []);
            } else {
                setNome('');
                setTipo('RADIO');
                setMinOpcoes(0);
                setMaxOpcoes(1);
                setOpcoes([{ nome: '', preco_adicional: 0 }]);
            }
        }
    }, [isOpen, group]);

    const handleAddOption = () => {
        setOpcoes([...opcoes, { nome: '', preco_adicional: 0 }]);
    };

    const handleRemoveOption = (index: number) => {
        const newOpcoes = [...opcoes];
        newOpcoes.splice(index, 1);
        setOpcoes(newOpcoes);
    };

    const handleOptionChange = (index: number, field: keyof Option, value: any) => {
        const newOpcoes = [...opcoes];
        newOpcoes[index] = { ...newOpcoes[index], [field]: value };
        setOpcoes(newOpcoes);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const activeStoreId = localStorage.getItem('activeStoreId');

            const payload: any = {
                nome,
                tipo,
                min_opcoes: parseInt(String(minOpcoes)),
                max_opcoes: parseInt(String(maxOpcoes)),
                opcoes: opcoes.filter(o => o.nome.trim() !== ''),
                loja: activeStoreId ? parseInt(activeStoreId) : undefined
            };

            const url = group ? `/api/atributos/${group.id}/` : '/api/atributos/';
            const method = group ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(JSON.stringify(data));
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao salvar grupo.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-black text-gray-900 italic tracking-tight uppercase">
                        {group ? 'Editar Grupo de Adicionais' : 'Novo Grupo de Adicionais'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nome do Grupo</label>
                            <input
                                type="text"
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                placeholder="Ex: Borda Recheada, Molhos, Tamanho..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tipo de Escolha</label>
                                <select
                                    value={tipo}
                                    onChange={e => setTipo(e.target.value as 'RADIO' | 'CHECKBOX')}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium"
                                >
                                    <option value="RADIO">Seleção Única (Radio)</option>
                                    <option value="CHECKBOX">Múltipla Escolha (Check)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Mínimo</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={minOpcoes}
                                    onChange={e => setMinOpcoes(parseInt(e.target.value))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Máximo</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={maxOpcoes}
                                    onChange={e => setMaxOpcoes(parseInt(e.target.value))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Opções do Grupo</label>
                                <button type="button" onClick={handleAddOption} className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1">
                                    <Plus size={14} /> Adicionar Opção
                                </button>
                            </div>

                            <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                {opcoes.map((opcao, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={opcao.nome}
                                                onChange={e => handleOptionChange(index, 'nome', e.target.value)}
                                                placeholder="Nome da opção"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={opcao.preco_adicional}
                                                    onChange={e => handleOptionChange(index, 'preco_adicional', e.target.value)}
                                                    className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(index)}
                                            className="p-2 text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200">Cancelar</button>
                    <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 rounded-xl font-bold bg-primary text-white shadow-lg flex items-center gap-2">
                        {loading ? 'Salvando...' : <Check size={18} />} Salvar Grupo
                    </button>
                </div>
            </div>
        </div>
    );
};
