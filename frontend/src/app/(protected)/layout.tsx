'use client';

import React from 'react';
import { BillingProvider } from '@/context/BillingContext';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <BillingProvider>
            <AdminLayout>
                {children}
            </AdminLayout>
        </BillingProvider>
    );
}
