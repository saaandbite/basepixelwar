
import { createWalletClient, http, publicActions, getContract, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const TROPHY_ADDRESS = '0xb48D990414aFac3C157c41E107523b6b3D359c2D'; 
const USER_ADDRESS = '0xa4d58c37468dd13f1f33f5f2b3c511dff479ea66'; // From logs

const TROPHY_ABI = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)', 
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function tokenCounter() view returns (uint256)'
]);

async function main() {
    console.log('=== CHECK NFT OWNERSHIP ===');
    
    const client = createWalletClient({
        chain: baseSepolia,
        transport: http(RPC_URL)
    }).extend(publicActions);

    console.log(`Checking for User: ${USER_ADDRESS}`);
    console.log(`Contract: ${TROPHY_ADDRESS}`);

    const trophy = getContract({
        address: TROPHY_ADDRESS,
        abi: TROPHY_ABI,
        client
    });

    try {
        // 1. Check Balance
        const balance = await trophy.read.balanceOf([USER_ADDRESS]);
        console.log(`\nUser Balance: ${balance.toString()} NFT(s)`);

        if (Number(balance) > 0) {
            // Since it's ERC721URIStorage/ERC721Enumerable might not be implemented, 
            // we might have to scan or guess, but let's see if metadata is there.
            // PixelTrophy.sol inherits ERC721URIStorage, which doesn't have tokenOfOwnerByIndex by default 
            // unless ERC721Enumerable is also inherited.
            // Let's check the counter to guess the ID.
            
            const counter = await trophy.read.tokenCounter();
            console.log(`Total Minted (Counter): ${counter.toString()}`);

            // Basic hack: check the last few IDs to see if owned by user
            const max = Number(counter);
            let found = false;
            
            for (let i = Math.max(0, max - 5); i < max; i++) {
                try {
                    const owner = await trophy.read.ownerOf([BigInt(i)]);
                    if (owner.toLowerCase() === USER_ADDRESS.toLowerCase()) {
                        console.log(`\n✅ FOUND NFT!`);
                        console.log(`Token ID: ${i}`);
                        const uri = await trophy.read.tokenURI([BigInt(i)]);
                        console.log(`Token URI: ${uri}`);
                        found = true;
                    }
                } catch (e) {
                    // ignore burned or invalid
                }
            }
            
            if (!found) {
                console.log('User has balance but could not identify specific Token ID in recent range.');
            }

        } else {
            console.log('❌ User has 0 NFTs.');
            console.log('Check if transaction actually succeeded on explorer.');
        }

    } catch (error: any) {
        console.error('Error reading contract:', error.message || error);
    }
}

main().catch(console.error);
