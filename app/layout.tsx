import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dory | Uscite e imbarchi",
  description: "Le settimane di Dory e le richieste di imbarco con Riccardo e Peppe.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  );
}
