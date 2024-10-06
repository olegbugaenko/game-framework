import {resourceModifiers} from "./resource-modifiers";
import {Formulas} from "../utils/formulas";
import {gameResources} from "./game-resources";
import {gameEffects} from "./game-effects";
import {SMALL_NUMBER} from "../utils/consts";

class ResourceCalculators {
    constructor() {
        ResourceCalculators.instance = this;
    }

    assertResource(id, doLog = false) {
        // now we walking through all the modifiers
        let income = 0;
        let multiplier = 1;
        let consumption = 0;
        let rawCap = 0;
        let capMult = 1;
        let effectIncome = 0;
        let effectMultiplier = 1;
        if(doLog) {
            console.log(`mdf[${id}]: `, resourceModifiers.modifiersGroupped.byResource[id]);
        }
        const modifiersBreakdown = {
            income: [],
            multiplier: [],
            consumption: []
        };
        //
        const byRes = resourceModifiers.modifiersGroupped.byResource[id];
        resourceModifiers.modifiersGroupped.byResource[id]?.income?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.efficiency === 0) {
                return;
            }
            if (rmod.income?.resources?.[id]) {
                const amt = Formulas.calculateValue(rmod.income?.resources?.[id], rmod.level);
                if(amt != null && Math.abs(amt) > SMALL_NUMBER) {
                    income += amt * rmod.efficiency;
                    modifiersBreakdown.income.push({
                        id: mod,
                        name: rmod.name,
                        value: amt
                    })
                }

            }
        });
        resourceModifiers.modifiersGroupped.byResource[id]?.multiplier?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.efficiency === 0) {
                return;
            }
            if (rmod.multiplier?.resources?.[id]) {
                const amt = Formulas.calculateValue(rmod.multiplier?.resources?.[id], rmod.level * rmod.efficiency);
                multiplier *= amt;
                if(Math.abs(amt - 1) > SMALL_NUMBER) {
                    modifiersBreakdown.multiplier.push({
                        id: mod,
                        name: rmod.name,
                        value: amt
                    })
                }

            }
        });
        resourceModifiers.modifiersGroupped.byResource[id]?.consumption?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if(id === 'mana') {
                console.log('Consuming: ', id, mod, rmod);
            }
            if (rmod.efficiency === 0) {
                return;
            }
            if (rmod.consumption?.resources?.[id]) {
                const amt = Formulas.calculateValue(rmod.consumption?.resources?.[id], rmod.level);
                consumption += amt * rmod.efficiency;
                if(amt > SMALL_NUMBER) {
                    modifiersBreakdown.consumption.push({
                        id: mod,
                        name: rmod.name,
                        value: amt
                    })
                }

            }
        });
        resourceModifiers.modifiersGroupped.byResource[id]?.rawCap?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.efficiency === 0) {
                return;
            }
            if (rmod.rawCap?.resources?.[id]) {
                rawCap += Formulas.calculateValue(rmod.rawCap?.resources?.[id], rmod.level) * rmod.efficiency;
            }
        });
        resourceModifiers.modifiersGroupped.byResource[id]?.capMult?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.efficiency === 0) {
                return;
            }
            if(rmod.capMult?.resources?.[id]) {
                capMult *= Formulas.calculateValue(rmod.capMult?.resources?.[id], rmod.level*rmod.efficiency);
            }
        });

        gameResources.setResourceRawIncome(id, income);
        gameResources.setResourceMultiplier(id, multiplier);
        gameResources.setResourceRawConsumption(id, consumption);
        gameResources.setResourceRawCap(id, rawCap);
        gameResources.setResourceCapMult(id, capMult);
        gameResources.setBreakdown(id, modifiersBreakdown);
        // console.log(`asserted[${id}]: `, gameResources.resources[id]);
    }

    getEffectBreakdowns(id) {
        const byRes = resourceModifiers.modifiersGroupped.byEffect[id];
        if(id === 'workersEfficiency') {
            console.log('byRes: ', byRes);
        }
        const modifiersBreakdown = {
            income: [],
            multiplier: [],
            consumption: [],
            rawCap: [],
            capMult: [],
            modifiers: 0,
        };
        resourceModifiers.modifiersGroupped.byEffect[id]?.income?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.level === 0) {
                return;
            }
            if (rmod.efficiency === 0) {
                return;
            }
            if (rmod.income?.effects?.[id]) {
                const inc = Formulas.calculateValue(rmod.income?.effects?.[id], rmod.level * rmod.efficiency);
                if(inc != null && inc > SMALL_NUMBER) {
                    const amt = Formulas.calculateValue(rmod.income?.effects?.[id], rmod.level * rmod.efficiency);

                    modifiersBreakdown.income.push({
                        id: mod,
                        name: rmod.name,
                        value: amt
                    })
                    modifiersBreakdown.modifiers++;
                }
            }
        });
        resourceModifiers.modifiersGroupped.byEffect[id]?.multiplier?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.level === 0) {
                return;
            }
            if (rmod.efficiency === 0) {
                return;
            }
            if (rmod.multiplier?.effects?.[id]) {
                const amt = Formulas.calculateValue(rmod.multiplier?.effects?.[id], rmod.level * rmod.efficiency);

                modifiersBreakdown.multiplier.push({
                    id: mod,
                    name: rmod.name,
                    value: amt
                })
                modifiersBreakdown.modifiers++;
            }
        });
        resourceModifiers.modifiersGroupped.byEffect[id]?.consumption?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.level === 0) {
                return;
            }
            if (rmod.efficiency === 0) {
                return;
            }
            if (rmod.consumption?.effects?.[id]) {
                const amt = Formulas.calculateValue(rmod.consumption?.effects?.[id], rmod.level * rmod.efficiency);
                modifiersBreakdown.consumption.push({
                    id: mod,
                    name: rmod.name,
                    value: amt
                })
                modifiersBreakdown.modifiers++;

            }
        });
        resourceModifiers.modifiersGroupped.byEffect[id]?.rawCap?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.level === 0) {
                return;
            }
            if (rmod.efficiency === 0) {
                return;
            }
            if (rmod.rawCap?.effects?.[id]) {
                const amt = Formulas.calculateValue(rmod.rawCap?.effects?.[id], rmod.level * rmod.efficiency);
                modifiersBreakdown.rawCap.push({
                    id: mod,
                    name: rmod.name,
                    value: amt
                })
                modifiersBreakdown.modifiers++;
            }
        });
        resourceModifiers.modifiersGroupped.byEffect[id]?.capMult?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.level === 0) {
                return;
            }
            if (rmod.efficiency === 0) {
                return;
            }

            if(rmod.capMult?.effects?.[id]) {
                const amt = Formulas.calculateValue(rmod.capMult?.effects?.[id], rmod.level*rmod.efficiency);
                modifiersBreakdown.capMult.push({
                    id: mod,
                    name: rmod.name,
                    value: amt
                })
                modifiersBreakdown.modifiers++;
            }
        });

        return modifiersBreakdown;
    }

    assertEffect(id) {
        // now we walking through all the modifiers
        let income = 0;
        let multiplier = 1;
        let consumption = 0;
        let rawCap = 0;
        let capMult = 1;

        const byRes = resourceModifiers.modifiersGroupped.byEffect[id];
        if(id === 'workersEfficiency') {
            console.log('byRes: ', byRes);
        }
        const modifiersBreakdown = this.getEffectBreakdowns(id);
        let isSaveTree = gameEffects.getEffect(id).saveBalanceTree;

        income = modifiersBreakdown.income?.reduce((acc, item) => acc + item.value, income);
        consumption = modifiersBreakdown.consumption?.reduce((acc, item) => acc + item.value, consumption);
        multiplier = modifiersBreakdown.multiplier?.reduce((acc, item) => acc * item.value, multiplier);
        rawCap = modifiersBreakdown.rawCap?.reduce((acc, item) => acc + item.value, rawCap);
        capMult = modifiersBreakdown.capMult?.reduce((acc, item) => acc * item.value, capMult);


        const prevValue = gameEffects.getEffectValue(id);
        gameEffects.setEffectRawIncome(id, income);
        gameEffects.setEffectMultiplier(id, multiplier);
        gameEffects.setEffectRawConsumption(id, consumption);
        gameEffects.setEffectRawCap(id, rawCap);
        gameEffects.setEffectCapMult(id, capMult);
        if(isSaveTree) {
            gameEffects.setBreakDown(id, modifiersBreakdown);
        }
        const currValue = gameEffects.getEffectValue(id);
        if(prevValue !== currValue) {
            console.log(`Effect ${id} changed from ${prevValue} -> ${currValue}`, resourceModifiers.modifiersGroupped.byDeps);
            resourceModifiers.modifiersGroupped.byDeps[id]?.forEach(modifierId => {
                resourceModifiers.cacheModifier(modifierId); // regenerate caches
                this.regenerateModifier(modifierId, true)
            })
        }

    }

    regenerateModifier(id, preserveEfficiency = false) {
        const deps = resourceModifiers.getDependenciesToRegenerate(id);
        if(!preserveEfficiency) {
            console.log('regeneratingModifier: ', id, deps.effects, preserveEfficiency);
        }
        if(deps.resources.length) {
            //TODO: if missing resources are present in deps - we need to reset those
            deps.resources.forEach(rs => {
                if(gameResources.getResource(rs).isMissing && !preserveEfficiency) {
                    this.resetConsumingEfficiency(rs);
                }
                this.assertResource(rs);
            });
        }
        if(deps.effects.length) {
            //TODO: if missing resources are present in deps - we need to reset those
            deps.effects.forEach(effId => {
                this.assertEffect(effId);
                console.log('Reasserted: ', effId);
            });
        }
    }


    updateModifierLevel(id, level) {
        resourceModifiers.updateLevel(id, level);
        this.regenerateModifier(id);
    }

    updateModifierEfficiency(id, efficiency) {
        resourceModifiers.setEfficiency(id, efficiency);
        const deps = resourceModifiers.getDependenciesToRegenerate(id);
        if(deps.resources.length) {
            deps.resources.forEach(rs => this.assertResource(rs));
        }
        if(deps.effects.length) {
            deps.effects.forEach(rs => this.assertEffect(rs));
        }
    }

    unsetModifier(id) {
        const deps = resourceModifiers.getDependenciesToRegenerate(id);
        /*if(deps.resources.length) {
            deps.resources.forEach(rs => {
                console.log('BDEL: '+id, {...resourceModifiers.modifiersGroupped.byResource[rs]})
            })
        }*/
        resourceModifiers.unsetModifier(id)
        // console.log('regeneratingModifier: ', id, deps.resources);
        if(deps.resources.length) {
            //TODO: if missing resources are present in deps - we need to reset those
            deps.resources.forEach(rs => {
                if(gameResources.getResource(rs).isMissing) {
                    this.resetConsumingEfficiency(rs);
                }
                this.assertResource(rs, true);
            });
        }
        if(deps.effects.length) {
            //TODO: if missing resources are present in deps - we need to reset those
            deps.effects.forEach(effId => {
                this.assertEffect(effId);
                console.log('Reasserted: ', effId);
            });
        }
    }

    toggleConsumingEfficiency(resourceId, efficiency, bReset = false) {
        const consuming = resourceModifiers.modifiersGroupped.byResource[resourceId]?.consumption;
        // console.log('Consuming: ', resourceModifiers.modifiersGroupped.byResource);
        if(consuming && consuming.length) {
            consuming.forEach(consumerId => {
                const consumer = resourceModifiers.getModifier(consumerId);
                /*if(resourceId === 'energy' || resourceId === 'coins') {
                    console.log(`${resourceId} consumption/production toggled. Reassert: `, efficiency, consumer, consumer.nIter);
                }*/
                if(bReset) {
                    consumer.nIter = 0;
                }
                consumer.nIter = (consumer.nIter) + 1;
                if(consumer.nIter > 8) {
                    return;
                }
                this.updateModifierEfficiency(consumer.id, consumer.efficiency * efficiency);
                if(efficiency < 0) {
                    consumer.bottleNeck = resourceId;
                }

                /*if(consumerId === 'entity_runningAction') {
                    console.log('AfterUpd EntEEF: ', JSON.stringify(resourceModifiers.getModifier(consumerId)), efficiency);
                }*/
            })
        }
    }

    resetConsumingEfficiency(resourceId, bCheckBottleneck = false) {
        const consuming = resourceModifiers.modifiersGroupped.byResource[resourceId]?.consumption;
        if(consuming && consuming.length) {
            consuming.forEach(consumerId => {
                const consumer = resourceModifiers.getModifier(consumerId);
                if(!bCheckBottleneck) {
                    this.updateModifierEfficiency(consumer.id, 1);
                } else {
                    if(consumer.bottleNeck === resourceId) {
                        this.updateModifierEfficiency(consumer.id,1);
                    }
                }

            })
        }
        gameResources.getResource(resourceId).isMissing = false;
        gameResources.getResource(resourceId).targetEfficiency = 1;
    }

    isAffordable(prices) {
        let isAffordable = true;
        let affordabilities = {};
        let eta = 0;
        let percentage = 1;
        let hardLocked = false;
        let max = 1e+200;
        for(const resourceId in prices) {
            affordabilities[resourceId] = {
                resourceId,
                name: gameResources.getResource(resourceId).name,
                requirement: prices[resourceId],
                actual: gameResources.getResource(resourceId).amount,
                max: prices[resourceId] > SMALL_NUMBER ? Math.floor(gameResources.getResource(resourceId).amount / prices[resourceId]) : 1e+200,
            }
            if(gameResources.getResource(resourceId).amount >= prices[resourceId] || prices[resourceId] <= 0) {
                affordabilities[resourceId].isAffordable = true;
            } else {
                affordabilities[resourceId].isAffordable = false;
                affordabilities[resourceId].eta = gameResources.getResource(resourceId).balance > SMALL_NUMBER ? (prices[resourceId] - gameResources.getResource(resourceId).amount) / gameResources.getResource(resourceId).balance : 1.e+20;
                affordabilities[resourceId].percentage = gameResources.getResource(resourceId).amount / prices[resourceId];
                isAffordable = false;
                if(gameResources.getResource(resourceId).hasCap && prices[resourceId] > gameResources.getResource(resourceId).cap) {
                    affordabilities[resourceId].hardLocked = true;
                    affordabilities[resourceId].eta = 1.e+20;
                    hardLocked = true;
                }
                eta = Math.max(eta, affordabilities[resourceId].eta);
                percentage = Math.min(percentage, affordabilities[resourceId].percentage);
            }
            max = Math.min(max, affordabilities[resourceId].max);
        }
        return {
            isAffordable,
            hardLocked,
            eta,
            percentage,
            affordabilities,
            max
        }
    }
}

export const resourceCalculators = ResourceCalculators.instance || new ResourceCalculators();