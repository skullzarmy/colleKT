"use client";

import { useViewState } from "@/contexts/ViewStateContext";

interface CollectionInfoProps {
    totalCollectionNFTs: number;
    currentRoom: number;
    totalRooms: number;
    currentRoomNFTCount: number;
}

export default function CollectionInfo({
    totalCollectionNFTs,
    currentRoom,
    totalRooms,
    currentRoomNFTCount,
}: CollectionInfoProps) {
    const { styleConfig } = useViewState();

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
        <div
            style={{ backgroundColor: solidBg }}
            className={`absolute px-4 py-2.5 text-sm rounded-xl top-4 right-4 border shadow-xl transition-all duration-300 ${styleConfig.typography.panelBorder} ${styleConfig.typography.panelText} ${styleConfig.typography.fontFamily}`}
        >
            <div className={`font-semibold ${styleConfig.typography.headingFont}`}>
                Total Collection: {totalCollectionNFTs} NFTs
            </div>
            <div
                className="mt-1 text-xs font-medium"
                style={{ color: styleConfig.typography.accentTextColor }}
            >
                Room {currentRoom + 1} of {totalRooms} • {currentRoomNFTCount} NFTs in this room
            </div>
        </div>
    );
}
