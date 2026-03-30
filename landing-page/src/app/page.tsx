'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, ArrowRight, CheckCircle2, LayoutDashboard, ShoppingBag, UtensilsCrossed, Smartphone, Check, Zap, CreditCard, Users, Bike, TrendingUp, DollarSign, Clock, HelpCircle, Sparkles, X, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Calculator state
  const [ordersPerDay, setOrdersPerDay] = useState(30);
  const [avgTicket, setAvgTicket] = useState(65);
  const [commissionRate, setCommissionRate] = useState(12); // iFood average

  const monthlyRevenue = ordersPerDay * avgTicket * 30;
  const deliveryAppsCost = monthlyRevenue * (commissionRate / 100);
  const rdsCost = 149.90; // PRO Plan
  const savings = deliveryAppsCost - rdsCost;

  // Lista de imagens do carrossel. 
  // Pode adicionar mais arquivos aqui conforme você for colocando na pasta 'assets'
  const carouselImages = [
    '/assets/cardapio-page.png',
    '/assets/configuracoes.png',
    '/assets/configuracoes2.png',
    '/assets/configuracoes3.png',
    '/assets/equipe.png',
    '/assets/whatsapp.png',
  ];

  useEffect(() => {
    if (carouselImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 4000); // Troca de imagem a cada 4 segundos

    return () => clearInterval(interval);
  }, [carouselImages.length]);

  // Quiz State
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);

  const QUESTIONS = [
    {
      id: 'desafio',
      title: 'Qual o seu maior desafio?',
      options: [
        { id: 'whatsapp', label: 'Pedidos no WhatsApp', desc: 'Perco tempo anotando manual.', icon: MessageSquare },
        { id: 'balcao', label: 'Caixa e Balcão', desc: 'Contas não batem no fim do dia.', icon: CreditCard },
        { id: 'mesa', label: 'Gestão de Mesas', desc: 'Garçons e comandas desorganizados.', icon: UtensilsCrossed },
      ]
    },
    {
      id: 'espaco',
      title: 'Como é seu espaço físico?',
      options: [
        { id: 'balcao', label: 'Apenas Balcão', desc: 'Atendimento rápido e retirada.', icon: ShoppingBag },
        { id: 'salao', label: 'Tenho Salão/Mesas', desc: 'Atendimento tradicional com garçom.', icon: LayoutDashboard },
        { id: 'delivery', label: 'Foco em Delivery', desc: 'Produção para entrega externa.', icon: Bike },
      ]
    },
    {
      id: 'volume',
      title: 'Quantos pedidos por dia?',
      options: [
        { id: 'low', label: 'Até 20 pedidos', desc: 'Estou começando agora.', icon: Zap },
        { id: 'mid', label: 'De 20 a 100 pedidos', desc: 'Preciso de automação.', icon: TrendingUp },
        { id: 'high', label: 'Mais de 100 pedidos', desc: 'Preciso de robustez total.', icon: ChefHat },
      ]
    },
    {
      id: 'equipe',
      title: 'Possui equipe de campo?',
      options: [
        { id: 'garcom', label: 'Tenho Garçons', desc: 'Pedidos direto na mesa.', icon: Users },
        { id: 'motoboy', label: 'Tenho Motoboys', desc: 'Controle de entregas.', icon: Bike },
        { id: 'sozinho', label: 'Foco no Balcão', desc: 'Minha equipe é reduzida.', icon: CheckCircle2 },
      ]
    }
  ];

  const handleQuizAnswer = (qId: string, oId: string) => {
    const newAnswers = { ...answers, [qId]: oId };
    setAnswers(newAnswers);
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Logic for Result
      if (newAnswers.espaco === 'salao' || newAnswers.equipe === 'garcom') {
        setQuizResult({ name: 'Plano COMPLETO (Gold)', desc: 'Gestão de mesas, garçons, delivery e PDV. Ideal para seu restaurante físico.' });
      } else if (newAnswers.desafio === 'whatsapp' || newAnswers.espaco === 'delivery' || newAnswers.equipe === 'motoboy') {
        setQuizResult({ name: 'Plano DELIVERY (Silver)', desc: 'Foco em Kanban de pedidos, WhatsApp e automação de entregas.' });
      } else {
        setQuizResult({ name: 'Plano CAIXA (Bronze)', desc: 'Agilidade total no balcão e controle financeiro essencial.' });
      }
    }
  };

  const closeQuiz = () => {
    setIsQuizOpen(false);
    setCurrentStep(0);
    setAnswers({});
    setQuizResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-red-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 glass border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-500/30">
              <ChefHat size={24} />
            </div>
            <span className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">
              RDS Pedidos
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-bold text-sm text-slate-600">
            <a href="#recursos" className="hover:text-red-500 transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-red-500 transition-colors">Planos</a>
            <div className="h-4 w-px bg-slate-200"></div>
            {/* The main app is hosted separately, so these links could point to the real login URL */}
            <a href="https://app.rdspedidos.com.br/login" className="hover:text-slate-900 transition-colors">Entrar</a>
            <a href="https://app.rdspedidos.com.br/register" className="bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-all active:scale-95 shadow-md">
              Criar Loja Grátis
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
        <div className="max-w-5xl mx-auto text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 font-bold text-xs uppercase tracking-widest mb-8">
            <Zap size={14} className="animate-pulse" /> O Gestor Número #1 para Delivery
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[1.1] mb-6">
            O coração do seu <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
              negócio.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Esqueça cadernos e confusão no WhatsApp. Centralize PDV, Mesas e Delivery em um só lugar com o rDs Pedidos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => setIsQuizOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-500 text-white px-8 py-4 rounded-full font-bold text-base hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30 transition-all active:scale-95 animate-pulse"
            >
              Descobrir meu Plano Ideal <Sparkles size={18} className="ml-1" />
            </button>
            <a href="https://app.rdspedidos.com.br/register" className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95">
              Criar Loja Grátis
            </a>
          </div>
        </div>

        {/* Hero Mockup Graphic */}
        <div className="max-w-6xl mx-auto mt-20 relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="aspect-video bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative glass">
            {/* Fake OS top bar */}
            <div className="h-8 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            {/* Application Screenshot Carousel */}
            <div className="relative w-full overflow-hidden bg-slate-100 aspect-video">
              <div
                className="flex transition-transform duration-700 ease-in-out h-full"
                style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
              >
                {carouselImages.map((src, index) => (
                  <div key={index} className="w-full h-full flex-shrink-0 relative">
                    <Image
                      src={src}
                      alt={`Interface do RDS Pedidos ${index + 1}`}
                      fill
                      className="object-contain"
                      priority={index === 0}
                      quality={100}
                    />
                  </div>
                ))}
              </div>

              {/* Carousel Indicators */}
              {carouselImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-slate-900/40 p-2 rounded-full backdrop-blur-md">
                  {carouselImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${currentImageIndex === index ? 'bg-red-500 w-6' : 'bg-white/60 w-2 hover:bg-white'}`}
                      aria-label={`Visualizar tela ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-6">Tudo que a sua <span className="text-red-500">operação precisa.</span></h2>
            <p className="text-lg text-slate-600">Substitua cadernos, planilhas e várias ferramentas avulsas por uma única plataforma inteligente.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 - Kanban */}
            <div className="bg-slate-50 rounded-[2rem] p-10 border border-slate-100 hover:shadow-2xl hover:shadow-red-500/5 transition-all hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-slate-100 mb-8 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">Gestão em Tempo Real</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                Sincronização via <span className="text-red-500 font-bold">WebSockets</span>. Seus pedidos aparecem na tela no mesmo segundo em que o cliente clica, com alertas sonoros e visuais.
              </p>
            </div>

            {/* Feature 2 - WhatsApp AI */}
            <div className="bg-slate-50 rounded-[2rem] p-10 border border-slate-100 hover:shadow-2xl hover:shadow-red-500/5 transition-all hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-slate-100 mb-8 group-hover:scale-110 transition-transform">
                <Zap size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">WhatsApp com IA</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                Atendimento inteligente que responde dúvidas e envia o link do cardápio automaticamente. Economize horas de chat manual todos os dias.
              </p>
            </div>

            {/* Feature 3 - Mesa/QR Code */}
            <div className="bg-slate-50 rounded-[2rem] p-10 border border-slate-100 hover:shadow-2xl hover:shadow-red-500/5 transition-all hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-slate-100 mb-8 group-hover:scale-110 transition-transform">
                <UtensilsCrossed size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">Mesa & Comanda Digital</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                Seus clientes pedem direto do QR Code na mesa. O pedido vai direto para a cozinha e para o caixa, sem depender de garçom o tempo todo.
              </p>
            </div>

            {/* Feature 4 - PDV Interno */}
            <div className="bg-slate-50 rounded-[2rem] p-10 border border-slate-100 hover:shadow-2xl hover:shadow-red-500/5 transition-all hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-slate-100 mb-8 group-hover:scale-110 transition-transform">
                <ShoppingBag size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">PDV de Balcão Blindado</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                Controle total de entradas, saídas, fechamento de caixa e sangrias. Um terminal de vendas rápido, bonito e que nunca te deixa na mão.
              </p>
            </div>

            {/* Feature 5 - Equipe/Garçons */}
            <div className="bg-slate-50 rounded-[2rem] p-10 border border-slate-100 hover:shadow-2xl hover:shadow-red-500/5 transition-all hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-slate-100 mb-8 group-hover:scale-110 transition-transform">
                <Users size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">WebApp para Garçons</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                Transforme qualquer celular em uma ferramenta de trabalho. Garçons lançam pedidos à mesa com 3 cliques, eliminando erros de papel.
              </p>
            </div>

            {/* Feature 6 - Entregadores */}
            <div className="bg-slate-50 rounded-[2rem] p-10 border border-slate-100 hover:shadow-2xl hover:shadow-red-500/5 transition-all hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-slate-100 mb-8 group-hover:scale-110 transition-transform">
                <Bike size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">Gestão de Entregadores</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                Acerto de contas transparente. Saiba exatamente quanto cada motoboy deve e quanto ele tem a receber de taxa de entrega em tempo real.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Profit Calculator Section - New */}
      <section className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-[3rem] p-8 md:p-16 border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl"></div>
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                    <DollarSign size={12} /> Calculadora de Economia
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight mb-4">
                    Pare de pagar <span className="text-red-500">taxas abusivas.</span>
                  </h2>
                  <p className="text-slate-600 font-medium">
                    Simule quanto você economiza ao centralizar seus pedidos no RDS Pedidos em vez de depender apenas de aplicativos de entrega.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Orders Slider */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <ShoppingBag size={16} className="text-red-500" /> Pedidos / Dia
                      </label>
                      <span className="text-2xl font-black text-red-500 italic">{ordersPerDay}</span>
                    </div>
                    <input
                      type="range" min="1" max="200" value={ordersPerDay}
                      onChange={(e) => setOrdersPerDay(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>

                  {/* Avg Ticket Slider */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center relative">
                      <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 group cursor-help">
                        <DollarSign size={16} className="text-red-500" /> Ticket Médio
                        <HelpCircle size={14} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                        <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 font-medium leading-relaxed shadow-xl">
                          Valor médio que cada cliente gasta por pedido no seu restaurante.
                        </div>
                      </label>
                      <span className="text-2xl font-black text-red-500 italic text-nowrap">R$ {avgTicket}</span>
                    </div>
                    <input
                      type="range" min="10" max="300" value={avgTicket}
                      onChange={(e) => setAvgTicket(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>

                  {/* Commission Slider */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center relative">
                      <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 group cursor-help">
                        <TrendingUp size={16} className="text-red-500" /> Taxa Outros Apps
                        <HelpCircle size={14} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                        <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 font-medium leading-relaxed shadow-xl">
                          Soma da comissão do App (12% a 23%) + taxa de pagamento online (3.2%).
                        </div>
                      </label>
                      <span className="text-2xl font-black text-red-500 italic">{commissionRate}%</span>
                    </div>
                    <input
                      type="range" min="5" max="30" value={commissionRate}
                      onChange={(e) => setCommissionRate(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white relative shadow-2xl">
                <div className="space-y-8">
                  {/* Visual Bars Comparison */}
                  <div className="space-y-6 mb-8">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Custo Apps Terceiros (Comissão + Pagamento)</span>
                        <span>{commissionRate}%</span>
                      </div>
                      <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div
                          className="h-full bg-slate-500 transition-all duration-500 ease-out"
                          style={{ width: '100%' }}
                        ></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-red-400">
                        <span>Custo RDS Pedidos</span>
                        <span>Fixo</span>
                      </div>
                      <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div
                          className="h-full bg-red-500 transition-all duration-500 ease-out"
                          style={{ width: `${Math.min(100, (rdsCost / deliveryAppsCost) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Entenda a taxa oculta</p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Apps como iFood cobram em média <span className="text-white font-bold">12% a 23%</span> de comissão, mais <span className="text-white font-bold">3,2%</span> de processamento de pagamento. Em um pedido de R$ 100, você pode perder até <span className="text-red-400 font-bold text-sm">R$ 27,00</span> antes mesmo de pagar seus custos fixos.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Custo Mensal Outros Apps</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-slate-500 text-xl font-bold italic">R$</span>
                      <span className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-300">
                        {deliveryAppsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pb-6 border-b border-white/10">
                    <span className="text-red-400 text-[10px] font-black uppercase tracking-[0.2em]">Custo RDS Pedidos (Plano PRO)</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-red-500 text-xl font-bold italic">R$</span>
                      <span className="text-4xl md:text-5xl font-black italic tracking-tighter">129,90</span>
                    </div>
                  </div>

                  <div className="pt-4 animate-bounce-slow">
                    <span className="text-green-400 text-xs font-black uppercase tracking-[0.3em] block mb-2">Dinheiro que volta pro seu bolso</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-green-500 text-2xl font-bold italic">R$</span>
                      <span className="text-5xl md:text-7xl font-black italic tracking-tight text-green-400 drop-shadow-lg">
                        {savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-green-500/60 text-xs font-bold mt-4 italic">
                      * No RDS você paga valor fixo e mantém 100% do seu lucro.
                    </p>
                  </div>

                  <a href="https://app.rdspedidos.com.br/register" className="flex items-center justify-center gap-3 w-full py-5 bg-white text-slate-900 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-xl shadow-white/5">
                    Quero economizar agora <ArrowRight size={20} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-24 bg-slate-900 px-6 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-6">Planos <span className="text-red-400">transparentes.</span></h2>
            <p className="text-lg text-slate-400">Sem taxas sobre vendas. Sem surpresas no fim do mês. Escolha o ideal para o seu Delivery.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

            {/* Plan Start */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-[2.5rem] p-10 border border-slate-700">
              <div className="mb-6">
                <span className="text-sm font-bold tracking-widest uppercase text-slate-400">O Essencial</span>
                <h3 className="text-3xl font-black text-white mt-2 italic uppercase">START</h3>
              </div>
              <div className="mb-8 flex items-end gap-2 text-white">
                <span className="text-slate-400 text-lg font-bold mb-1 mr-1">R$</span>
                <span className="text-5xl font-black tracking-tighter italic">69<span className="text-3xl">,90</span></span>
                <span className="text-slate-400 font-bold mb-1 pl-1">/mês</span>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-8 italic">Ideal para quem está começando a organizar sua operação.</p>
              <ul className="space-y-4 mb-10 text-slate-300">
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Cardápio Digital</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Cadastro de Produtos Ilimitado</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> 1 Conta de Equipe</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Suporte via E-mail</li>
                <li className="flex items-center gap-3 text-slate-600/50"><CheckCircle2 size={18} /> Gestão de Pedidos (Kanban)</li>
                <li className="flex items-center gap-3 text-slate-600/50"><CheckCircle2 size={18} /> Mesas e Comandas</li>
                <li className="flex items-center gap-3 text-slate-600/50"><CheckCircle2 size={18} /> Integração iFood (Em breve)</li>
                <li className="flex items-center gap-3 text-slate-600/50"><CheckCircle2 size={18} /> WhatsApp Bot</li>
              </ul>
              <a href="https://app.rdspedidos.com.br/register" className="block w-full text-center py-4 rounded-full font-black text-white bg-slate-900 hover:bg-black transition-all active:scale-95 uppercase tracking-widest text-sm">
                Começar Agora
              </a>
            </div>

            {/* Plan PRO */}
            <div className="relative bg-white rounded-[2.5rem] p-10 border-4 border-red-500 shadow-2xl shadow-red-500/20 transform md:-translate-y-4">
              <div className="absolute top-0 right-10 -translate-y-1/2 bg-red-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                Mais Desejado
              </div>
              <div className="mb-6">
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Completo</span>
                <h3 className="text-4xl font-black text-slate-900 mt-2 italic uppercase tracking-tighter">PRO</h3>
              </div>
              <div className="mb-8 flex items-end gap-2">
                <span className="text-slate-400 text-lg font-bold mb-1 mr-1">R$</span>
                <span className="text-6xl font-black text-slate-900 tracking-tighter italic">149<span className="text-4xl">,90</span></span>
                <span className="text-slate-500 font-bold mb-2 pl-1">/mês</span>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-8 italic">Potência total com automação e IA para restaurantes.</p>
              <ul className="space-y-4 mb-10 text-slate-700 font-bold text-sm">
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Tudo do Plano Start</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Gestão de Pedidos (Kanban)</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Mesas e Comandas</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Integração iFood Oficial (Em breve)</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Atendente de I.A no WhatsApp</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Dashboard de BI (Analytics)</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Módulo Multi-lojas</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Gestão de Estoque Avançada</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Até 10 Contas de Equipe</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" size={18} /> Suporte Prioritário WhatsApp</li>
              </ul>
              <a href="https://app.rdspedidos.com.br/register" className="block w-full text-center py-5 rounded-[1.5rem] font-black text-white bg-red-500 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/40 transition-all active:scale-95 uppercase tracking-widest">
                Assinar o PRO
              </a>
              <p className="text-center text-[10px] text-slate-400 font-black mt-4 uppercase tracking-wider italic">7 Dias de Teste Grátis no PRO</p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 px-6 border-t border-slate-800 text-center text-slate-500 font-medium">
        <div className="flex items-center justify-center gap-2 text-white mb-6">
          <ChefHat size={20} className="text-red-500" />
          <span className="font-black italic tracking-tighter uppercase text-lg">RDS Pedidos</span>
        </div>
        <p>&copy; {new Date().getFullYear()} RDS Pedidos. Todos os direitos reservados.</p>
        <p className="mt-2 text-sm text-slate-600">Simplificando o Delivery Brasileiro.</p>
      </footer>

      {/* QUIZ MODAL */}
      {isQuizOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={closeQuiz} />
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            {!quizResult ? (
              <div className="p-8 sm:p-12">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-3 py-1 rounded-full">Consultoria Grátis</span>
                  <button onClick={closeQuiz} className="text-slate-300 hover:text-red-500 transition-colors"><X size={24} /></button>
                </div>
                
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none mb-2">{QUESTIONS[currentStep].title}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Passo {currentStep + 1} de {QUESTIONS.length}</p>

                <div className="grid gap-3">
                  {QUESTIONS[currentStep].options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleQuizAnswer(QUESTIONS[currentStep].id, opt.id)}
                      className="group flex items-center gap-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-left hover:bg-white hover:border-red-500 hover:shadow-xl hover:shadow-red-500/5 hover:scale-[1.02] transition-all"
                    >
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors shrink-0">
                        <opt.icon size={22} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-black text-slate-900 uppercase italic tracking-tighter">{opt.label}</p>
                        <p className="text-[10px] text-slate-400 font-bold leading-tight">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 sm:p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Resultado da Consultoria:</h3>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 mb-4">{quizResult.name}</h2>
                <div className="mb-8 p-6 bg-slate-50 rounded-2xl text-left border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 leading-relaxed italic">"{quizResult.desc}"</p>
                </div>
                
                <div className="w-full space-y-3">
                  <a 
                    href="https://app.rdspedidos.com.br/register"
                    className="flex items-center justify-center w-full py-5 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform shadow-xl shadow-red-500/20"
                  >
                    Começar teste do {quizResult.name.split(' ')[1]}
                  </a>
                  <button onClick={closeQuiz} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">Refazer simulação</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
