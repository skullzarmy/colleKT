import Link from "next/link";

export default function GalleryFooter() {
    const currentYear = new Date().getFullYear();
    const displayYear = currentYear === 2025 ? currentYear : `2025-${currentYear}`;

    return (
        <div className="fixed z-40 pointer-events-none bottom-4 right-2 sm:right-4">
            <div className="px-2 py-1.5 border rounded pointer-events-auto sm:px-3 sm:py-2 bg-black/20 backdrop-blur-sm border-white/10">
                <span className="text-xs text-white whitespace-nowrap">
                    <span className="hidden sm:inline">© {displayYear} colleKT. All rights reserved. a </span>
                    <span className="sm:hidden">© {displayYear} </span>
                    <Link
                        href="https://fafolab.xyz"
                        className="underline transition-colors text-white/90 underline-offset-2 hover:text-white"
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
