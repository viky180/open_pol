import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { AuthProvider } from "@/components/AuthContext";
import { LanguageProvider } from "@/components/LanguageContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "Open Politics - Decentralized Issue-Based Political Network",
  description: "A decentralized, issue-based political coordination platform for India. Form single-issue parties, build trust through votes, and escalate issues without central authority.",
  keywords: ["politics", "decentralized", "democracy", "India", "grassroots", "issue-based"],
  authors: [{ name: "Open Politics" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f4f1eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className}`}>
        <AuthProvider>
          <LanguageProvider>
            <div className="min-h-screen flex flex-col bg-bg-primary">
              <Header />
              <main className="flex-1 pb-20 md:pb-0">
                {children}
              </main>
              <footer className="footer border-t border-border-primary py-8 mt-auto bg-bg-secondary/95 backdrop-blur-sm">
                <div className="container mx-auto px-4 text-center">
                  <p className="text-text-muted text-[11px] uppercase tracking-[0.16em]">
                    Open Politics Civic Ledger
                  </p>
                  <p className="text-text-secondary text-sm mt-2 font-medium">
                    Decentralized coordination for local issues
                  </p>
                  <p className="text-text-muted text-xs mt-2">
                    Exit must always be easier than control
                  </p>
                </div>
              </footer>
              <BottomNav />
            </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
