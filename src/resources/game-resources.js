import {resourceModifiers} from "./resource-modifiers";
import {resourceCalculators} from "./resource-calculators";
import {SMALL_NUMBER} from "../utils/consts";

class GameResources {

    constructor() {
        this.resources = {};
        this.resourcesByTags = {};
        this.delayedResets = {};
        GameResources.instance = this;
    }

    registerResource(id, resource) {
        if(resource.resourceModifier && !resource.isAbstract) {
            const modif = {...resource.resourceModifier};
            if(!modif.id) {
                modif.id = `resource_${id}`
            }
            modif.name = resource.name;
            resource.modifier = resourceModifiers.registerModifier(modif);
        }
        this.resources[id] = resource;
        this.resources[id].earned = 0;
        this.resources[id].spent = 0;
        this.resources[id].id = id;
        if(!this.resources[id].amount) {
            this.resources[id].amount = 0;
        }
        if(!this.resources[id].defaultCap) {
            this.resources[id].defaultCap = 0;
        }
        if(!this.resources[id].targetEfficiency) {
            this.resources[id].targetEfficiency = 1;
        }
        if(resource.tags) {
            resource.tags.forEach(tag => {
                if(!this.resourcesByTags[tag]) {
                    this.resourcesByTags[tag] = [];
                }
                this.resourcesByTags[tag].push(id);
            })
        }
    }

    getResource(id) {
        const rs = this.resources[id];
        if(!rs) {
            throw new Error(`Try to add undefined resource: ${id}`);
        }
        return rs;
    }


    isResourceUnlocked(id) {
        return !this.resources[id].unlockCondition || this.resources[id].unlockCondition()
    }

    listMissing() {
        const result = {};
        for(const key in this.resources) {
            if(this.resources[key].targetEfficiency < 1) {
                result[key] = this.resources[key].targetEfficiency;
            }
        }
        return result;
    }


    assertToCapOrEmpty(id) {
        const rs = this.getResource(id);
        if(rs.balance > 0) {
            return (rs.cap - rs.amount) / rs.balance;
        } else {
            return (rs.amount / rs.balance)
        }
    }

    listResourcesByTags(tags, isOr = false, excludeIds = []) {
        let suitableIds = []
        if(isOr) {
            suitableIds = tags.reduce((acc, tag) => [...acc, ...(this.resourcesByTags[tag] || [])], []);
        } else {
            suitableIds = [...(this.resourcesByTags[tags[0]] || [])];
            for(let i = 1; i < tags.length; i++) {
                suitableIds = suitableIds.filter(st => (this.resourcesByTags[tags[i]] || []).includes(st))
            }
        }
        if(excludeIds && excludeIds.length) {
            suitableIds = suitableIds.filter(id => !excludeIds.includes(id))
        }
        return suitableIds.map(id => ({
            id,
            ...this.resources[id],
            isUnlocked: !this.resources[id].unlockCondition || this.resources[id].unlockCondition()
        }));
    }

    listAllResources() {
        return Object.entries(this.resources).map(([id, resource]) => ({
            id,
            ...resource,
            isUnlocked: !this.resources[id].unlockCondition || this.resources[id].unlockCondition()
        }))
    }

    assertBalance(id) {
        const rs = this.getResource(id);
        rs.balance = rs.income*rs.multiplier - rs.consumption;
        return rs.balance;
    }

    assertCap(id) {
        const rs = this.getResource(id);
        rs.cap = (rs.rawCap + rs.defaultCap)*rs.capMult;
        return rs.cap;
    }

    addResource(id, amount, isDelayed = false) {
        if(!amount) {
            amount = 0;
        }
        const rs = this.getResource(id);
        if(rs.unlockCondition && !rs.unlockCondition()) return ;
        if(rs.isService) return ;
        const amtToAdd = rs.hasCap ? Math.min(amount, rs.cap - (rs.amount || 0) ) : amount;
        if(amount > 0) {
            rs.earned += amount;
        }
        if(amount < 0) {
            rs.spent -= amount;
        }
        if(rs.amount < 0) {
            rs.amount = 0;
        }
        rs.amount += amtToAdd;
        if(rs.modifier && amtToAdd !== 0) {
            rs.modifier.level = rs.amount;
            resourceCalculators.regenerateModifier(rs.modifier.id);
            console.log('rs.mod', rs.modifier);
        }
        if(amtToAdd > SMALL_NUMBER*rs.consumption && rs.targetEfficiency < 1) {
            if(isDelayed) {
                this.delayedResets[id] = amtToAdd;
            } else {
                resourceCalculators.resetConsumingEfficiency(id, true);
            }
        }
        if(amtToAdd) {
            resourceModifiers.modifiersGroupped.byResourceDeps[id]?.forEach(modifierId => {
                resourceModifiers.cacheModifier(modifierId);
                resourceCalculators.regenerateModifier(modifierId)
            })
        }
        return rs.amount;
    }

    setResource(id, amount, bPreventReset = false, delayedReset = false) {
        const rs = this.getResource(id);
        const pAmount = rs.amount;
        rs.amount = amount || 0;
        if(rs.amount < 0) {
            rs.amount = 0;
        }
        if(rs.modifier && amount > 0) {
            rs.modifier.level = rs.amount;
            resourceCalculators.regenerateModifier(rs.modifier.id);
            console.log('rs.mod', rs.modifier);
        }
        if(pAmount !== rs.amount && Math.abs((pAmount - rs.amount) / (pAmount + rs.amount)) > SMALL_NUMBER) {
            if(rs.isService && rs.targetEfficiency < 1 && !bPreventReset) {
                console.log('resetEffService: ', rs, pAmount, amount, delayedReset);
                if(delayedReset) {
                    this.delayedResets[id] = amount;
                } else {
                    resourceCalculators.resetConsumingEfficiency(id, true);
                }

            }
            resourceModifiers.modifiersGroupped.byResourceDeps[id]?.forEach(modifierId => {
                resourceModifiers.cacheModifier(modifierId);
                resourceCalculators.regenerateModifier(modifierId)
            })
            if(rs.modifier) {
                rs.modifier.level = rs.amount;
                resourceCalculators.regenerateModifier(rs.modifier.id);
                console.log('rs.mod.setResource', rs.modifier);
            }
        }
        return rs.amount;
    }

    handleDelayed() {
        for(const id in this.delayedResets) {
            resourceCalculators.resetConsumingEfficiency(id, true);
        }
        this.delayedResets = {};
    }

    setResourceRawIncome(id, income) {
        const rs = this.getResource(id);
        rs.income = income;
        this.assertBalance(id);
    }

    setResourceRawConsumption(id, consumption) {
        const rs = this.getResource(id);
        rs.consumption = consumption;
        this.assertBalance(id);
    }

    setResourceMultiplier(id, multiplier) {
        const rs = this.getResource(id);
        rs.multiplier = multiplier;
        this.assertBalance(id);
    }

    setResourceRawCap(id, cap) {
        const rs = this.getResource(id);
        rs.rawCap = cap;
        this.assertCap(id);
    }

    setResourceCapMult(id, capMult) {
        const rs = this.getResource(id);
        rs.capMult = capMult;
        this.assertCap(id);
    }

    setBreakdown(id, breakDown, storageBreakdown) {
        const rs = this.getResource(id);
        rs.breakDown = breakDown;
        rs.storageBreakdown = storageBreakdown;
    }

    save() {
        const obj = {};
        for(const rsId in this.resources) {
            obj[rsId] = {
                a: this.resources[rsId].amount,
                s: this.resources[rsId].spent,
                e: this.resources[rsId].earned,
            };
        }
        return obj;
    }

    load(obj) {
        for(const rsId in this.resources) {
            this.setResource(rsId, 0);
        }
        for(const rsId in obj) {
            if(this.resources[rsId]) {
                const amount = typeof this.resources[rsId] === 'object' ? this.resources[rsId].a : this.resources[rsId];
                this.setResource(rsId, amount);
                this.resources[rsId].spent = this.resources[rsId]?.s ?? 0;
                this.resources[rsId].earned = this.resources[rsId]?.e ?? 0;
            }
        }
        return obj;
    }

}

export const gameResources = GameResources.instance || new GameResources();