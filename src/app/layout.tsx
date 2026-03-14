import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { DM_Mono, DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { AuthProvider } from "@/components/AuthContext";
import { LanguageProvider } from "@/components/LanguageContext";
import { LocationProvider } from "@/components/LocationContext";
import { LocationModal } from "@/components/LocationModal";
import { ToastProvider } from "@/components/ToastContext";

const bodyFont = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const displayFont = Playfair_Display({ subsets: ["latin"], variable: "--font-display-face" });
const monoFont = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-face" });

export const metadata: Metadata = {
  title: "Open Politics - Make Your Voice Count Locally",
  description:
    "Join people near you who care about the same issues. Start a group, back a voice you trust, and push for change - from your street to your state.",
  keywords: ["politics", "community", "democracy", "India", "grassroots", "local issues"],
  authors: [{ name: "Open Politics" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

const footerLinkGroups = [
  {
    title: "Explore",
    links: [
      { href: "/discover", label: "Discover groups" },
      { href: "/alliances", label: "Alliances" },
      { href: "/network", label: "Network view" },
      { href: "/trends", label: "Trends" },
    ],
  },
  {
    title: "Build",
    links: [
      { href: "/group/create", label: "Start a group" },
      { href: "/auth", label: "Sign in" },
      { href: "/profile", label: "Your profile" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Use" },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} ${bodyFont.className}`}>
        <AuthProvider>
          <LanguageProvider>
            <LocationProvider>
              <ToastProvider>
                <div className="editorial-shell flex min-h-screen flex-col">
                  <Header />
                  <LocationModal />
                  <main className="flex-1 pb-20 md:pb-0">
                    {children}
                  </main>
                  <footer className="mt-auto border-t border-border-primary bg-bg-secondary/80 py-12 backdrop-blur-sm">
                    <div className="editorial-page editorial-page--wide">
                      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
                        <div className="max-w-md">
                          <p
                            className="text-[11px] uppercase tracking-[0.2em] text-text-muted"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            Open Politics
                          </p>
                          <p
                            className="mt-3 text-2xl text-text-primary"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            Organize locally with clear representation and visible accountability.
                          </p>
                          <p className="mt-4 text-sm text-text-secondary">
                            Join groups near you, compare approaches in public, and leave when a group no longer earns your
                            support.
                          </p>
                        </div>

                        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                          {footerLinkGroups.map((group) => (
                            <div key={group.title}>
                              <p
                                className="text-[11px] uppercase tracking-[0.18em] text-text-muted"
                                style={{ fontFamily: "var(--font-mono)" }}
                              >
                                {group.title}
                              </p>
                              <ul className="mt-4 space-y-3 text-sm text-text-secondary">
                                {group.links.map((link) => (
                                  <li key={link.href}>
                                    <Link href={link.href} className="transition-colors hover:text-text-primary">
                                      {link.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}

                          <div>
                            <p
                              className="text-[11px] uppercase tracking-[0.18em] text-text-muted"
                              style={{ fontFamily: "var(--font-mono)" }}
                            >
                              Contact
                            </p>
                            <div className="mt-4 space-y-3 text-sm text-text-secondary">
                              <p>Questions, support, or partnership requests.</p>
                              <a
                                href="mailto:admin@openpolitics.in"
                                className="inline-flex text-text-primary transition-colors hover:text-accent"
                              >
                                admin@openpolitics.in
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-10 flex flex-col gap-3 border-t border-border-primary pt-5 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
                        <p>(c) {new Date().getFullYear()} Open Politics. Built for transparent, local-first civic organizing.</p>
                        <p>Join freely. Compare openly. Leave freely.</p>
                      </div>
                    </div>
                  </footer>
                  <BottomNav />
                </div>
              </ToastProvider>
            </LocationProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
