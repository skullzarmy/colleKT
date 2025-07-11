/**
 * Objkt.com GraphQL Client
 *
 * A robust GraphQL connector for objkt.com API with:
 * - Error handling and retry logic
 * - Type safety for responses
 * - Standardized response formats
 * - Logging for debugging
 */

/**
 * Configuration options for the Objkt client
 */
export interface ObjktClientConfig {
    endpoint?: string;
    maxRetries?: number;
    retryDelayMs?: number;
    enableLogging?: boolean;
    timeout?: number;
}

/**
 * GraphQL query variables
 */
export interface GraphQLVariables {
    [key: string]: any;
}

/**
 * GraphQL response wrapper
 */
export interface GraphQLResponse<T = any> {
    data?: T;
    errors?: Array<{
        message: string;
        locations?: Array<{
            line: number;
            column: number;
        }>;
        path?: string[];
        extensions?: any;
    }>;
    extensions?: any;
}

/**
 * Objkt client response with metadata
 */
export interface ObjktResponse<T = any> {
    data: T;
    timing: {
        fetchedAt: Date;
        duration: number;
    };
    source: {
        provider: "objkt";
        endpoint: string;
        query: string;
    };
}

/**
 * Error class for Objkt operations
 */
export class ObjktError extends Error {
    public readonly operation: string;
    public readonly query?: string;
    public readonly variables?: GraphQLVariables;
    public readonly originalError?: Error;
    public readonly statusCode?: number;
    public readonly graphqlErrors?: any[];

    constructor(
        message: string,
        operation: string,
        query?: string,
        variables?: GraphQLVariables,
        originalError?: Error,
        statusCode?: number,
        graphqlErrors?: any[]
    ) {
        super(message);
        this.name = "ObjktError";
        this.operation = operation;
        this.query = query;
        this.variables = variables;
        this.originalError = originalError;
        this.statusCode = statusCode;
        this.graphqlErrors = graphqlErrors;
    }
}

/**
 * Rate limiting error
 */
export class ObjktRateLimitError extends ObjktError {
    constructor(operation: string, retryAfterSeconds?: number) {
        super(
            `Objkt API rate limited during ${operation}${
                retryAfterSeconds ? `. Retry after ${retryAfterSeconds}s` : ""
            }`,
            operation
        );
        this.name = "ObjktRateLimitError";
    }
}

/**
 * Timeout error
 */
export class ObjktTimeoutError extends ObjktError {
    constructor(operation: string, timeoutMs: number) {
        super(`Objkt API timed out after ${timeoutMs}ms during ${operation}`, operation);
        this.name = "ObjktTimeoutError";
    }
}

/**
 * Objkt GraphQL Client
 */
export class ObjktClient {
    private config: Required<ObjktClientConfig>;

    constructor(config: ObjktClientConfig = {}) {
        this.config = {
            endpoint: "https://data.objkt.com/v3/graphql",
            maxRetries: 3,
            retryDelayMs: 1000,
            enableLogging: true,
            timeout: 30000, // 30 seconds
            ...config,
        };
    }

    /**
     * Log messages if logging is enabled
     */
    private log(level: "info" | "error" | "warn", message: string, data?: any) {
        if (!this.config.enableLogging) return;

        const timestamp = new Date().toISOString();
        const prefix = `[ObjktClient ${timestamp}]`;

        switch (level) {
            case "error":
                console.error(`${prefix} ERROR: ${message}`, data || "");
                break;
            case "warn":
                console.warn(`${prefix} WARN: ${message}`, data || "");
                break;
            default:
                console.log(`${prefix} ${message}`, data || "");
        }
    }

    /**
     * Sleep utility for retries
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Execute a GraphQL query with retry logic
     */
    async query<T = any>(
        query: string,
        variables?: GraphQLVariables,
        operationName?: string
    ): Promise<ObjktResponse<T>> {
        const operation = operationName || "GraphQL Query";
        const startTime = Date.now();
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                this.log("info", `${operation} - Attempt ${attempt}/${this.config.maxRetries}`);

                const response = await this.executeQuery(query, variables);
                const duration = Date.now() - startTime;

                // Check for GraphQL errors
                if (response.errors && response.errors.length > 0) {
                    throw new ObjktError(
                        `GraphQL errors: ${response.errors.map((e) => e.message).join(", ")}`,
                        operation,
                        query,
                        variables,
                        undefined,
                        undefined,
                        response.errors
                    );
                }

                // Check if data is present
                if (!response.data) {
                    throw new ObjktError("No data returned from GraphQL query", operation, query, variables);
                }

                this.log("info", `${operation} - Success on attempt ${attempt} (${duration}ms)`);

                return {
                    data: response.data,
                    timing: {
                        fetchedAt: new Date(),
                        duration,
                    },
                    source: {
                        provider: "objkt",
                        endpoint: this.config.endpoint,
                        query: query.substring(0, 200) + (query.length > 200 ? "..." : ""),
                    },
                };
            } catch (error) {
                lastError = error as Error;
                this.log("warn", `${operation} - Failed attempt ${attempt}`, error);

                // Don't retry on certain error types
                if (error instanceof ObjktRateLimitError || error instanceof ObjktTimeoutError) {
                    throw error;
                }

                if (attempt < this.config.maxRetries) {
                    const delay = this.config.retryDelayMs * attempt;
                    this.log("info", `${operation} - Retrying in ${delay}ms`);
                    await this.sleep(delay);
                }
            }
        }

        throw new ObjktError(
            `${operation} failed after ${this.config.maxRetries} attempts. Last error: ${
                lastError?.message || "Unknown error"
            }`,
            operation,
            query,
            variables,
            lastError || undefined
        );
    }

    /**
     * Execute the actual HTTP request to the GraphQL endpoint
     */
    private async executeQuery(query: string, variables?: GraphQLVariables): Promise<GraphQLResponse> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(this.config.endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    query,
                    variables: variables || {},
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get("Retry-After");
                const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
                throw new ObjktRateLimitError("query", retryAfterSeconds);
            }

            // Handle other HTTP errors
            if (!response.ok) {
                throw new ObjktError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    "query",
                    query,
                    variables,
                    undefined,
                    response.status
                );
            }

            const result: GraphQLResponse = await response.json();
            return result;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === "AbortError") {
                throw new ObjktTimeoutError("query", this.config.timeout);
            }

            throw error;
        }
    }

    /**
     * Health check method to verify API connectivity
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Simple introspection query to test connectivity
            const testQuery = `
                query HealthCheck {
                    __schema {
                        queryType {
                            name
                        }
                    }
                }
            `;

            await this.query(testQuery, {}, "HealthCheck");
            return true;
        } catch (error) {
            this.log("error", "Health check failed", error);
            return false;
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): Readonly<Required<ObjktClientConfig>> {
        return { ...this.config };
    }

    /**
     * Update configuration (creates new client instance)
     */
    withConfig(newConfig: Partial<ObjktClientConfig>): ObjktClient {
        return new ObjktClient({ ...this.config, ...newConfig });
    }
}

/**
 * Default client instance
 */
export const objktClient = new ObjktClient();

/**
 * Create a new client instance with custom configuration
 */
export function createObjktClient(config: ObjktClientConfig = {}): ObjktClient {
    return new ObjktClient(config);
}

/**
 * Utility function for quick queries without creating a client instance
 */
export async function queryObjkt<T = any>(
    query: string,
    variables?: GraphQLVariables,
    config?: ObjktClientConfig
): Promise<ObjktResponse<T>> {
    const client = config ? createObjktClient(config) : objktClient;
    return client.query<T>(query, variables);
}
