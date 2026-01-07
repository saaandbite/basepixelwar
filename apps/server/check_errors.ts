import { keccak256, toBytes } from 'viem';

const errors = [
    "InvalidGameMode()", "GameNotFound()", "GameNotWaiting()", "GameNotActive()",
    "GameFull()", "AlreadyJoined()", "IncorrectBidAmount()", "NotBackendSigner()",
    "NoPlayersToRefund()", "InvalidWinnerCount()", "InvalidScoreCount()",
    "TransferFailed()", "ZeroAddress()", "NoTreasuryBalance()"
];

console.log("--- ERROR SIGNATURES ---");
errors.forEach(err => {
    const hash = keccak256(toBytes(err));
    console.log(`${err}: ${hash.slice(0, 10)}`);
});
