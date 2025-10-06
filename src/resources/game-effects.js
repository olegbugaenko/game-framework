import {gameUnlocks} from "../utils/unlocks";

class GameEffects {

    constructor() {
        GameEffects.instance = this;
        this.effects = {};
        this.effectsByTags = {};
    }

    registerEffect(id, effect) {
        if(!effect.defaultValue) {
            effect.defaultValue = 0;
        }
        if(!effect.defaultCap) {
            effect.defaultCap = 0;
        }
        effect.value = effect.defaultValue ?? 0;
        effect.income = effect.income ?? 0;
        effect.multiplier = effect.multiplier ?? 1;
        effect.consumption = effect.consumption ?? 0;
        effect.rawCap = effect.rawCap ?? 0;
        effect.capMult = effect.capMult ?? 0;
        effect.tags = effect.tags ?? [];
        effect.id = id;
        this.effects[id] = effect;

        if(effect.minValue !== null) {
            effect.value = Math.max(effect.value, effect.minValue);
        }

        if(effect.tags) {
            effect.tags.forEach(tag => {
                if(!this.effectsByTags[tag]) {
                    this.effectsByTags[tag] = [];
                }
                this.effectsByTags[tag].push(id);
            })
        }
    }

    getEffect(id) {
        if(!this.effects[id]) {
            throw new Error('Undefined effect - '+id);
        }
        return this.effects[id];
    }

    getEffectValue(id) {
        return this.getEffect(id).value;
    }

    assertValue(id) {
        const rs = this.getEffect(id);
        rs.value = Math.min((rs.income + rs.defaultValue)*rs.multiplier - rs.consumption, rs.hasCap ? rs.cap : 1.e+308);
        if(rs.minValue !== null) {
            rs.value = Math.max(rs.minValue, rs.value);
        }
        return rs.value;
    }

    assertCap(id) {
        const rs = this.getEffect(id);
        rs.cap = (rs.rawCap + rs.defaultCap)*rs.capMult;
        return rs.cap;
    }

    setEffectRawIncome(id, income) {
        const rs = this.getEffect(id);
        rs.income = income;
        this.assertValue(id);
    }

    setEffectRawConsumption(id, consumption) {
        const rs = this.getEffect(id);
        rs.consumption = consumption;
        this.assertValue(id);
    }

    setEffectMultiplier(id, multiplier) {
        const rs = this.getEffect(id);
        rs.multiplier = multiplier;
        this.assertValue(id);
    }

    setEffectRawCap(id, cap) {
        const rs = this.getEffect(id);
        rs.rawCap = cap;
        this.assertCap(id);
    }

    setEffectCapMult(id, capMult) {
        const rs = this.getEffect(id);
        rs.capMult = capMult;
        this.assertCap(id);
    }

    setBreakDown(id, breakDown) {
        const rs = this.getEffect(id);
        rs.breakDown = breakDown;
    }

    getBreakdown(id) {
        const rs = this.getEffect(id);
        return rs.breakDown || {};
    }

    listPrevUnlocks(id) {
        const effect = this.getEffect(id);

        if(!gameUnlocks.unlockMapping['effect']?.[id]) return null;

        return gameUnlocks.getPreviousUnlocks(gameUnlocks.unlockMapping['effect'][id], effect.value);
    }

    listEffectsByTags(tags, isOr = false, excludeIds = [], options = {}) {
        let suitableIds = [];
        if(tags) {
            if(isOr) {
                suitableIds = tags.reduce((acc, tag) => [...acc, ...(this.effectsByTags[tag] || [])], []);
            } else {
                suitableIds = [...(this.effectsByTags[tags[0]] || [])];
                for(let i = 1; i < tags.length; i++) {
                    suitableIds = suitableIds.filter(st => (this.effectsByTags[tags[i]] || []).find(st))
                }
            }
        } else {
            suitableIds = Object.keys(this.effects);
        }
        
        if(excludeIds && excludeIds.length) {
            suitableIds = suitableIds.filter(id => !excludeIds.includes(id))
        }

        return suitableIds.map(id => ({
            id,
            ...this.effects[id],
            isUnlocked: !this.effects[id].unlockCondition || this.effects[id].unlockCondition(),
            nextUnlocks: this.getNextEffectUnlock(id),
            prevUnlocks: options.listPrevious ? this.listPrevUnlocks(id) : null
        }));
    }

    getNextEffectUnlock(id) {
        const effect = this.getEffectValue(id);

        if(!gameUnlocks.unlockMapping['effect']?.[id]) return null;

        return gameUnlocks.findNextUnlocksArray(gameUnlocks.unlockMapping['effect'][id], effect);
    }

    isEffectUnlocked(id) {
        return !this.getEffect(id).unlockCondition || this.getEffect(id).unlockCondition();
    }

    fetchAllUnlocks() {
        const result = [];
        for (const unlockerId in gameUnlocks.unlockMapping['effect']) {
            if(this.isEffectUnlocked(unlockerId)) {
                result.push({...this.getEffect(unlockerId), nextUnlock: this.getNextEffectUnlock(unlockerId)})
            }
        }
    }
}

export const gameEffects = GameEffects.instance || new GameEffects();