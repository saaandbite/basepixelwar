import { createPublicClient, http, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL)
});

interface VerifyOptions {
    txHash: string;
    sender: string;
    amount: string; // ETH amount as string, e.g. "0.001"
    toAddress?: string; // Optional, defaults to finding loosely or strict check
}

/**
 * Verify a transaction on-chain
 */
export async function verifyTransaction(opts: VerifyOptions): Promise<boolean> {
    const { txHash, sender, amount, toAddress } = opts;

    try {
        const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

        // 1. Check status
        if (receipt.status !== 'success') {
            console.error(`[TxVerify] Tx ${txHash} failed on-chain`);
            return false;
        }

        // 2. Check Sender
        if (tx.from.toLowerCase() !== sender.toLowerCase()) {
            console.error(`[TxVerify] Sender mismatch: ${tx.from} vs ${sender}`);
            return false;
        }

        // 3. Check Receiver (if specified)
        if (toAddress && tx.to?.toLowerCase() !== toAddress.toLowerCase()) {
            console.error(`[TxVerify] Receiver mismatch: ${tx.to} vs ${toAddress}`);
            return false;
        }

        // 4. Check Value
        const expectedValue = parseEther(amount);
        if (tx.value < expectedValue) {
            console.error(`[TxVerify] Value too low: ${tx.value} < ${expectedValue}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`[TxVerify] Verification failed:`, error);
        return false;
    }
}
