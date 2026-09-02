import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'nossa casa — finanças a dois',
  description: 'Controle financeiro compartilhado para Gui e Fer.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
