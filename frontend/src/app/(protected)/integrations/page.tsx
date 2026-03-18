import { redirect } from 'next/navigation';

export default function IntegrationsPage() {
    // Redirect to the first tab by default
    redirect('/integrations/whatsapp');
}
