import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "SEKRE — Pusat Konfirmasi Pengiriman Pesan",
  description: "Approval, Limits, Permissions, Record · PT Nusantara Alat Berat",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-[#F6F8FC] text-slate-900 antialiased selection:bg-[#2F55D4]/15 selection:text-[#2F55D4]">
        {children}
      </body>
    </html>
  );
}
