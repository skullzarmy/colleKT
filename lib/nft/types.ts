// Centralized NFT types
export interface NFTToken {
    id: string;
    token_id: string;
    balance?: number;
    contract: {
        address: string;
        alias?: string;
    };
    metadata?: {
        name?: string;
        description?: string;
        image?: string;
        artifact_uri?: string;
        artifactUri?: string;
        display_uri?: string;
        displayUri?: string;
        thumbnail_uri?: string;
        thumbnailUri?: string;
        formats?: Array<{
            uri: string;
            mimeType: string;
        }>;
        attributes?: Array<{
            name: string;
            value: string;
        }>;
    };
}

export interface NFTMetadata {
    name?: string;
    description?: string;
    image?: string;
    artifact_uri?: string;
    artifactUri?: string;
    display_uri?: string;
    displayUri?: string;
    thumbnail_uri?: string;
    thumbnailUri?: string;
    formats?: Array<{
        uri: string;
        mimeType: string;
    }>;
    attributes?: Array<{
        name: string;
        value: string;
    }>;
}

export interface UriSource {
    uri: string;
    source: string;
}
