import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ViewStateProvider } from "@/contexts/ViewStateContext";
import { WalletProvider } from "@/contexts/WalletContext";
import UmamiAnalytics from "@/components/analytics/UmamiAnalytics";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

export const metadata: Metadata = {
    title: "colleKT - 3D Tezos NFT Gallery",
    description: "Experience Tezos NFTs in an immersive 3D gallery",
    keywords: ["NFT", "Tezos", "3D", "Gallery", "Blockchain", "Art"],
    authors: [{ name: "colleKT" }],
    robots: "index, follow",
    generator: "v0.dev",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta name="apple-mobile-web-app-title" content="colleKT" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className={inter.className} suppressHydrationWarning>
                <WalletProvider>
                    <ViewStateProvider>{children}</ViewStateProvider>
                </WalletProvider>
                <UmamiAnalytics />
            </body>
        </html>
    );
}
