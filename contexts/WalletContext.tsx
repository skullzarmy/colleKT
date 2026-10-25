"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import type { DAppClient } from "@tezos-x/octez.connect-sdk";
import { resolveIdentity, type ResolvedIdentity } from "@/lib/tezos/identity-resolver";

type SDKModule = typeof import("@tezos-x/octez.connect-sdk");

let sdkPromise: Promise<SDKModule> | null = null;
function loadSDK(): Promise<SDKModule> {
    if (!sdkPromise) sdkPromise = import("@tezos-x/octez.connect-sdk");
    return sdkPromise;
}

export type WalletConnectionStatus =
    | "IDLE"
    | "CONNECTING"
    | "CONNECTED"
    | "DISCONNECTING"
    | "SWITCHING_ACCOUNT"
    | "OPERATION_PENDING"
    | "ERROR";

const RPC_URL = process.env.NEXT_PUBLIC_TEZOS_RPC || "https://rpc.tzkt.io/mainnet";
const NETWORK_NAME = (process.env.NEXT_PUBLIC_TEZOS_NETWORK || "mainnet").toLowerCase();

let clientPromise: Promise<DAppClient> | null = null;
let onActiveAccount: ((address: string | null) => void) | null = null;

async function buildClient(): Promise<DAppClient> {
    const sdk = await loadSDK();
    const networkType =
        NETWORK_NAME === "ghostnet" ? sdk.NetworkType.GHOSTNET : sdk.NetworkType.MAINNET;

    const c = new sdk.DAppClient({
        name: "colleKT",
        network: {
            type: networkType,
            rpcUrl: RPC_URL,
        },
    });

    await c.subscribeToEvent(sdk.BeaconEvent.ACTIVE_ACCOUNT_SET, (account) => {
        const next = account && matchesNetwork(account) ? account.address : null;
        onActiveAccount?.(next);
    });

    return c;
}

async function getClient(): Promise<DAppClient> {
    if (!clientPromise) {
        clientPromise = buildClient().catch((e) => {
            clientPromise = null;
            throw e;
        });
    }
    return clientPromise;
}

async function resetClient(c: DAppClient): Promise<void> {
    try {
        await c.clearActiveAccount();
    } catch {
        /* already cleared */
    }
    try {
        await (c as unknown as { destroy?: () => Promise<void> }).destroy?.();
    } catch {
        /* destroy might not exist in some versions */
    }
    clientPromise = null;
}

function matchesNetwork(account: { network?: { type?: string } } | null): boolean {
    if (!account?.network) return false;
    return (account.network.type ?? "").toLowerCase() === NETWORK_NAME;
}

export interface WalletState {
    address: string | null;
    identity: ResolvedIdentity | null;
    status: WalletConnectionStatus;
    isConnected: boolean;
    error: string | null;
    client: DAppClient | null;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    switchAccount: () => Promise<void>;
    hardReset: () => Promise<void>;
    getClient: () => Promise<DAppClient>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
    const [address, setAddress] = useState<string | null>(null);
    const [identity, setIdentity] = useState<ResolvedIdentity | null>(null);
    const [status, setStatus] = useState<WalletConnectionStatus>("IDLE");
    const [error, setError] = useState<string | null>(null);
    const [clientInstance, setClientInstance] = useState<DAppClient | null>(null);

    // Register active account listener
    useEffect(() => {
        onActiveAccount = (nextAddress) => {
            setAddress(nextAddress);
            if (nextAddress) {
                setStatus("CONNECTED");
            } else {
                setStatus("IDLE");
                setIdentity(null);
            }
        };
        return () => {
            onActiveAccount = null;
        };
    }, []);

    // Resolve identity whenever address changes
    useEffect(() => {
        if (!address) {
            setIdentity(null);
            return;
        }

        let cancelled = false;
        resolveIdentity(address).then((id) => {
            if (!cancelled) setIdentity(id);
        });

        return () => {
            cancelled = true;
        };
    }, [address]);

    // Lazy session restoration: only load SDK on mount if beacon storage keys exist
    useEffect(() => {
        let cancelled = false;
        const hasSession = (() => {
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith("beacon:") || key.startsWith("octez:"))) {
                        return true;
                    }
                }
            } catch {
                /* localStorage inaccessible */
            }
            return false;
        })();

        if (!hasSession) {
            return;
        }

        void (async () => {
            try {
                const c = await getClient();
                if (!cancelled) setClientInstance(c);
                const account = await c.getActiveAccount();
                if (account && !matchesNetwork(account)) {
                    // Session is on wrong network; reset
                    await resetClient(c);
                    if (!cancelled) {
                        setAddress(null);
                        setClientInstance(null);
                        setStatus("IDLE");
                    }
                    return;
                }
                if (!cancelled && account?.address) {
                    setAddress(account.address);
                    setStatus("CONNECTED");
                }
            } catch {
                if (!cancelled) setStatus("IDLE");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const connect = useCallback(async () => {
        setStatus("CONNECTING");
        setError(null);
        try {
            const c = await getClient();
            const existing = await c.getActiveAccount();
            if (existing && matchesNetwork(existing)) {
                setAddress(existing.address);
                setStatus("CONNECTED");
                return;
            }

            let activeClient = c;
            if (existing) {
                await resetClient(c);
                activeClient = await getClient();
            }

            const sdk = await loadSDK();
            const permissions = await activeClient.requestPermissions({
                scopes: [sdk.PermissionScope.OPERATION_REQUEST],
            });

            if (permissions?.address) {
                setAddress(permissions.address);
                setClientInstance(activeClient);
                setStatus("CONNECTED");
            } else {
                const acc = await activeClient.getActiveAccount();
                setAddress(acc?.address ?? null);
                setClientInstance(activeClient);
                setStatus(acc?.address ? "CONNECTED" : "IDLE");
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Connection failed";
            // Check for user abortion/cancellation
            if (
                msg.toLowerCase().includes("aborted") ||
                msg.toLowerCase().includes("rejected") ||
                msg.toLowerCase().includes("closed")
            ) {
                setStatus("IDLE");
                setError(null);
            } else {
                setStatus("ERROR");
                setError(msg);
            }
        }
    }, []);

    const disconnect = useCallback(async () => {
        setStatus("DISCONNECTING");
        try {
            const c = await getClient();
            await c.clearActiveAccount();
        } catch {
            /* ignore clearing failure */
        }
        setAddress(null);
        setIdentity(null);
        setStatus("IDLE");
    }, []);

    const switchAccount = useCallback(async () => {
        setStatus("SWITCHING_ACCOUNT");
        setError(null);
        try {
            const c = await getClient();
            const sdk = await loadSDK();
            const permissions = await c.requestPermissions({
                scopes: [sdk.PermissionScope.OPERATION_REQUEST],
            });
            if (permissions?.address) {
                setAddress(permissions.address);
                setStatus("CONNECTED");
            } else {
                const acc = await c.getActiveAccount();
                setAddress(acc?.address ?? null);
                setStatus(acc?.address ? "CONNECTED" : "IDLE");
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to switch account";
            if (
                msg.toLowerCase().includes("aborted") ||
                msg.toLowerCase().includes("rejected") ||
                msg.toLowerCase().includes("closed")
            ) {
                setStatus(address ? "CONNECTED" : "IDLE");
                setError(null);
            } else {
                setStatus("ERROR");
                setError(msg);
            }
        }
    }, [address]);

    const hardReset = useCallback(async () => {
        setStatus("DISCONNECTING");
        try {
            if (clientPromise) {
                const c = await clientPromise.catch(() => null);
                if (c) await resetClient(c);
            }
        } catch {
            /* ignore */
        }

        // Purge beacon storage keys
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (k.startsWith("beacon:") || k.startsWith("octez:"))) {
                    keysToRemove.push(k);
                }
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch {
            /* ignore */
        }

        setAddress(null);
        setIdentity(null);
        setClientInstance(null);
        setError(null);
        setStatus("IDLE");
    }, []);

    const isConnected = Boolean(address) && status === "CONNECTED";

    const value = useMemo<WalletState>(
        () => ({
            address,
            identity,
            status,
            isConnected,
            error,
            client: clientInstance,
            connect,
            disconnect,
            switchAccount,
            hardReset,
            getClient,
        }),
        [address, identity, status, isConnected, error, clientInstance, connect, disconnect, switchAccount, hardReset]
    );

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
    const ctx = useContext(WalletContext);
    if (!ctx) {
        throw new Error("useWallet must be used inside WalletProvider");
    }
    return ctx;
}
