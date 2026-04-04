import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { CustomerProvider } from '@/context/CustomerContext';
import { CartProvider } from '@/context/CartContext';
import { SocketProvider } from '@/context/SocketContext';
import { BillingProvider } from '@/context/BillingContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminLayout } from '@/components/admin/AdminLayout';

// Pages
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import PublicMenuPage from '@/pages/PublicMenuPage';
import PublicTablePage from '@/pages/PublicTablePage';
import PublicOrdersPage from '@/pages/PublicOrdersPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import OrdersPage from '@/pages/admin/OrdersPage';
import PosPage from '@/pages/admin/PosPage';
import MenuPage from '@/pages/admin/MenuPage';
import AddonsPage from '@/pages/admin/AddonsPage';
import TablesPage from '@/pages/admin/TablesPage';
import TableDetailsPage from '@/pages/admin/TableDetailsPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import TeamPage from '@/pages/admin/TeamPage';
import BillingPage from '@/pages/admin/BillingPage';
import CrmPage from '@/pages/admin/CrmPage';
import IntegrationsLayout from '@/pages/admin/integrations/IntegrationsLayout';
import WhatsAppPage from '@/pages/admin/integrations/WhatsAppPage';
import AIBotPage from '@/pages/admin/integrations/AIBotPage';

const App: React.FC = () => {
    // Detect Subdomain for Multi-tenant Storefronts
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isMainApp = hostname.startsWith('app.') || isLocalhost;

    let subdomain = '';
    if (!isMainApp) {
        subdomain = hostname.split('.')[0];
        if (subdomain === 'www') subdomain = '';
    }

    // Subdomain App
    if (subdomain) {
        return (
            <AuthProvider>
                <CustomerProvider>
                    <SocketProvider>
                        <CartProvider>
                            <Routes>
                                <Route path="/" element={<PublicMenuPage />} />
                                <Route path="/m/:mesaNumber" element={<PublicTablePage />} />
                                <Route path="/orders" element={<PublicOrdersPage />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </CartProvider>
                    </SocketProvider>
                </CustomerProvider>
            </AuthProvider>
        );
    }

    // Main App
    return (
        <AuthProvider>
            <CustomerProvider>
                <CartProvider>
                    <SocketProvider>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<HomePage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />
                            <Route path="/verify-email" element={<VerifyEmailPage />} />
                            
                            {/* Slug fallback for local testing: localhost:5173/s/loja1 */}
                            <Route path="/s/:slug" element={<PublicMenuPage />} />
                            <Route path="/s/:slug/m/:mesaNumber" element={<PublicTablePage />} />
                            <Route path="/s/:slug/orders" element={<PublicOrdersPage />} />
                            
                            {/* Protected Routes */}
                            <Route
                                path="/*"
                                element={
                                    <ProtectedRoute>
                                        <BillingProvider>
                                            <AdminLayout>
                                                <Routes>
                                                    <Route path="/dashboard" element={<DashboardPage />} />
                                                    <Route path="/orders" element={<OrdersPage />} />
                                                    <Route path="/pos" element={<PosPage />} />
                                                     <Route path="/crm" element={<CrmPage />} />
                                                     <Route path="/menu" element={<MenuPage />} />
                                                    <Route path="/menu/addons" element={<AddonsPage />} />
                                                    <Route path="/mesas" element={<TablesPage />} />
                                                    <Route path="/mesas/:id" element={<TableDetailsPage />} />
                                                    <Route path="/settings" element={<SettingsPage />} />
                                                    <Route path="/settings/team" element={<TeamPage />} />
                                                    <Route path="/settings/billing" element={<BillingPage />} />
                                                    <Route path="/integrations" element={<IntegrationsLayout><WhatsAppPage /></IntegrationsLayout>} />
                                                    <Route path="/integrations/whatsapp" element={<IntegrationsLayout><WhatsAppPage /></IntegrationsLayout>} />
                                                    <Route path="/integrations/ai-bot" element={<IntegrationsLayout><AIBotPage /></IntegrationsLayout>} />
                                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                                </Routes>
                                            </AdminLayout>
                                        </BillingProvider>
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </SocketProvider>
                </CartProvider>
            </CustomerProvider>
        </AuthProvider>
    );
};

export default App;
