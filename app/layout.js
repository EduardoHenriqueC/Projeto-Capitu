import './globals.css';

export const metadata = {
  title: 'Portal Capitu | Central de Conhecimento Estante Virtual',
  description: 'Portal Central de Procedimentos & Conhecimento EV',
  icons: {
    icon: '/logo.png',
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}