export const getTerritoryName = (id: number): string => {
    // Easter Eggs
    if (id === 1) return "GENESIS ZONE";
    if (id === 100) return "THE CITADEL";
    if (id === 69) return "NICE SECTOR";

    // Standard Algorithm
    const prefixes = [
        "ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO",
        "FOXTROT", "GOLF", "HOTEL", "INDIA", "JULIET"
    ];

    // Logic: 
    // Room 1-10 -> ALPHA-01 to ALPHA-10 (Index 0)
    // Room 11-20 -> BRAVO-01 to BRAVO-10 (Index 1)

    // Calculate which group of 10 the id belongs to.
    // (id - 1) / 10 floored gives the index.
    // e.g. id=1 -> 0 -> ALPHA
    // id=10 -> 0.9 -> ALPHA
    // id=11 -> 1 -> BRAVO
    const prefixIndex = Math.floor((id - 1) / 10) % prefixes.length;
    const prefix = prefixes[prefixIndex];

    // Calculate the number within the group (01-10)
    // (id - 1) % 10 + 1
    const number = ((id - 1) % 10) + 1;
    const formattedNumber = number.toString().padStart(2, '0');

    return `SECTOR ${prefix}-${formattedNumber}`;
};
