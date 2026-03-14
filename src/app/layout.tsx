import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DataQA.ai - AI-Powered Data Analysis",
  description: "Ask questions about your data in plain English. Upload CSV, Excel, or JSON files and get instant insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="light">
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        <ErrorBoundary>
          <ThemeProvider>
            {children}
            {/* Modal portal for high z-index rendering */}
            <div id="modal-portal" className="relative z-50" />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
