import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";

export default function CurationNotFound() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <div className="max-w-md text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-white">404</h1>
                    <h2 className="text-xl text-white">Curation Not Found</h2>
                    <p className="text-gray-400">The curation you're looking for doesn't exist or has been removed.</p>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-gray-500">Make sure your curation ID is correct. It should be:</p>
                    <ul className="text-sm text-gray-400 space-y-1">
                        <li>• A numeric ID (e.g., 146288)</li>
                        <li>• An 8-character hex slug (e.g., b264a749)</li>
                        <li>• A full UUID (e.g., b264a749-2674-4baa-bc7c-b5ed8bafe54a)</li>
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
