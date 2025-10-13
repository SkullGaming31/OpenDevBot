import './globals.css';
import React from 'react';

export const metadata = {
    title: 'OpenDevBot Dashboard',
    description: 'Dashboard for OpenDevBot'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <main style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: '24px' }}>
                    <h1>OpenDevBot Dashboard</h1>
                    {children}
                </main>
            </body>
        </html>
    );
}
