"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Wallet,
    Loader2,
    Copy,
    Check,
    LogOut,
    ExternalLink,
    RefreshCw,
    UserCheck,
    AlertCircle,
} from "lucide-react";
import { formatAddress } from "@/lib/tezos/identity-resolver";

export default function WalletButton() {
    const { address, identity, status, error, connect, disconnect, switchAccount, hardReset } =
        useWallet();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!address) return;
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (status === "CONNECTING" || status === "SWITCHING_ACCOUNT" || status === "DISCONNECTING") {
        return (
            <Button
                variant="outline"
                disabled
                className="min-h-[44px] px-4 text-sm font-medium border-zinc-700 bg-zinc-900 text-zinc-200 cursor-wait"
                aria-live="polite"
                aria-label="Connecting to Tezos wallet..."
            >
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-cyan-400" aria-hidden="true" />
                <span>
                    {status === "SWITCHING_ACCOUNT"
                        ? "Switching..."
                        : status === "DISCONNECTING"
                        ? "Disconnecting..."
                        : "Connecting..."}
                </span>
            </Button>
        );
    }

    if (status === "CONNECTED" && address) {
        const displayName = identity?.displayName || formatAddress(address);
        const sourceBadge = identity?.source === "tezos-domains"
            ? "tez"
            : identity?.source === "hacktez"
            ? "hack.tez"
            : identity?.source === "tzkt"
            ? "tzkt"
            : identity?.source === "objkt"
            ? "objkt"
            : null;

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="min-h-[44px] px-3.5 py-2 text-sm font-medium border-zinc-700 bg-zinc-900/90 text-zinc-100 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-colors"
                        aria-label={`Wallet connected as ${displayName}. Open wallet menu`}
                    >
                        <UserCheck className="w-4 h-4 mr-2 text-emerald-400" aria-hidden="true" />
                        <span className="font-semibold tracking-wide">{displayName}</span>
                        {sourceBadge && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono uppercase font-bold rounded bg-zinc-800 text-cyan-300 border border-zinc-700">
                                {sourceBadge}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-64 bg-zinc-950 border-zinc-800 text-zinc-200 p-2 shadow-2xl"
                >
                    <DropdownMenuLabel className="px-2 py-1.5 text-xs text-zinc-400 font-normal">
                        Connected Tezos Account
                    </DropdownMenuLabel>
                    <div className="px-2 py-1 mb-2 bg-zinc-900/80 rounded border border-zinc-800/80 flex items-center justify-between">
                        <span className="font-mono text-xs text-zinc-300 font-medium truncate mr-2">
                            {formatAddress(address)}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopy}
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-white"
                            aria-label={copied ? "Address copied" : "Copy full address"}
                        >
                            {copied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                                <Copy className="w-3.5 h-3.5" />
                            )}
                        </Button>
                    </div>

                    <DropdownMenuItem asChild>
                        <Link
                            href={`/gallery/${address}`}
                            className="flex items-center px-2 py-2 text-sm rounded cursor-pointer text-zinc-200 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800 focus:text-white data-[highlighted]:bg-zinc-800 data-[highlighted]:text-white"
                        >
                            <ExternalLink className="w-4 h-4 mr-2 text-cyan-400" />
                            <span>My 3D Gallery</span>
                        </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={switchAccount}
                        className="flex items-center px-2 py-2 text-sm rounded cursor-pointer text-zinc-200 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800 focus:text-white data-[highlighted]:bg-zinc-800 data-[highlighted]:text-white"
                    >
                        <RefreshCw className="w-4 h-4 mr-2 text-zinc-400" />
                        <span>Switch Account</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-zinc-800 my-1" />

                    <DropdownMenuItem
                        onClick={disconnect}
                        className="flex items-center px-2 py-2 text-sm rounded cursor-pointer text-zinc-200 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800 focus:text-white data-[highlighted]:bg-zinc-800 data-[highlighted]:text-white"
                    >
                        <LogOut className="w-4 h-4 mr-2 text-zinc-400" />
                        <span>Disconnect</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={hardReset}
                        className="flex items-center px-2 py-1.5 text-xs rounded cursor-pointer text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 focus:bg-zinc-900 focus:text-amber-300 data-[highlighted]:bg-zinc-900 data-[highlighted]:text-amber-300"
                        title="Purges local session and beacon storage if connection is stuck"
                    >
                        <RefreshCw className="w-3.5 h-3.5 mr-2 text-amber-400/80" />
                        <span>Reset Connection</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    if (status === "ERROR" && error) {
        return (
            <div className="flex items-center space-x-2">
                <Button
                    onClick={connect}
                    variant="outline"
                    className="min-h-[44px] px-3.5 py-2 text-sm font-medium border-red-800/80 bg-red-950/40 text-red-200 hover:bg-red-900/60 hover:text-white focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label={`Connection error: ${error}. Click to retry`}
                >
                    <AlertCircle className="w-4 h-4 mr-2 text-red-400" />
                    <span>Retry Connect</span>
                </Button>
                <Button
                    onClick={hardReset}
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] text-xs text-zinc-400 hover:text-zinc-200"
                    title="Hard reset session"
                >
                    Reset
                </Button>
            </div>
        );
    }

    return (
        <Button
            onClick={connect}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-black bg-white hover:bg-zinc-200 hover:text-black border border-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all shadow-md active:scale-95"
            aria-label="Connect Tezos wallet via Octez.Connect"
        >
            <Wallet className="w-4 h-4 mr-2 text-black" aria-hidden="true" />
            <span>Connect Wallet</span>
        </Button>
    );
}
