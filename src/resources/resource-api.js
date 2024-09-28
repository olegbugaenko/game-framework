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

}

export const resourceApi = ResourceApi.instance || new ResourceApi();