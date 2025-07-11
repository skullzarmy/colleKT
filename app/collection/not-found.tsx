import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";

export default function CollectionNotFound() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <div className="max-w-md text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-white">404</h1>
                    <h2 className="text-xl text-white">Collection Not Found</h2>
                    <p className="text-gray-400">The collection you're looking for doesn't exist or has no NFTs.</p>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-gray-500">Make sure your contract address is correct. It should be:</p>
                    <ul className="text-sm text-gray-400 space-y-1">
                        <li>• A valid Tezos contract address</li>
                        <li>• Starting with "KT1" followed by 33 characters</li>
                        <li>• Example: KT1CwhbbmyryfaJf1MaYwH5AWpy43LWnAYfy</li>
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild className="bg-cyan-500 hover:bg-cyan-600">
                        <Link href="/">
                            <Search className="w-4 h-4 mr-2" />
                            Search Again
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="text-white border-white/20 hover:bg-white/10">
                        <Link href="/gallery">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Browse Galleries
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
