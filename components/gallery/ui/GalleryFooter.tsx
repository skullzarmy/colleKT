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
        <div className={`fixed z-40 pointer-events-none bottom-4 right-4 hidden xl:block ${styleConfig.typography.fontFamily}`}>
            <div
                style={{ backgroundColor: solidBg }}
                className={`px-3 py-2 border rounded-lg pointer-events-auto shadow-lg transition-colors duration-200 ${styleConfig.typography.panelBorder} ${styleConfig.typography.panelText}`}
            >
                <span className="text-xs whitespace-nowrap">
                    <span>© {displayYear} colleKT. All rights reserved. a </span>
                    <Link
                        href="https://fafolab.xyz"
                        className="underline transition-colors opacity-90 underline-offset-2 hover:opacity-100 font-medium"
                        style={{ color: styleConfig.ui.accentColor }}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        FAFO <span className="line-through">lab</span>
                    </Link>
                    <span> joint</span>
                </span>
            </div>
        </div>
    );
}
