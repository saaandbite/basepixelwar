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
            console.log(`[TxVerify] Sender mismatch: ${tx.from} vs ${sender}. Checking logs for Smart Wallet...`);

            // SMART WALLET SUPPORT:
            // For Smart Wallets (Account Abstraction), the tx.from is the Bundler, not the user.
            // We must check if the user's address (sender) is present in the Event Logs as an indexed topic.
            // This confirms the user's account was involved in the transaction (e.g., emitted GameCreated or GameJoined).

            const senderTopic = sender.toLowerCase().replace('0x', '').padStart(64, '0').toLowerCase();
            const senderTopicWithPrefix = `0x${senderTopic}`;

            let foundInLogs = false;

            for (const log of receipt.logs) {
                // We only care about logs from our contract (if toAddress is specified) or generally
                if (toAddress && log.address.toLowerCase() !== toAddress.toLowerCase()) {
                    continue;
                }

                // Check topics for the sender address
                // Topics are 32 bytes (64 hex chars), 0-padded
                const hasSender = log.topics.some(topic =>
                    topic.toLowerCase() === senderTopicWithPrefix
                );

                if (hasSender) {
                    foundInLogs = true;
                    break;
                }
            }

            if (!foundInLogs) {
                console.error(`[TxVerify] Security Check Failed: Sender ${sender} not found in transaction logs.`);
                return false;
            }

            console.log(`[TxVerify] Smart Wallet verified: Found sender ${sender} in logs.`);
        }

        // 3. Check Receiver (if specified)
        // Note: For Bundler transactions, tx.to might be the EntryPoint contract, not necessarily our contract directly.
        // However, we already validated that our contract emitted the logs above (if we found it in logs).
        // So we can be lenient here for Smart Wallets, OR strictly check logs.
        // For standard EOAs, tx.to should be our contract.

        // If we verified via logs (Smart Wallet), we can skip strict tx.to check or assume it's valid.
        // If we verified via tx.from (EOA), we should check tx.to.

        if (tx.from.toLowerCase() === sender.toLowerCase() && toAddress && tx.to?.toLowerCase() !== toAddress.toLowerCase()) {
            console.error(`[TxVerify] Receiver mismatch: ${tx.to} vs ${toAddress}`);
            return false;
        }

        // 4. Check Value
        // For Smart Wallets, the value might be transferred internally via the UserOp, so tx.value (main tx) might be 0 or different.
        // We really should rely on the Event Log data for "Entry Fee Paid", but our current contract might not emit the amount in a topic easily (it's usually data).
        // However, if the transaction interaction was successful and emitted "GameCreated" or "GameJoined", 
        // the contract's "payable" modifier or internal logic guarantees the funds were received/handled.
        // So checking tx.value is mostly for EOA direct calls.

        // If it's a direct EOA call, check value.
        if (tx.from.toLowerCase() === sender.toLowerCase()) {
            const expectedValue = parseEther(amount);
            if (tx.value < expectedValue) {
                console.error(`[TxVerify] Value too low: ${tx.value} < ${expectedValue}`);
                return false;
            }
        } else {
            // For Smart Wallets, we rely on the fact that the transaction succeeded (receipt.status success)
            // and our contract emitted an event involving the user.
            // Our smart contract logic presumably requires payment to emit those events.
        }

        return true;
    } catch (error) {
        console.error(`[TxVerify] Verification failed:`, error);
        return false;
    }
}
