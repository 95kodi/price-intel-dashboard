import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "PriceIntel — Market Price Intelligence Dashboard",
  description: "Monitor product prices against Amazon, Flipkart, Poorvika, Reliance Digital and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        <Providers>
          <ToastProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 min-w-0">{children}</main>
            </div>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
