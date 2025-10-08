import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: "ANEF - Anadolu Elazığlılar Dernekler Federasyonu",
  description: "Anadolu Elazığlılar Dernekler Federasyonu - Kültürel ve sosyal faaliyetler, etkinlikler ve dernek yönetimi",
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