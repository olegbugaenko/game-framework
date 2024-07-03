class GameEffects {

    constructor() {
        GameEffects.instance = this;
        this.effects = {};
    }

    registerEffect(id, effect) {
        if(!effect.defaultValue) {
            effect.defaultValue = 0;
        }
        if(!effect.defaultCap) {
            effect.defaultCap = 0;
        }
        effect.value = effect.defaultValue;
        effect.income = effect.income ?? 0;
        effect.multiplier = effect.multiplier ?? 1;
        effect.consumption = effect.consumption ?? 0;
        effect.rawCap = effect.rawCap ?? 0;
        effect.capMult = effect.capMult ?? 0;
        this.effects[id] = effect;
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
        rs.breakDown = mult;
    }

}

export const gameEffects = GameEffects.instance || new GameEffects();