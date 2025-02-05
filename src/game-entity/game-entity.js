import {resourceModifiers} from "../resources/resource-modifiers";
import {resourceCalculators} from "../resources/resource-calculators";
import {Formulas} from "../utils/formulas";
import {gameEffects} from "../resources/game-effects";
import {gameResources} from "../resources/game-resources";
import {SMALL_NUMBER} from "../utils/consts";
import {gameUnlocks} from "../utils/unlocks";

class GameEntity {

    constructor() {
        GameEntity.instance = this;
        this.entities = {};
        this.entitiesByTags = {};
        this.satellitesMap = {};

        // this.entitiesByDeps = {};
    }

    registerGameEntity(id, entity) {
        if(this.entities[id]) {
            this.unsetEntity(id);
        }
        if(entity.copyFromId) {
            entity = {
                ...this.entities[entity.copyFromId],
                allowedImpacts: [],
                isAbstract: false,
                ...entity,
            }
        }

        if(entity.satelliteEntityId) {
            this.satellitesMap[entity.satelliteEntityId] = entity.id;
        }

        if(!entity.level) {
            entity.level = 0;
        }
        entity.id = id;
        if(!entity.allowedImpacts || !entity.allowedImpacts.length) {
            entity.allowedImpacts = ['resources', 'effects'];
        }

        if (entity.unlockedBy) {
            for (const unlockInfo of entity.unlockedBy) {
                const unlockerId = unlockInfo.id;
                const unlockerScope = unlockInfo.type;
                if (!gameUnlocks.unlockMapping[unlockerScope][unlockerId]) {
                    gameUnlocks.unlockMapping[unlockerScope][unlockerId] = [];
                }
                gameUnlocks.unlockMapping[unlockerScope][unlockerId].push({
                    unlockId: id,
                    level: unlockInfo.level
                });
            }
        }

        if(entity.resourceModifier && !entity.resourceModifier.customAmplifierApplyTypes) {
            entity.resourceModifier.customAmplifierApplyTypes = ['resources', 'effects'];
        }

        if(entity.resourceModifier && !entity.isAbstract) {



            if('effectFactor' in entity) {
                // console.log(`EffectFactor for ${entity.id}: `, entity.effectFactor);
                entity.resourceModifier.effectFactor = entity.effectFactor;
            } else {
                entity.resourceModifier.effectFactor = 1.;
            }

            // register resource modifier
            const modif = {...entity.resourceModifier, level: entity.level, name: `${entity.resourceModifier.prefix || ''}${entity.name}`, allowedImpacts: entity.allowedImpacts, tags: entity.tags || []};

            if(!modif.allowedImpacts) {
                console.error('Not allowed empty modifiers', entity);
            }

            if(!modif.id) {
                modif.id = `entity_${id}`
            }
            if(entity.modifierGroupId) {
                modif.groupId = entity.modifierGroupId;
            }
            if(modif.groupId) {
                entity.modifierGroupId = modif.groupId;
                modif.id = modif.groupId;
            }
            entity.modifier = resourceModifiers.registerModifier(modif, id);
        }
        this.entities[id] = entity;
        if(entity.tags && entity.tags.length) {
            entity.tags.forEach(tag => {
                if(!this.entitiesByTags[tag]) {
                    this.entitiesByTags[tag] = [];
                }
                this.entitiesByTags[tag].push(id)
            })
        }

        // console.log('Active modifiers: ', resourceModifiers.modifiers, resourceModifiers.modifiersGroupped);
        return this.entities[id];
    }

    unsetEntity(id) {
        if(!this.entities[id]) return;

        if(this.entities[id].modifier) {
            if(this.entities[id].modifierGroupId) {
                this.entities[id].modifier.entityRefs = this.entities[id].modifier.entityRefs.filter(eId => eId !== id);
                // reassertModifierLevel
                const lvl = this.reassertModifierLevel(this.entities[id].modifier);
                resourceCalculators.updateModifierLevel(this.entities[id].modifier.id, lvl);
                console.warn('NEWLV: ', this.entities[id].modifier.id, lvl, this.entities[id].modifier.entityRefs);
            }
            if(!this.entities[id].modifier.entityRefs?.length) {
                resourceCalculators.unsetModifier(this.entities[id].modifier.id);
            }

        }

        delete this.entities[id];

        for(const tag in this.entitiesByTags) {
            this.entitiesByTags[tag] = this.entitiesByTags[tag].filter(ent => ent !== id);
        }
    }

    getEntityEfficiency(id) {
        return this.getEntity(id).modifier ? this.getEntity(id).modifier.efficiency : 1
    }

    listEntitiesByTags(tags, isOr = false, excludeIds = [], options = {}) {
        let suitableIds = []
        if(isOr) {
            suitableIds = tags.reduce((acc, tag) => [...acc, ...(this.entitiesByTags[tag] || [])], []);
        } else {
            suitableIds = [...(this.entitiesByTags[tags[0]] || [])];
            for(let i = 1; i < tags.length; i++) {
                suitableIds = suitableIds.filter(st => (this.entitiesByTags[tags[i]] || []).includes(st))
            }
        }
        if(excludeIds && excludeIds.length) {
            suitableIds = suitableIds.filter(id => !excludeIds.includes(id))
        }
        return suitableIds.map(id => ({
            ...this.getEntity(id),
            isUnlocked: this.isEntityUnlocked(id),
            isCapped: this.isCapped(id),
            efficiency: this.getEntityEfficiency(id),
            nextUnlock: this.getNextEntityUnlock(id),
            prevUnlocks: options.listPrevious ? this.listPrevUnlocks(id) : null
        }));
    }

    checkUnlockedBy(unlockedBy) {
        for(const unlockInfo of unlockedBy) {
            if(unlockInfo.type === 'entity') {
                if(this.getLevel(unlockInfo.id) < unlockInfo.level) {
                    return false;
                }
            }
            if(unlockInfo.type === 'effect') {
                if(gameEffects.getEffectValue(unlockInfo.id) < unlockInfo.level) {
                    return false;
                }
            }
        }
        return true;
    }

    isEntityUnlocked(id) {
        const entity = this.getEntity(id);

        if(entity.unlockedBy) {
            const unlockedByCheck = this.checkUnlockedBy(entity.unlockedBy);
            if(!unlockedByCheck) return false;
        }
        return !this.getEntity(id).unlockCondition || this.getEntity(id).unlockCondition();
    }

    getNextEntityUnlock(id) {
        const entity = this.getEntity(id);

        if(!gameUnlocks.unlockMapping['entity']?.[id]) return null;

        return gameUnlocks.findNextUnlock(gameUnlocks.unlockMapping['entity'][id], entity.level);
    }

    listPrevUnlocks(id) {
        const entity = this.getEntity(id);

        if(!gameUnlocks.unlockMapping['entity']?.[id]) return null;

        return gameUnlocks.getPreviousUnlocks(gameUnlocks.unlockMapping['entity'][id], entity.level);
    }

    fetchAllUnlocks() {
        const result = [];
        for (const unlockerId in gameUnlocks.unlockMapping['entity']) {
            if(this.isEntityUnlocked(unlockerId)) {
                result.push({...this.getEntity(unlockerId), nextUnlock: this.getNextEntityUnlock(unlockerId)})
            }
        }
    }

    countEntitiesByTags(tags, isOr = false, excludeIds = []) {
        let suitableIds = []
        if(isOr) {
            suitableIds = tags.reduce((acc, tag) => [...acc, ...(this.entitiesByTags[tag] || [])], []);
        } else {
            suitableIds = [...(this.entitiesByTags[tags[0]] || [])];
            for(let i = 1; i < tags.length; i++) {
                suitableIds = suitableIds.filter(st => (this.entitiesByTags[tags[i]] || []).find(st))
            }
        }
        if(excludeIds && excludeIds.length) {
            suitableIds = suitableIds.filter(id => !excludeIds.includes(id))
        }
        return suitableIds.map(id => ({
            ...this.entities[id],
        })).reduce((acc, item) => acc += item.level, 0);
    }

    getEntity(id) {
        if(!this.entities[id]) {
            throw new Error(`Not found entity ${id}`);
        }

        return this.entities[id];
    }

    entityExists(id) {
        return (id in this.entities);
    }

    isCapped(id) {
        return (this.getEntity(id).maxLevel || (this.getEntity(id).getMaxLevel ? this.getEntity(id).getMaxLevel() : 1.e+308)) <= this.entities[id].level
    }

    getLevelupCost(id, addLvl = 0) {
        const current = this.getEntity(id);
        if(current.get_cost) {
            current.cost = current.get_cost();
        }
        if(current.cost) {
            const totalCost = {};
            for(const rsId in current.cost) {
                const costs = Formulas.calculateValue(current.cost[rsId], current.level + addLvl);
                totalCost[rsId] = costs;
            }
            return totalCost;
        }
        return null;
    }

    getEntityMaxLevel(id) {
        const current = this.getEntity(id);
        let max;
        if(current.getMaxLevel) {
            max = current.getMaxLevel();
        } else
        if(current.maxLevel || current.maxLevel === 0) {
            max = current.maxLevel;
        }

       return max;
    }

    getEntityCapped(id, addLvl = 0) {
        const current = this.getEntity(id);
        let max;
        if(current.getMaxLevel) {
            max = current.getMaxLevel();
        } else
        if(current.maxLevel || current.maxLevel === 0) {
            max = current.maxLevel;
        }

        if(max || max === 0) {
            if(max <= current.level + addLvl) {
                return true;
            }
        }

        return false;
    }

    reassertModifierLevel(modifier) {
        if(!modifier.entityRefs?.length) {
            return modifier.level;
        }
        return modifier.entityRefs.reduce((acc, id) => acc + this.getLevel(id), 0);
    }

    levelUpEntity(id) {
        const isUnlocked = this.isEntityUnlocked(id);

        if(!isUnlocked) {
            return {
                success: false,
                reason: 'isLocked',
            }
        }
        const current = this.getEntity(id);
        let max;
        if(current.getMaxLevel) {
            max = current.getMaxLevel();
        } else
        if(current.maxLevel || current.maxLevel === 0) {
            max = current.maxLevel;
        }

        if(max || max === 0) {
            if(max <= current.level) {
                return {
                    success: false,
                    reason: {
                        maxLevel: max,
                        level: current.level
                    },
                }
            }
        }
        const costs = this.getLevelupCost(id);
        if(costs) {
            const affordable = resourceCalculators.isAffordable(costs);
            if(!affordable.isAffordable) {
                return {
                    success: false,
                    reason: affordable,
                }
            }
            for(const rsId in costs) {
                gameResources.addResource(rsId, -costs[rsId]);
            }
        }
        this.setEntityLevel(id, current.level + 1);
        return {
            success: true
        }
    }

    setEntityLevel(id, level, bForce = false) {
        const current = this.getEntity(id);
        if(!bForce) {
            const isUnlocked = this.isEntityUnlocked(id);

            if(!isUnlocked) {
                return false;
            }
            let max;
            if(current.getMaxLevel) {
                max = current.getMaxLevel();
            } else
            if(current.maxLevel || current.maxLevel === 0) {
                max = current.maxLevel;
            }

            if(max || max === 0) {
                if(max <= level) {
                    level = max;
                }
            }
        }

        if(current.modifier?.id) {
            let levelToSet = level;
            if(current.modifier.entityRefs) {
                levelToSet = this.reassertModifierLevel(current.modifier) + level - current.level;
            }
            resourceCalculators.updateModifierLevel(current.modifier.id, levelToSet);
        }
        const pLev = current.level;
        current.level = level;
        if(current.onLevelSet) {
            current.onLevelSet(current.level, pLev)
        }
        if(current.satelliteEntityId) {
            this.setEntityLevel(current.satelliteEntityId, current.level, true);
        }
        return current;
    }

    getLevel(id) {
        return this.getEntity(id).level;
    }

    getGroupLevel(id) {
        const modiff = resourceModifiers.getModifier(id);
        return this.reassertModifierLevel(modiff);
    }

    getAffordable(id, addLvl = 0) {
        const costs = this.getLevelupCost(id, addLvl);
        if(costs) {
            const affordable = resourceCalculators.isAffordable(costs);
            return affordable;
        }
        return {
            isAffordable: true
        }
    }

    getDependanciesBreakdown(id, exludeArr = []) {

        const entity = this.getEntity(id);
        if(!entity.modifier) return;
        const deps = entity.modifier.effectDeps;

        if(!deps.length) return;

        const depsToAssert = deps.filter(dep => !exludeArr.includes(dep));

        if(!depsToAssert.length) return;

        return depsToAssert.map(dep => {

            return {
                effect: gameEffects.getEffect(dep),
                breakDown: resourceCalculators.getEffectBreakdowns(dep)
            }
        })
    }

    getEffects(id, addLvl = 0, lvl = null, calculateForAbstract = false, customMultiplier = 1, customEfficiency = 1) {

        const result = [];
        const entity = this.entities[id];

        if(lvl == null) {
            lvl = entity.level;
        }

        const unpack = (object, type, scope, intensityMultiplier = 1.) => {
            if(!object?.[scope]?.[type]) return [];
            const toUnpack = object?.[scope]?.[type];
            const results = [];
            for(const key in toUnpack) {
                const formula = toUnpack[key];
                const efft = type === 'resources' ? gameResources.getResource(key) : gameEffects.getEffect(key);
                if(efft.unlockCondition) {
                    if(!efft.unlockCondition()) {
                        continue;
                    }
                }
                try {
                    if(!object.customAmplifierApplyTypes.includes(type)) {
                        intensityMultiplier = 1.;
                    }
                } catch (e) {
                    console.warn('Undefined uplifier types: '+id, object);
                    throw e;
                }

                const basic_name = efft.name;
                let lvlToCalc = lvl + addLvl;
                let customMultiplierLocal = customMultiplier;
                let val = customMultiplierLocal*Formulas.calculateValue(formula, lvlToCalc);
                if(scope === 'multiplier' || scope === 'capMult') {
                    val = 1 + (val - 1) * customEfficiency*intensityMultiplier;
                } else {
                    val = val * customEfficiency*intensityMultiplier;
                }
                const item = {
                    id: key,
                    name: basic_name,
                    value: val,
                    scope,
                    type,
                    isPercentage: efft.isPercentage
                };
                if(item.value == null || Math.abs(item.value) < SMALL_NUMBER) {
                    continue;
                }
                if((scope === 'multiplier' || scope === 'capMult') && (Math.abs(item.value - 1) < SMALL_NUMBER)) {
                    continue;
                }
                results.push(item);
            }
            return results;
        }

        let modif = entity.modifier;

        if(entity.isAbstract && calculateForAbstract) {
            modif = entity.resourceModifier;

            if(modif) {
                // checkCallables
                ['income', 'multiplier', 'consumption', 'rawCap', 'capMult'].forEach(scope => {
                    if(modif[`get_${scope}`]) {
                        modif[scope] = modif[`get_${scope}`]();
                    }
                })
            }
        }

        if(!modif) {
            return result;
        }

        let intensityMultiplier = 1.;
        if(modif.getCustomAmplifier) {
            intensityMultiplier = modif.getCustomAmplifier();
            // console.log('CustomAmpl: ', id, modif.getCustomAmplifier());
        }

        // console.log('CustomMult: ', id, intensityMultiplier);

        result.push(
            ...unpack(modif, 'resources', 'income', intensityMultiplier)
        )
        result.push(
            ...unpack(modif, 'effects', 'income', intensityMultiplier)
        )
        result.push(
            ...unpack(modif, 'resources', 'multiplier', intensityMultiplier)
        )
        result.push(
            ...unpack(modif, 'effects', 'multiplier', intensityMultiplier)
        )
        result.push(
            ...unpack(modif, 'resources', 'rawCap', intensityMultiplier)
        )
        result.push(
            ...unpack(modif, 'effects', 'rawCap', intensityMultiplier)
        )
        result.push(
            ...unpack(modif, 'resources', 'capMult', intensityMultiplier)
        )
        result.push(
            ...unpack(modif, 'effects', 'capMult', intensityMultiplier)
        )
        result.push(
            ...unpack(modif, 'resources', 'consumption', intensityMultiplier)
        )
        result.push(
            ...unpack(modif, 'effects', 'consumption', intensityMultiplier)
        )
        return result;
    }

    getAttributes(id) {
        const entity = this.getEntity(id);
        if(entity.get_attributes) {
            return Object.entries(entity.get_attributes()).map(([name, value]) => ({
                name,
                value
            }));
        }
        return Object.entries(entity.attributes).map(([name, value]) => ({
            name,
            value
        }));
    }

    setAttribute(id, attributeId, value) {
        const entity = this.getEntity(id);

        if(!entity.attributes) {
            entity.attributes = {};
        }

        entity.attributes[attributeId] = value;
    }

    getAttribute(id, attributeId, defaultValue) {
        const entity = this.getEntity(id);

        if(!entity.attributes) {
            entity.attributes = {};
        }

        return entity.attributes[attributeId] || defaultValue;
    }

    getAttributesObject(id) {
        const entity = this.getEntity(id);
        if(entity.get_attributes) {
            return entity.get_attributes();
        }
        return entity.attributes || {};
    }

}

export const gameEntity = GameEntity.instance || new GameEntity();