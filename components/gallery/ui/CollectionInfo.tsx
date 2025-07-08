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
    return (
        <div className="absolute px-4 py-2 text-sm text-white rounded-lg top-4 right-4 bg-black/50 backdrop-blur-sm">
            Total Collection: {totalCollectionNFTs} NFTs
            <div className="mt-1 text-xs text-cyan-400">
                Room {currentRoom + 1} of {totalRooms} • {currentRoomNFTCount} NFTs in this room
            </div>
        </div>
    );
}
