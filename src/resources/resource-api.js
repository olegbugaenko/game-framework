import {gameResources} from "./game-resources";
import {gameEffects} from "./game-effects";
import {Formulas} from "../utils/formulas";
import {SMALL_NUMBER} from "../utils/consts";

export class ResourceApi {

    constructor() {
        ResourceApi.instance = this;
    }

    unpackEffects(effects, lvl, customMultiplier = 1) {

        const result = [];

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
                const basic_name = efft.name;
                const item = {
                    id: key,
                    name: basic_name,
                    value: Formulas.calculateValue(formula, lvl)*customMultiplier,
                    scope,
                    type
                };
                if(item.value == null || Math.abs(item.value) < SMALL_NUMBER) {
                    continue;
                }
                if((key === 'multiplier' || key === 'capMult') && (Math.abs(item.value - 1) < SMALL_NUMBER)) {
                    continue;
                }
                
                // Add isAvailable flag for negative resource consumption effects
                if (type === 'resources' && scope === 'consumption' && item.value < 0) {
                    const resource = gameResources.getResource(key);
                    item.isAvailable = resource && resource.amount >= Math.abs(item.value);
                } else {
                    item.isAvailable = true; // Default to true for all other effects
                }
                
                results.push(item);
            }
            return results;
        }

        let modif = {};

        ['income', 'multiplier', 'consumption', 'rawCap', 'capMult'].forEach(scope => {
            if(effects[`get_${scope}`]) {
                modif[scope] = effects[`get_${scope}`]();
            } else if(effects[scope]) {
                modif[scope] = effects[scope];
            }
        })

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

    mergeEffects(base, additional) {
        const mergeValues = (baseVal, addVal, isMultiplicative = false) => {
            if (isMultiplicative) {
                return baseVal * addVal;
            }
            return baseVal + addVal;
        };

        const mergeScopes = (baseScope, addScope, isMultiplicative) => {
            if (!baseScope) {
                return { ...addScope }; // Якщо у baseScope немає ключів, просто копіюємо addScope
            }
            for (const key in addScope) {
                if (!baseScope[key]) {
                    baseScope[key] = { ...addScope[key] };
                } else {
                    baseScope[key].value = mergeValues(baseScope[key].value, addScope[key].value, isMultiplicative);
                }
            }
            return baseScope;
        };

        const mergeCategories = (baseCategory, addCategory) => {
            if (!baseCategory) {
                return { ...addCategory }; // Якщо у baseCategory немає ключів, просто копіюємо addCategory
            }
            baseCategory.income = mergeScopes(baseCategory.income || {}, addCategory.income || {}, false);
            baseCategory.multiplier = mergeScopes(baseCategory.multiplier || {}, addCategory.multiplier || {}, true);
            baseCategory.consumption = mergeScopes(baseCategory.consumption || {}, addCategory.consumption || {}, false);
            baseCategory.rawCap = mergeScopes(baseCategory.rawCap || {}, addCategory.rawCap || {}, false);
            baseCategory.capMult = mergeScopes(baseCategory.capMult || {}, addCategory.capMult || {}, true);
            return baseCategory;
        };

        base.resources = mergeCategories(base.resources || {}, additional.resources || {});
        base.effects = mergeCategories(base.effects || {}, additional.effects || {});

        return base;
    }


    unpackEffectsToArray(effectsStructured) {
        const result = [];

        const unpackScope = (scopeData, scope, type) => {
            for (const key in scopeData) {
                const effect = scopeData[key];
                result.push({
                    id: key,
                    name: effect.name,
                    value: effect.value,
                    scope,
                    type,
                    isPercentage: effect.isPercentage
                });
            }
        };

        ['income', 'multiplier', 'consumption', 'rawCap', 'capMult'].forEach(scope => {
            unpackScope(effectsStructured.resources[scope], scope, 'resources');
            unpackScope(effectsStructured.effects[scope], scope, 'effects');
        });

        return result;
    }

    unpackEffectsToObject(effectsStructured) {
        const result = {};

        const unpackScope = (scopeData, scope, type) => {
            for (const key in scopeData) {
                const effect = scopeData[key];
                const nKey = `${scope}_${type}_${key}`
                result[nKey] ={
                    id: key,
                    name: effect.name,
                    value: effect.value,
                    scope,
                    type,
                    isPercentage: effect.isPercentage
                };
            }
        };

        ['income', 'multiplier', 'rawCap', 'capMult', 'consumption'].forEach(scope => {
            unpackScope(effectsStructured.resources?.[scope] || {}, scope, 'resources');
            unpackScope(effectsStructured.effects?.[scope] || {}, scope, 'effects');
        });

        return result;
    }


}

export const resourceApi = ResourceApi.instance || new ResourceApi();