import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "InmoCore",
  description: "Plataforma inmobiliaria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={cn(
        "font-sans",
        manrope.variable,
        instrumentSerif.variable,
      )}
    >
      <body>{children}</body>
    </html>
  );
}
