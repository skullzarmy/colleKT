import Link from "next/link";

export default function GalleryFooter() {
    const currentYear = new Date().getFullYear();
    const displayYear = currentYear === 2025 ? currentYear : `2025-${currentYear}`;

    return (
        <div className="fixed z-40 pointer-events-none bottom-4 right-4">
            <div className="px-3 py-2 border rounded pointer-events-auto bg-black/20 backdrop-blur-sm border-white/10">
                <span className="text-xs text-white whitespace-nowrap">
                    © {displayYear} colleKT. All rights reserved. a{" "}
                    <Link
                        href="https://fafolab.xyz"
                        className="underline transition-colors text-white/90 underline-offset-2 hover:text-white"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        FAFO <span className="line-through">lab</span>
                    </Link>{" "}
                    joint.
                </span>
            </div>
        </div>
    );
}
