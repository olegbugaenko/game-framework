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
        let nextLevelPos = currentLevel + 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if(doLog) {
                console.log('[BinSrch]: Attempt to find with boundaries: ', left, right, mid)
                console.log('[BinSrch]: POS: ', `Mid value = ${unlocks[mid].level} compared to ${nextLevelPos}`)
            }
            if (unlocks[mid].level >= nextLevelPos) {
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