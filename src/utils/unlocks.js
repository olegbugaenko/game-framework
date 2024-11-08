export class GameUnlocks {

    constructor() {
        GameUnlocks.instance = this;
        this.unlockMapping = {
            entity: {},
            effect: {}
        };
    }

    findNextUnlock(unlocks, currentLevel) {
        let left = 0;
        let right = unlocks.length - 1;
        let nextUnlock = null;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (unlocks[mid].level >= currentLevel) {
                nextUnlock = unlocks[mid];
                right = mid - 1; // Search the left half
            } else {
                left = mid + 1; // Search the right half
            }
        }

        return nextUnlock;
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