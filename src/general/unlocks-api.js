import {gameUnlocks} from "../utils/unlocks";
import {gameEffects} from "../resources";
import {gameEntity} from "../game-entity";

export class UnlocksApi {

    constructor() {
        UnlocksApi.instance = this;
    }

    getGeneralUnlocksStats() {
        let total = 0;
        let totalCompleted = 0;

        for (const scope in gameUnlocks.unlockMapping) {

            const arr = gameUnlocks.unlockMapping[scope];

            for (const unlockerId in arr) {
                total += arr[unlockerId].length;
                const cL = scope === 'effects' ? gameEffects.getEffectValue(unlockerId) : gameEntity.getLevel(unlockerId);
                totalCompleted += gameUnlocks.findNextUnlock(arr, cL)
                //this.unlockMapping[scope][unlockerId].sort((a, b) => a.level - b.level);
            }

        }

        return {
            totalCompleted,
            total,
        }
    }

}

export const unlocksApi = UnlocksApi.instance || new UnlocksApi();