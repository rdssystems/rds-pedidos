import React, { useState } from 'react';
import { X, User, Phone, CheckCircle } from 'lucide-react';
import { useCustomer } from '@/context/CustomerContext';

interface PublicAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    accentColor: string;
    onSuccess?: () => void;
}

export const PublicAuthModal: React.FC<PublicAuthModalProps> = ({ isOpen, onClose, accentColor, onSuccess }) => {
    const { customer, loginCustomer, updateCustomer, isAuthenticated } = useCustomer();
    const [name, setName] = useState(customer?.name || '');
    const [phone, setPhone] = useState(customer?.phone || '');
    const [addressRua, setAddressRua] = useState(customer?.address_rua || '');
    const [addressNumero, setAddressNumero] = useState(customer?.address_numero || '');
    const [addressBairro, setAddressBairro] = useState(customer?.address_bairro || '');
    const [error, setError] = useState('');

    // Update fields when customer changes or modal opens
    React.useEffect(() => {
        if (isOpen && customer) {
            setName(customer.name);
            setPhone(customer.phone);
            setAddressRua(customer.address_rua || '');
            setAddressNumero(customer.address_numero || '');
            setAddressBairro(customer.address_bairro || '');
        }
    }, [isOpen, customer]);

    if (!isOpen) return null;

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(formatPhone(e.target.value));
        setError('');
    };

    const validate = () => {
        if (name.trim().length < 3) {
            setError('Por favor, informe seu nome completo.');
            return false;
        }
        
        // Regex para (XX) 9XXXX-XXXX
        const phoneRegex = /^\(\d{2}\) 9\d{4}-\d{4}$/;
        if (!phoneRegex.test(phone)) {
            setError('Formato inválido. Use (XX) 9XXXX-XXXX.');
            return false;
        }
        
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            loginCustomer(name, phone, {
                address_rua: addressRua,
                address_numero: addressNumero,
                address_bairro: addressBairro
            });
            if (onSuccess) onSuccess();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-scale-up">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{isAuthenticated ? 'Meu Perfil' : 'Identificação'}</h2>
                        <p className="text-xs text-gray-500 mt-1 font-medium italic">
                            {isAuthenticated ? 'Mantenha seus dados atualizados.' : 'Para acompanhar seu pedido e salvar seu histórico.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        {/* Name Input */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Nome Completo</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-primary transition-colors">
                                    <User size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Ex: Klisman Silva"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        {/* Phone Input */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">WhatsApp / Telefone</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-primary transition-colors">
                                    <Phone size={18} />
                                </div>
                                <input 
                                    type="tel" 
                                    required
                                    placeholder="(00) 90000-0000"
                                    maxLength={15}
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50">
                             <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 ml-1">Endereço de Entrega</h3>
                             
                             <div className="space-y-4">
                                 <div className="space-y-1.5">
                                     <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Rua / Avenida</label>
                                     <input 
                                         type="text" 
                                         placeholder="Ex: Rua das Flores"
                                         value={addressRua}
                                         onChange={(e) => setAddressRua(e.target.value)}
                                         className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                     />
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1.5">
                                         <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Número</label>
                                         <input 
                                             type="text" 
                                             placeholder="Ex: 123"
                                             value={addressNumero}
                                             onChange={(e) => setAddressNumero(e.target.value)}
                                             className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                         />
                                     </div>
                                     <div className="space-y-1.5">
                                         <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Bairro</label>
                                         <input 
                                             type="text" 
                                             placeholder="Ex: Centro"
                                             value={addressBairro}
                                             onChange={(e) => setAddressBairro(e.target.value)}
                                             className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                         />
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600 text-xs font-bold animate-shake">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full py-4 rounded-lg text-white font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 shadow-xl"
                        style={{ backgroundColor: accentColor || '#007A87' }}
                    >
                        {isAuthenticated ? 'Salvar Alterações' : 'Confirmar Identificação'}
                        <CheckCircle size={18} />
                    </button>
                </form>

                {/* Footer */}
                <div className="px-8 py-5 bg-gray-50 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 leading-relaxed text-center font-medium">
                        Ao se identificar, você aceita nossos termos e condições. Seus dados são salvos apenas neste navegador para facilitar suas próximas compras.
                    </p>
                </div>
            </div>
        </div>
    );
};
