import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Patrick_Hand } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

// Chalk handwriting, used only for words written on the board.
const patrick = Patrick_Hand({
  variable: "--font-patrick",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Manu, professora de matemática por voz",
  description:
    "Você fala, a Manu explica, passa exercício e corrige. Aula particular de matemática por voz, do primeiro ano à faculdade.",
};

export const viewport: Viewport = {
  themeColor: "#f5f8fc",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${patrick.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
