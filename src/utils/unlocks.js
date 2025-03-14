import {SMALL_NUMBER} from "./consts";

export class GameUnlocks {

    constructor() {
        GameUnlocks.instance = this;
        this.unlockMapping = {
            entity: {},
            effect: {}
        };
    }
    findNextUnlock(unlocks, currentLevel, doLog = false) {
        let left = 0;
        let right = unlocks.length - 1;
        let nextUnlock = null;
        let nextLevelPos = currentLevel + Number.EPSILON;
        let firstIndex = -1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (doLog) {
                console.log('[BinSrch]: Attempt to find with boundaries: ', left, right, mid);
                console.log('[BinSrch]: POS: ', `Mid value = ${unlocks[mid].level} compared to ${nextLevelPos}`);
            }
            if (unlocks[mid].level >= nextLevelPos) {
                nextUnlock = unlocks[mid];
                firstIndex = mid; // Зберігаємо індекс
                right = mid - 1; // Продовжуємо пошук ліворуч
            } else {
                left = mid + 1;
            }
        }

        return firstIndex !== -1 ? { unlock: nextUnlock, index: firstIndex } : null;
    }

    findNextUnlocksArray(unlocks, currentLevel, doLog = false) {
        const foundItem = this.findNextUnlock(unlocks, currentLevel, doLog);

        if (!foundItem) return [];

        const { unlock, index } = foundItem;
        let allUnlocks = [unlock];

        // Проходимо ліворуч, доки рівень однаковий
        let lowerBoundary = index - 1;
        while (lowerBoundary >= 0 && unlocks[lowerBoundary].level === unlock.level) {
            allUnlocks.unshift(unlocks[lowerBoundary]); // додаємо на початок
            lowerBoundary--;
        }

        // Проходимо праворуч, доки рівень однаковий
        let upperBoundary = index + 1;
        while (upperBoundary < unlocks.length && unlocks[upperBoundary].level === unlock.level) {
            allUnlocks.push(unlocks[upperBoundary]); // додаємо в кінець
            upperBoundary++;
        }

        return allUnlocks;
    }


    getPreviousUnlocks(unlocks, currentLevel, doLog = false) {
        let left = 0;
        let right = unlocks.length - 1;
        let lastUnlockedIndex = -1;

        if(doLog) {
            console.log('[BinSrch]: Arr: ', unlocks);
        }

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (doLog) {
                console.log('[BinSrch]: Searching previous unlocks: ', left, right, mid);
                console.log(`[BinSrch]: Checking level ${unlocks[mid].level} against ${currentLevel}`);
            }
            if (unlocks[mid].level <= currentLevel) {
                lastUnlockedIndex = mid; // Track the last unlocked position
                left = mid + 1; // Search right for newer unlocks
            } else {
                right = mid - 1; // Search left for lower levels
            }
        }

        if (doLog) {
            console.log(`[BinSrch]: Last unlocked index found at ${lastUnlockedIndex}`);
        }

        return lastUnlockedIndex >= 0 ? unlocks.slice(0, lastUnlockedIndex + 1) : [];
    }

    sortUnlockMappings() {
        for (const scope in this.unlockMapping) {

            for (const unlockerId in this.unlockMapping[scope]) {
                this.unlockMapping[scope][unlockerId].sort((a, b) => a.level - b.level);
            }

        }

    }

    initialize() {
        this.sortUnlockMappings();
    }

}


export const gameUnlocks = GameUnlocks.instance || new GameUnlocks();