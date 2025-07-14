import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ViewStateProvider } from "@/contexts/ViewStateContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "colleKT - 3D Tezos NFT Gallery",
    description: "Experience Tezos NFTs in an immersive 3D gallery",
    keywords: ["NFT", "Tezos", "3D", "Gallery", "Blockchain", "Art"],
    authors: [{ name: "colleKT" }],
    viewport: "width=device-width, initial-scale=1",
    robots: "index, follow",
    generator: "v0.dev",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta name="apple-mobile-web-app-title" content="colleKT" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <script
                    defer
                    src="https://cloud.umami.is/script.js"
                    data-website-id="6ab32fc3-5c0e-449e-95e0-2f6a81164bc8"
                ></script>
            </head>
            <body className={inter.className} suppressHydrationWarning>
                <ViewStateProvider>{children}</ViewStateProvider>
            </body>
        </html>
    );
}
