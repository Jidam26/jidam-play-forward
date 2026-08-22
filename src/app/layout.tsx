import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jidam — Play Forward",
  description: "Jidam is a multi-sport community in Abu Dhabi. Browse upcoming games, reserve your spot, and play.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-offwhite text-foreground">{children}</body>
    </html>
  );
}
