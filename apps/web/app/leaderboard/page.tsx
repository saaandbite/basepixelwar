"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Coins } from "lucide-react";
import styles from "./leaderboard.module.css";

interface LeaderboardEntry {
    wallet: string;
    walletFormatted: string;
    username: string;
    score: number;
}

type LeaderboardType = "eth" | "wins";

export default function LeaderboardPage() {
    const [type, setType] = useState<LeaderboardType>("eth");
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLeaderboard();
    }, [type]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        setError(null);

        try {
            const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
            const response = await fetch(`${serverUrl}/leaderboard?type=${type}`);

            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const formatScore = (score: number) => {
        if (type === 'eth') {
            // Convert wei to ETH
            const eth = score / 1e18;
            return `${eth.toFixed(5)} ETH`;
        }
        return score.toString();
    };

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGrid} />
            <div className={styles.glowOrb1} />
            <div className={styles.glowOrb2} />

            <main className={styles.main}>
                {/* Header */}
                <div className={styles.header}>
                    <Link href="/" className={styles.backButton}>
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </Link>

                    <h1 className={styles.title}>
                        <Trophy className={styles.titleIcon} />
                        Leaderboard
                    </h1>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${type === 'eth' ? styles.tabActive : ''}`}
                        onClick={() => setType('eth')}
                    >
                        <Coins className="w-5 h-5" />
                        Top Prize Winners
                    </button>
                    <button
                        className={`${styles.tab} ${type === 'wins' ? styles.tabActive : ''}`}
                        onClick={() => setType('wins')}
                    >
                        <Trophy className="w-5 h-5" />
                        Most Wins
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {loading && (
                        <div className={styles.loading}>Loading...</div>
                    )}

                    {error && (
                        <div className={styles.error}>Error: {error}</div>
                    )}

                    {!loading && !error && data.length === 0 && (
                        <div className={styles.empty}>No data yet. Be the first to win!</div>
                    )}

                    {!loading && !error && data.length > 0 && (
                        <div className={styles.table}>
                            <div className={styles.tableHeader}>
                                <div className={styles.rankCol}>Rank</div>
                                <div className={styles.playerCol}>Player</div>
                                <div className={styles.walletCol}>Wallet</div>
                                <div className={styles.scoreCol}>
                                    {type === 'eth' ? 'Total Winnings' : 'Wins'}
                                </div>
                            </div>

                            {data.map((entry, index) => (
                                <div key={entry.wallet} className={styles.tableRow}>
                                    <div className={styles.rankCol}>
                                        <span className={`${styles.rank} ${index < 3 ? styles[`rank${index + 1}`] : ''}`}>
                                            #{index + 1}
                                        </span>
                                    </div>
                                    <div className={styles.playerCol}>
                                        <span className={styles.username}>{entry.username}</span>
                                    </div>
                                    <div className={styles.walletCol}>
                                        <span className={styles.wallet}>{entry.walletFormatted}</span>
                                    </div>
                                    <div className={styles.scoreCol}>
                                        <span className={styles.score}>{formatScore(entry.score)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
