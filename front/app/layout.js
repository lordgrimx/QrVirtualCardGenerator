import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: "Community Connect - QR Virtual Card",
  description: "Community Connect member management and virtual card system",
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