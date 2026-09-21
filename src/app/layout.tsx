import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { getPublicSiteUrl } from "@/lib/public-site";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  ...(getPublicSiteUrl() ? { metadataBase: getPublicSiteUrl() } : {}),
  title: {
    default: "InmoCore | Propiedades inmobiliarias",
    template: "%s | InmoCore",
  },
  description: "Sitio público de propiedades inmobiliarias.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`font-sans ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
