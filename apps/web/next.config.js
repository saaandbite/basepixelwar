import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from monorepo root
dotenv.config({ path: path.join(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ["@repo/ui"],
    reactStrictMode: false,
    turbopack: {
        root: path.join(__dirname, '../../'),
    },
    env: {
        NEXT_PUBLIC_TOURNAMENT_ADDRESS: process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS,
        NEXT_PUBLIC_GAME_VAULT_ADDRESS: process.env.NEXT_PUBLIC_GAME_VAULT_ADDRESS,
        NEXT_PUBLIC_PIXEL_TROPHY_ADDRESS: process.env.NEXT_PUBLIC_PIXEL_TROPHY_ADDRESS,
        NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:3000/api/:path*',
            },
            {
                source: '/socket.io/:path*',
                destination: 'http://localhost:3000/socket.io/:path*',
            }
        ];
    }
};

export default nextConfig;