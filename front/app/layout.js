import './globals.css';

export const metadata = {
  title: "Community Connect - QR Virtual Card",
  description: "Community Connect member management and virtual card system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        {children}
      </body>
    </html>
  );
} 