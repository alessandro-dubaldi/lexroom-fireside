import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lexroom Fireside',
  description: 'Live Q&A for Lexroom fireside chats',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-lx-dark text-lx-gray min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
