import Image from 'next/image';

interface GameNavbarProps {
    scoreBlue: number;
    scoreRed: number;
    timeLeft: number;
}

export function GameNavbar({ scoreBlue, scoreRed, timeLeft }: GameNavbarProps) {
    // Format time mm:ss
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
        <div className="game-navbar">
            {/* Player Info (Blue) */}
            <div className="player-info">
                <div className="avatar blue">
                    <Image src="/assets/avatars/blue-player.png" alt="Blue" width={32} height={32} />
                </div>
                <div className="score-badge blue">
                    <span className="icon">💧</span>
                    <span className="value">{scoreBlue}%</span>
                </div>
            </div>

            {/* Timer & Status */}
            <div className="game-status">
                <div className="timer">
                    {timeString}
                </div>
                <div className="vs-badge">YOU &nbsp; vs &nbsp; ENEMY</div>
            </div>

            {/* Enemy Info (Red) */}
            <div className="player-info right">
                <div className="score-badge red">
                    <span className="icon">🔥</span>
                    <span className="value">{scoreRed}%</span>
                </div>
                <div className="avatar red">
                    <Image src="/assets/avatars/red-player.png" alt="Red" width={32} height={32} />
                </div>
            </div>
        </div>
    );
}
