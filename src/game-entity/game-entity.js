import {resourceModifiers} from "../resources/resource-modifiers";
import {resourceCalculators} from "../resources/resource-calculators";
import {Formulas} from "../utils/formulas";
import {gameEffects} from "../resources/game-effects";
import {gameResources} from "../resources/game-resources";
import {SMALL_NUMBER} from "../utils/consts";

class GameEntity {

    constructor() {
        GameEntity.instance = this;
        this.entities = {};
        this.entitiesByTags = {};
        // this.entitiesByDeps = {};
    }

    registerGameEntity(id, entity) {
        if(entity.copyFromId) {
            entity = {
                ...this.entities[entity.copyFromId],
                ...entity,
            }
        }

        if(!entity.level) {
            entity.level = 0;
        }
        entity.id = id;
        if(entity.resourceModifier) {
            // register resource modifier
            const modif = {...entity.resourceModifier, level: entity.level, name: entity.name};
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

    listEntitiesByTags(tags, isOr = false, excludeIds = []) {
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
            isUnlocked: !this.getEntity(id).unlockCondition || this.getEntity(id).unlockCondition(),
            isCapped: (this.getEntity(id).maxLevel || (this.getEntity(id).getMaxLevel ? this.getEntity(id).getMaxLevel() : 1.e+308)) <= this.entities[id].level
        }));
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
        const current = this.getEntity(id);
        if(current.unlockCondition) {
            const isUnlocked = current.unlockCondition();
            if(!isUnlocked) {
                return {
                    success: false,
                    reason: 'isLocked',
                }
            }
        }
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
            if(current.unlockCondition) {
                const isUnlocked = current.unlockCondition();
                if(!isUnlocked) {
                    return false;
                }
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

    getEffects(id, addLvl = 0, lvl = null) {

        const result = [];
        const entity = this.entities[id];

        if(lvl == null) {
            lvl = entity.level;
        }

        const unpack = (object, type, scope, log = false) => {
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
                const basic_name = efft.name;
                const item = {
                    id: key,
                    name: basic_name,
                    value: Formulas.calculateValue(formula, lvl + addLvl),
                    scope
                };
                if(item.value == null || Math.abs(item.value) < SMALL_NUMBER) {
                    continue;
                }
                if((key === 'multiplier' || key === 'capMult') && (Math.abs(item.value - 1) < SMALL_NUMBER)) {
                    continue;
                }
                results.push(item);
            }
            return results;
        }

        if(!entity.modifier) {
            return result;
        }
        const modif = entity.modifier;
        result.push(
            ...unpack(modif, 'resources', 'income')
        )
        result.push(
            ...unpack(modif, 'effects', 'income')
        )
        result.push(
            ...unpack(modif, 'resources', 'multiplier')
        )
        result.push(
            ...unpack(modif, 'effects', 'multiplier')
        )
        result.push(
            ...unpack(modif, 'resources', 'rawCap')
        )
        result.push(
            ...unpack(modif, 'effects', 'rawCap')
        )
        result.push(
            ...unpack(modif, 'resources', 'capMult')
        )
        result.push(
            ...unpack(modif, 'effects', 'capMult')
        )
        result.push(
            ...unpack(modif, 'resources', 'consumption')
        )
        result.push(
            ...unpack(modif, 'effects', 'consumption')
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
        return {};
    }

    getAttributesObject(id) {
        const entity = this.getEntity(id);
        if(entity.get_attributes) {
            return entity.get_attributes();
        }
        return {};
    }

}

export const gameEntity = GameEntity.instance || new GameEntity();