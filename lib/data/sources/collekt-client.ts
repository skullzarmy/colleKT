/**
 * ColleKT Client - Local API client for token collection data
 *
 * Replaces direct TzKT SDK calls with calls to our secure server-side API.
 * All caching, filtering, and data orchestration happens server-side.
 */

export interface CollektCollectionResponse {
    success: boolean;
    data?: {
        tokens: any[]; // Will match UnifiedToken format from server
        pagination: {
            currentPage: number;
            pageSize: number;
            totalItems: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
            startIndex: number;
            endIndex: number;
        };
        cacheInfo: {
            hit: boolean;
            source: "cache" | "api" | "hybrid";
            buildTimeMs?: number;
        };
        performance: {
            totalTimeMs: number;
            fetchTimeMs?: number;
            filterTimeMs?: number;
        };
    };
    error?: string;
}

export interface CollektCollectionOptions {
    address: string;
    page?: number;
    pageSize?: number;
    forceRefresh?: boolean;
}

/**
 * ColleKT API Client
 */
export class CollektClient {
    private baseUrl: string;

    constructor() {
        // Use current domain for API calls
        this.baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    }

    /**
     * Get token collection with server-side caching and filtering
     */
    async getTokenCollection(options: CollektCollectionOptions): Promise<CollektCollectionResponse> {
        const { address, page = 1, pageSize = 20, forceRefresh = false } = options;

        try {
            const params = new URLSearchParams({
                address,
                page: page.toString(),
                pageSize: pageSize.toString(),
                forceRefresh: forceRefresh.toString(),
            });

            const response = await fetch(`${this.baseUrl}/api/collection?${params}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result: CollektCollectionResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Unknown API error");
            }

            return result;
        } catch (error) {
            console.error("ColleKT API error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    /**
     * Health check for the API
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/health`, {
                method: "GET",
            });
            return response.ok;
        } catch (error) {
            console.error("Health check failed:", error);
            return false;
        }
    }
}

// Export singleton instance
export const collektClient = new CollektClient();
