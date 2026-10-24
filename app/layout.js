import './globals.css';

export const metadata = {
  title: 'Portal Capitu | Central de Conhecimento CS Estante Virtual',
  description: 'Portal Central de Procedimentos & Conhecimento CS',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}