export function findNextUnlock(unlocks, currentLevel) {
    let left = 0;
    let right = unlocks.length - 1;
    let nextUnlock = null;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (unlocks[mid].level > currentLevel) {
            nextUnlock = unlocks[mid];
            right = mid - 1; // Search the left half
        } else {
            left = mid + 1; // Search the right half
        }
    }

    return nextUnlock;
}