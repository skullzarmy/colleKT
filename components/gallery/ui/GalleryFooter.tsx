"use client";

import Link from "next/link";
import { useViewState } from "@/contexts/ViewStateContext";

export default function GalleryFooter() {
    const { styleConfig } = useViewState();
    const currentYear = new Date().getFullYear();
    const displayYear = currentYear === 2025 ? currentYear : `2025-${currentYear}`;

    const solidBg = styleConfig.ui.isLight
        ? styleConfig.id === "warm-solarium"
            ? "#fcfaf6"
            : "#ffffff"
        : styleConfig.id === "cyberpunk-neon"
        ? "#080914"
        : styleConfig.id === "minimal-spotlight"
        ? "#18191d"
        : "#09090b";

    return (
        <div className={`fixed z-40 pointer-events-none bottom-4 right-2 sm:right-4 ${styleConfig.typography.fontFamily}`}>
            <div
                style={{ backgroundColor: solidBg }}
                className={`px-2 py-1.5 border rounded-lg pointer-events-auto sm:px-3 sm:py-2 shadow-lg transition-colors duration-200 ${styleConfig.typography.panelBorder} ${styleConfig.typography.panelText}`}
            >
                <span className="text-xs whitespace-nowrap">
                    <span className="hidden sm:inline">© {displayYear} colleKT. All rights reserved. a </span>
                    <span className="sm:hidden">© {displayYear} </span>
                    <Link
                        href="https://fafolab.xyz"
                        className="underline transition-colors opacity-90 underline-offset-2 hover:opacity-100 font-medium"
                        style={{ color: styleConfig.ui.accentColor }}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        FAFO <span className="line-through">lab</span>
                    </Link>
                    <span className="hidden sm:inline"> joint</span>
                    <span className="sm:hidden"> joint</span>
                </span>
            </div>
        </div>
    );
}
