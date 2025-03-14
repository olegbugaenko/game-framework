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
                const cL = scope === 'effect' ? gameEffects.getEffectValue(unlockerId) : gameEntity.getLevel(unlockerId);
                const unl = gameUnlocks.findNextUnlock(arr, cL);
                totalCompleted += unl ? (unl?.index || 0) : arr[unlockerId].length;
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