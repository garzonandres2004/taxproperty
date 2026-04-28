import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaxProperty Utah",
  description: "Tax sale property analyzer for Utah investors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-xl font-bold">
                  TaxProperty Utah
                </Link>
                <div className="flex gap-4 text-sm">
                  <Link href="/" className="text-gray-600 hover:text-gray-900">
                    Dashboard
                  </Link>
                  <Link href="/properties" className="text-gray-600 hover:text-gray-900">
                    Properties
                  </Link>
                  <Link href="/import" className="text-gray-600 hover:text-gray-900">
                    Import CSV
                  </Link>
                  <Link href="/new" className="text-gray-600 hover:text-gray-900">
                    + Add Property
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-900">
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-1 bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
