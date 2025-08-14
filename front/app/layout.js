import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: "ELFED - Elazığ Dernekler Federasyonu",
  description: "Elazığ Dernekler Federasyonu - Kültürel ve sosyal faaliyetler, etkinlikler ve dernek yönetimi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
} 