import type { Metadata } from "next";
import { Playfair_Display, Work_Sans } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/nav";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EmberFlow — M-dwarf gyrochronology",
    template: "%s · EmberFlow",
  },
  description:
    "Probabilistic stellar ages for M dwarfs from rotation period and mass, powered by the EmberFlow conditional normalizing flow.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${workSans.variable}`}>
      <body>
        <div className="page-glow" />
        <header className="site-header">
          <div className="container inner">
            <Link href="/" className="brand">
              <span className="ember" aria-hidden />
              EmberFlow
            </Link>
            <Nav />
          </div>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="container inner">
            <span>
              EmberFlow · Xia, Van-Lane &amp; Theissen ·{" "}
              <Link href="/docs#citation">How to cite</Link>
            </span>
            <span>
              <a
                href="https://github.com/alanx1234/EmberFlow"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              {" · "}
              <Link href="/api-docs">REST API</Link>
              {" · "}
              <Link href="/docs">Documentation</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
