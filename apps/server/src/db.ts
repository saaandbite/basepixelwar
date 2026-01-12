// apps/server/src/db.ts
// TigerBeetle client & financial ledger service

import { createClient, Account, Transfer, CreateAccountError, CreateTransferError } from 'tigerbeetle-node';
import { getAccountIdByWallet, setWalletMapping } from './redis';

// TigerBeetle client instance
let tbClient: ReturnType<typeof createClient> | null = null;

// Ledger codes (account types)
const LEDGER = {
    PLAYER: 1n,    // Player balance accounts
    TREASURY: 2n,  // Platform treasury account
} as const;

// Account flags
const ACCOUNT_FLAGS = {
    LINKED: 1 << 0,
    DEBITS_MUST_NOT_EXCEED_CREDITS: 1 << 1,
    CREDITS_MUST_NOT_EXCEED_DEBITS: 1 << 2,
} as const;

// Transfer flags
const TRANSFER_FLAGS = {
    LINKED: 1 << 0,
    PENDING: 1 << 1,
    POST_PENDING_TRANSFER: 1 << 2,
    VOID_PENDING_TRANSFER: 1 << 3,
} as const;

// Treasury account ID (fixed)
const TREASURY_ACCOUNT_ID = 1n;

// Account ID generator (simple incremental for now)
let nextAccountId = 1000n;

// Configuration
// Format: Just port number (interpreted as 127.0.0.1:PORT) or "host:port"
const TB_CONFIG = {
    cluster_id: 0n,
    replica_addresses: [
        process.env.TIGERBEETLE_PORT || '3005'
    ],
};

// ============================================
// CONNECTION MANAGEMENT
// ============================================

export async function initTigerBeetle(): Promise<void> {
    if (tbClient) {
        console.log('[TigerBeetle] Already connected');
        return;
    }

    try {
        tbClient = createClient(TB_CONFIG);
        console.log('[TigerBeetle] ✅ Connected to TigerBeetle at', TB_CONFIG.replica_addresses[0]);

        // Ensure treasury account exists
        await ensureTreasuryAccount();
    } catch (err) {
        console.error('[TigerBeetle] ❌ Connection error:', err);
        throw err;
    }
}

export function getTigerBeetle() {
    if (!tbClient) {
        throw new Error('TigerBeetle not initialized. Call initTigerBeetle() first.');
    }
    return tbClient;
}

export async function closeTigerBeetle(): Promise<void> {
    if (tbClient) {
        tbClient.destroy();
        tbClient = null;
        console.log('[TigerBeetle] Disconnected');
    }
}

// ============================================
// TREASURY ACCOUNT
// ============================================

async function ensureTreasuryAccount(): Promise<void> {
    const client = getTigerBeetle();

    // Check if treasury exists
    const accounts = await client.lookupAccounts([TREASURY_ACCOUNT_ID]);

    if (accounts.length === 0) {
        // Create treasury account
        const treasuryAccount: Account = {
            id: TREASURY_ACCOUNT_ID,
            debits_pending: 0n,
            debits_posted: 0n,
            credits_pending: 0n,
            credits_posted: 0n,
            user_data_128: 0n,
            user_data_64: 0n,
            user_data_32: 0,
            reserved: 0,
            ledger: Number(LEDGER.TREASURY),
            code: 1, // Treasury code
            flags: 0,
            timestamp: 0n,
        };

        const errors = await client.createAccounts([treasuryAccount]);

        if (errors.length > 0 && errors[0].result !== CreateAccountError.exists) {
            console.error('[TigerBeetle] Failed to create treasury account:', errors);
            throw new Error('Failed to create treasury account');
        }

        console.log('[TigerBeetle] Treasury account created (ID: 1)');
    } else {
        console.log('[TigerBeetle] Treasury account exists');
    }
}

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

/**
 * Generate a unique account ID
 */
function generateAccountId(): bigint {
    nextAccountId += 1n;
    // Combine with timestamp for uniqueness
    const timestamp = BigInt(Date.now());
    return (timestamp << 32n) | nextAccountId;
}

/**
 * Create a new player account
 */
export async function createPlayerAccount(walletAddress: string): Promise<bigint> {
    const client = getTigerBeetle();
    const accountId = generateAccountId();

    const account: Account = {
        id: accountId,
        debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        user_data_128: 0n, // Could store wallet hash here
        user_data_64: 0n,
        user_data_32: 0,
        reserved: 0,
        ledger: Number(LEDGER.PLAYER),
        code: 1, // Player account code
        flags: 0, // Allow overdrafts for now (game logic handles limits)
        timestamp: 0n,
    };

    const errors = await client.createAccounts([account]);

    if (errors.length > 0) {
        console.error('[TigerBeetle] Failed to create player account:', errors);
        throw new Error(`Failed to create account: ${CreateAccountError[errors[0].result]}`);
    }

    // Store mapping in Redis
    await setWalletMapping(walletAddress, accountId);

    console.log(`[TigerBeetle] Created player account ${accountId} for ${walletAddress}`);
    return accountId;
}

/**
 * Get or create account for wallet address
 */
export async function getOrCreateAccount(walletAddress: string): Promise<bigint> {
    // Check Redis first
    const existingId = await getAccountIdByWallet(walletAddress);

    if (existingId) {
        return existingId;
    }

    // Create new account
    return createPlayerAccount(walletAddress);
}

/**
 * Get account balance (credits - debits)
 */
export async function getAccountBalance(accountId: bigint): Promise<bigint> {
    const client = getTigerBeetle();
    const accounts = await client.lookupAccounts([accountId]);

    if (accounts.length === 0) {
        return 0n;
    }

    const account = accounts[0];
    // Balance = credits_posted - debits_posted
    return account.credits_posted - account.debits_posted;
}

/**
 * Get account details
 */
export async function getAccountDetails(accountId: bigint): Promise<Account | null> {
    const client = getTigerBeetle();
    const accounts = await client.lookupAccounts([accountId]);

    if (accounts.length === 0) {
        return null;
    }

    return accounts[0];
}

// ============================================
// TRANSFERS
// ============================================

/**
 * Generate unique transfer ID
 */
function generateTransferId(): bigint {
    const timestamp = BigInt(Date.now());
    const random = BigInt(Math.floor(Math.random() * 1000000));
    return (timestamp << 20n) | random;
}

/**
 * Record a deposit (on-chain -> off-chain)
 * Credits the player's TigerBeetle account
 */
export async function recordDeposit(
    walletAddress: string,
    amount: bigint,
    txHash?: string
): Promise<bigint> {
    const client = getTigerBeetle();
    const accountId = await getOrCreateAccount(walletAddress);
    const transferId = generateTransferId();

    // Deposit: Treasury -> Player (credits player)
    const transfer: Transfer = {
        id: transferId,
        debit_account_id: TREASURY_ACCOUNT_ID,
        credit_account_id: accountId,
        amount: amount,
        pending_id: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        timeout: 0,
        ledger: Number(LEDGER.PLAYER),
        code: 1, // Deposit code
        flags: 0,
        timestamp: 0n,
    };

    const errors = await client.createTransfers([transfer]);

    if (errors.length > 0) {
        console.error('[TigerBeetle] Deposit failed:', errors);
        throw new Error(`Deposit failed: ${CreateTransferError[errors[0].result]}`);
    }

    console.log(`[TigerBeetle] Deposit ${amount} to ${walletAddress} (Account: ${accountId})`);
    return transferId;
}

/**
 * Record a withdrawal (off-chain -> on-chain)
 * Debits the player's TigerBeetle account
 */
export async function recordWithdraw(
    walletAddress: string,
    amount: bigint
): Promise<bigint> {
    const client = getTigerBeetle();
    const accountId = await getAccountIdByWallet(walletAddress);

    if (!accountId) {
        throw new Error('Account not found for wallet');
    }

    // Check balance
    const balance = await getAccountBalance(accountId);
    if (balance < amount) {
        throw new Error('Insufficient balance');
    }

    const transferId = generateTransferId();

    // Withdraw: Player -> Treasury (debits player)
    const transfer: Transfer = {
        id: transferId,
        debit_account_id: accountId,
        credit_account_id: TREASURY_ACCOUNT_ID,
        amount: amount,
        pending_id: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        timeout: 0,
        ledger: Number(LEDGER.PLAYER),
        code: 2, // Withdraw code
        flags: 0,
        timestamp: 0n,
    };

    const errors = await client.createTransfers([transfer]);

    if (errors.length > 0) {
        console.error('[TigerBeetle] Withdrawal failed:', errors);
        throw new Error(`Withdrawal failed: ${CreateTransferError[errors[0].result]}`);
    }

    console.log(`[TigerBeetle] Withdraw ${amount} from ${walletAddress}`);
    return transferId;
}

/**
 * Transfer prize between players
 * Used for game outcomes
 */
export async function transferPrize(
    fromAccountId: bigint,
    toAccountId: bigint,
    amount: bigint,
    gameId?: number
): Promise<bigint> {
    const client = getTigerBeetle();
    const transferId = generateTransferId();

    const transfer: Transfer = {
        id: transferId,
        debit_account_id: fromAccountId,
        credit_account_id: toAccountId,
        amount: amount,
        pending_id: 0n,
        user_data_128: gameId ? BigInt(gameId) : 0n,
        user_data_64: 0n,
        user_data_32: 0,
        timeout: 0,
        ledger: Number(LEDGER.PLAYER),
        code: 3, // Prize transfer code
        flags: 0,
        timestamp: 0n,
    };

    const errors = await client.createTransfers([transfer]);

    if (errors.length > 0) {
        console.error('[TigerBeetle] Prize transfer failed:', errors);
        throw new Error(`Prize transfer failed: ${CreateTransferError[errors[0].result]}`);
    }

    console.log(`[TigerBeetle] Prize ${amount} transferred: ${fromAccountId} -> ${toAccountId}`);
    return transferId;
}

/**
 * Collect treasury fee
 * Used when taking platform fee from prize pool
 */
export async function collectTreasuryFee(
    fromAccountId: bigint,
    amount: bigint,
    gameId?: number
): Promise<bigint> {
    const client = getTigerBeetle();
    const transferId = generateTransferId();

    const transfer: Transfer = {
        id: transferId,
        debit_account_id: fromAccountId,
        credit_account_id: TREASURY_ACCOUNT_ID,
        amount: amount,
        pending_id: 0n,
        user_data_128: gameId ? BigInt(gameId) : 0n,
        user_data_64: 0n,
        user_data_32: 0,
        timeout: 0,
        ledger: Number(LEDGER.TREASURY),
        code: 4, // Fee collection code
        flags: 0,
        timestamp: 0n,
    };

    const errors = await client.createTransfers([transfer]);

    if (errors.length > 0) {
        console.error('[TigerBeetle] Fee collection failed:', errors);
        throw new Error(`Fee collection failed: ${CreateTransferError[errors[0].result]}`);
    }

    console.log(`[TigerBeetle] Fee ${amount} collected to treasury`);
    return transferId;
}

// ============================================
// UTILITY
// ============================================

/**
 * Get treasury balance
 */
export async function getTreasuryBalance(): Promise<bigint> {
    return getAccountBalance(TREASURY_ACCOUNT_ID);
}

/**
 * Get player balance by wallet address
 */
export async function getPlayerBalance(walletAddress: string): Promise<bigint> {
    const accountId = await getAccountIdByWallet(walletAddress);
    if (!accountId) {
        return 0n;
    }
    return getAccountBalance(accountId);
}
