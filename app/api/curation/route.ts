/**
 * Server-side API route for CURATION gallery token collection data
 *
 * Handles cache-first token collection fetching for objkt.com curations
 * via the objkt → TzKT bridge pattern.
 */

import { NextRequest, NextResponse } from "next/server";
import { dataOrchestrator } from "@/lib/data/orchestrator/data-orchestrator";

/**
 * GET /api/curation
 *
 * Query params:
 * - curationId: objkt.com curation ID (integer or slug)
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20)
 * - forceRefresh: Skip cache (default: false)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const curationId = searchParams.get("curationId");
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "20");
        const forceRefresh = searchParams.get("forceRefresh") === "true";

        if (!curationId) {
            return NextResponse.json({ error: "CurationId parameter is required" }, { status: 400 });
        }

        // Use data orchestrator for cache-first CURATION gallery fetching
        // This will be implemented in Step 2
        const result = await dataOrchestrator.getCurationTokenCollection({
            curationId,
            pagination: { page, pageSize },
            forceRefresh,
            applyFilters: true,
            cacheResults: true,
        });

        return NextResponse.json({
            success: true,
            data: {
                tokens: result.tokens,
                pagination: result.pagination,
                cacheInfo: {
                    hit: result.cache.hit,
                    source: result.cache.source,
                    buildTimeMs: result.cache.buildTimeMs,
                },
                performance: {
                    totalTimeMs: result.performance.totalTimeMs,
                    fetchTimeMs: result.performance.fetchTimeMs,
                    filterTimeMs: result.performance.filterTimeMs,
                },
            },
        });
    } catch (error) {
        console.error("Curation gallery API error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
