import {resourceModifiers} from "./resource-modifiers";
import {Formulas} from "../utils/formulas";
import {gameResources} from "./game-resources";
import {gameEffects} from "./game-effects";
import {SMALL_NUMBER} from "../utils/consts";

class ResourceCalculators {
    constructor() {
        ResourceCalculators.instance = this;
    }


    getResourceBreakdowns(id) {
        const byRes = resourceModifiers.modifiersGroupped.byResource[id];

        const modifiersBreakdown = {
            income: [],
            multiplier: [],
            consumption: [],
            rawCap: [],
            capMult: [],
            modifiers: 0,
        };
        byRes?.income?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.level === 0) {
                return;
            }
            if (rmod.efficiency === 0) {
                return;
            }
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('resources') && rmod.customAmplifierApplyScopes.includes('income')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.income?.resources?.[id]) {
                const inc = Formulas.calculateValue(rmod.income?.resources?.[id], rmod.level) * rmod.efficiency * intensityMultiplier;
                if(inc != null && inc > SMALL_NUMBER) {

                    modifiersBreakdown.income.push({
                        id: mod,
                        name: rmod.name,
                        value: inc,
                        label: rmod.income?.resources?.[id]?.label ?? rmod.name,
                    })
                    modifiersBreakdown.modifiers++;
                }
            }
        });
        byRes?.multiplier?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.level === 0) {
                return;
            }
            if (rmod.efficiency === 0) {
                return;
            }
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('resources') && rmod.customAmplifierApplyScopes.includes('multiplier')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.multiplier?.resources?.[id]) {
                const amt = Formulas.calculateValue(rmod.multiplier?.resources?.[id], rmod.level * rmod.efficiency * intensityMultiplier);

                modifiersBreakdown.multiplier.push({
                    id: mod,
                    name: rmod.name,
                    value: amt,
                    label: rmod.multiplier?.resources?.[id]?.label ?? rmod.name,
                })
                modifiersBreakdown.modifiers++;
            }
        });
        byRes?.consumption?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.level === 0) {
                return;
            }
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('resources') && rmod.customAmplifierApplyScopes.includes('consumption')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.consumption?.effects?.[id]) {
                const isConstEff = gameResources.getResource(id)?.isConstantEfficiency;
                const relevantEfficiency = isConstEff
                    ? 1
                    : (rmod.consumption?.resources?.[id]?.ignoreEfficiency ? 1 : rmod.efficiency);
                if (relevantEfficiency === 0) {
                    return;
                }
                const effMult = isConstEff ? 1 : relevantEfficiency;
                const intMult = isConstEff ? 1 : intensityMultiplier;
                const amt = Formulas.calculateValue(rmod.consumption?.resources?.[id], rmod.level) * effMult * intMult;
                modifiersBreakdown.consumption.push({
                    id: mod,
                    name: rmod.name,
                    value: amt,
                    label: rmod.consumption?.resources?.[id]?.label ?? rmod.name,
                })
                modifiersBreakdown.modifiers++;

            }
        });
        byRes?.rawCap?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.level === 0) {
                return;
            }
            if (rmod.efficiency === 0) {
                return;
            }
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('resources') && rmod.customAmplifierApplyScopes.includes('rawCap')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.rawCap?.effects?.[id]) {
                const amt = Formulas.calculateValue(rmod.rawCap?.resources?.[id], rmod.level) * rmod.efficiency * intensityMultiplier;
                modifiersBreakdown.rawCap.push({
                    id: mod,
                    name: rmod.name,
                    value: amt,
                    label: rmod.rawCap?.resources?.[id]?.label ?? rmod.name,
                })
                modifiersBreakdown.modifiers++;
            }
        });
        byRes?.capMult?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.level === 0) {
                return;
            }
            if (rmod.efficiency === 0) {
                return;
            }

            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('resources') && rmod.customAmplifierApplyScopes.includes('capMult')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }

            if(rmod.capMult?.effects?.[id]) {
                const amt = Formulas.calculateValue(rmod.capMult?.resources?.[id], rmod.level*rmod.efficiency*intensityMultiplier);
                modifiersBreakdown.capMult.push({
                    id: mod,
                    name: rmod.name,
                    value: amt,
                    label: rmod.capMult?.resources?.[id]?.label ?? rmod.name,
                })
                modifiersBreakdown.modifiers++;
            }
        });

        return modifiersBreakdown;
    }

    assertResource(id, doUpdate = true, skipByTags = [], options = {}) {
        // now we walking through all the modifiers
        let income = 0;
        let multiplier = 1;
        let consumption = 0;
        let baseConsumption = 0; // consumption at 100% efficiency
        let rawCap = 0;
        let capMult = 1;
        let effectIncome = 0;
        let effectMultiplier = 1;

        const getRelevantEfficiency = rmodEff => {
            if(options.targetEfficiency == null) return rmodEff;
            return options.targetEfficiency;
        }

        const modifiersBreakdown = {
            income: [],
            multiplier: [],
            consumption: []
        };

        const storageBreakdown = {
            income: [],
            multiplier: []
        }
        //
        const byRes = resourceModifiers.modifiersGroupped.byResource[id];
        resourceModifiers.modifiersGroupped.byResource[id]?.income?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if(skipByTags.some(tag => rmod.tags.includes(tag))) {
                return;
            }
            if(options.skipById && options.skipById.includes(rmod.originalEntityId)) {
                return;
            }
            if (getRelevantEfficiency(rmod.efficiency) === 0) {
                return;
            }
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('resources') && rmod.customAmplifierApplyScopes.includes('income')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.income?.resources?.[id]) {
                const amt = Formulas.calculateValue(rmod.income?.resources?.[id], rmod.level);
                if(amt != null && Math.abs(amt) > SMALL_NUMBER) {
                    income += amt * getRelevantEfficiency(rmod.efficiency) * intensityMultiplier;
                    modifiersBreakdown.income.push({
                        id: mod,
                        name: rmod.name,
                        value: amt * getRelevantEfficiency(rmod.efficiency) * intensityMultiplier,
                        label: rmod.income?.resources?.[id]?.label ?? rmod.name,
                    })
                }

            }
        });
        resourceModifiers.modifiersGroupped.byResource[id]?.multiplier?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if(skipByTags.some(tag => rmod.tags.includes(tag))) {
                return;
            }
            if(options.skipById && options.skipById.includes(rmod.originalEntityId)) {
                return;
            }
            if (getRelevantEfficiency(rmod.efficiency) === 0) {
                return;
            }
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('resources') && rmod.customAmplifierApplyScopes.includes('multiplier')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.multiplier?.resources?.[id]) {
                const amt = Formulas.calculateValue(rmod.multiplier?.resources?.[id], rmod.level * getRelevantEfficiency(rmod.efficiency) * intensityMultiplier);
                multiplier *= amt;
                if(Math.abs(amt - 1) > SMALL_NUMBER) {
                    modifiersBreakdown.multiplier.push({
                        id: mod,
                        name: rmod.name,
                        value: amt,
                        label: rmod.multiplier?.resources?.[id]?.label ?? rmod.name,
                    })
                }

            }
        });
        resourceModifiers.modifiersGroupped.byResource[id]?.consumption?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if(skipByTags.some(tag => rmod.tags.includes(tag))) {
                return;
            }
            if(options.skipById && options.skipById.includes(rmod.originalEntityId)) {
                return;
            }
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('resources') && rmod.customAmplifierApplyScopes.includes('consumption')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.consumption?.resources?.[id]) {
                const amt = Formulas.calculateValue(rmod.consumption?.resources?.[id], rmod.level);
                const isConstEff = gameResources.getResource(id)?.isConstantEfficiency;
                const relevantEfficiency = isConstEff
                    ? 1
                    : (rmod.consumption?.resources?.[id]?.ignoreEfficiency ? 1 :  getRelevantEfficiency(rmod.efficiency));
                const intMult = isConstEff ? 1 : intensityMultiplier;
                
                // baseConsumption = "potential consumption" if THIS resource wasn't a bottleneck
                // If consumer has bottleneck from OTHER resource, it can't consume more than that allows
                // So we use its current efficiency, not 100%
                if(amt > SMALL_NUMBER) {
                    const hasOtherBottleneck = rmod.bottleNeck && rmod.bottleNeck !== id;
                    const potentialEfficiency = hasOtherBottleneck ? rmod.efficiency : 1;
                    baseConsumption += amt * intMult * potentialEfficiency;
                }
                
                // Skip actual consumption if efficiency is 0
                if (relevantEfficiency === 0) {
                    return;
                }
                const effMult = isConstEff ? 1 : relevantEfficiency;
                consumption += amt * effMult * intMult;
                if(amt > SMALL_NUMBER) {
                    modifiersBreakdown.consumption.push({
                        id: mod,
                        name: rmod.name,
                        value: amt * effMult * intMult,
                        label: rmod.consumption?.resources?.[id]?.label ?? rmod.name,
                    })
                }

            }
        });
        resourceModifiers.modifiersGroupped.byResource[id]?.rawCap?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if(skipByTags.some(tag => rmod.tags.includes(tag))) {
                return;
            }
            if(options.skipById && options.skipById.includes(rmod.originalEntityId)) {
                return;
            }
            if (getRelevantEfficiency(rmod.efficiency) === 0) {
                return;
            }
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('resources') && rmod.customAmplifierApplyScopes.includes('rawCap')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.rawCap?.resources?.[id]) {
                const amt = Formulas.calculateValue(rmod.rawCap?.resources?.[id], rmod.level) * getRelevantEfficiency(rmod.efficiency) * intensityMultiplier;

                rawCap += amt;
                if(amt > SMALL_NUMBER) {
                    storageBreakdown.income.push({
                        id: mod,
                        name: rmod.name,
                        value: amt,
                        label: rmod.rawCap?.resources?.[id]?.label ?? rmod.name,
                    })
                }

            }
        });
        resourceModifiers.modifiersGroupped.byResource[id]?.capMult?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if(skipByTags.some(tag => rmod.tags.includes(tag))) {
                return;
            }
            if(options.skipById && options.skipById.includes(rmod.originalEntityId)) {
                return;
            }
            if (getRelevantEfficiency(rmod.efficiency) === 0) {
                return;
            }
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('resources') && rmod.customAmplifierApplyScopes.includes('capMult')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if(rmod.capMult?.resources?.[id]) {
                const amt = Formulas.calculateValue(rmod.capMult?.resources?.[id], rmod.level*getRelevantEfficiency(rmod.efficiency)*intensityMultiplier);
                capMult *= amt;

                if(Math.abs(amt - 1) > SMALL_NUMBER) {
                    storageBreakdown.multiplier.push({
                        id: mod,
                        name: rmod.name,
                        value: amt,
                        label: rmod.capMult?.resources?.[id]?.label ?? rmod.name,
                    })
                }
            }
        });

        if(!doUpdate) {
            return {
                income,
                multiplier,
                consumption,
                baseConsumption,
                rawCap,
                capMult,
                balance: income*multiplier - consumption,
                modifiersBreakdown,
                storageBreakdown
            }
        }

        gameResources.setResourceRawIncome(id, income);
        gameResources.setResourceMultiplier(id, multiplier);
        gameResources.setResourceRawConsumption(id, consumption);
        gameResources.setResourceBaseConsumption(id, baseConsumption);
        gameResources.setResourceRawCap(id, rawCap);
        gameResources.setResourceCapMult(id, capMult);
        gameResources.setBreakdown(id, modifiersBreakdown, storageBreakdown);
        // console.log(`asserted[${id}]: `, gameResources.resources[id]);
    }

    getEffectBreakdowns(id) {
        const byRes = resourceModifiers.modifiersGroupped.byEffect[id];

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
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('effects') && rmod.customAmplifierApplyScopes.includes('income')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.income?.effects?.[id]) {
                const inc = Formulas.calculateValue(rmod.income?.effects?.[id], rmod.level) * rmod.efficiency * intensityMultiplier;
                if(inc != null && inc > SMALL_NUMBER) {
                    const amt = Formulas.calculateValue(rmod.income?.effects?.[id], rmod.level) * rmod.efficiency * intensityMultiplier;

                    modifiersBreakdown.income.push({
                        id: mod,
                        name: rmod.name,
                        value: amt,
                        label: rmod.income?.effects?.[id]?.label ?? rmod.name,
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
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('effects') && rmod.customAmplifierApplyScopes.includes('multiplier')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.multiplier?.effects?.[id]) {
                const amt = 1 + (Formulas.calculateValue(rmod.multiplier?.effects?.[id], rmod.level) - 1) * rmod.efficiency * intensityMultiplier;

                modifiersBreakdown.multiplier.push({
                    id: mod,
                    name: rmod.name,
                    value: amt,
                    label: rmod.multiplier?.effects?.[id]?.label ?? rmod.name,
                })
                modifiersBreakdown.modifiers++;
            }
        });
        resourceModifiers.modifiersGroupped.byEffect[id]?.consumption?.forEach(mod => {
            const rmod = resourceModifiers.getModifier(mod);
            if (rmod.level === 0) {
                return;
            }
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('effects') && rmod.customAmplifierApplyScopes.includes('consumption')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.consumption?.effects?.[id]) {
                const relevantEfficiency = rmod.consumption?.effects?.[id]?.ignoreEfficiency ? 1 : rmod.efficiency;
                if (relevantEfficiency === 0) {
                    return;
                }
                const amt = Formulas.calculateValue(rmod.consumption?.effects?.[id], rmod.level) * relevantEfficiency * intensityMultiplier;
                modifiersBreakdown.consumption.push({
                    id: mod,
                    name: rmod.name,
                    value: amt,
                    label: rmod.consumption?.effects?.[id]?.label ?? rmod.name,
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
            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('effects') && rmod.customAmplifierApplyScopes.includes('rawCap')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }
            if (rmod.rawCap?.effects?.[id]) {
                const amt = Formulas.calculateValue(rmod.rawCap?.effects?.[id], rmod.level) * rmod.efficiency * intensityMultiplier;
                modifiersBreakdown.rawCap.push({
                    id: mod,
                    name: rmod.name,
                    value: amt,
                    label: rmod.rawCap?.effects?.[id]?.label ?? rmod.name,
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

            let intensityMultiplier = rmod.effectFactor;
            if(rmod.getCustomAmplifier && rmod.customAmplifierApplyTypes.includes('effects') && rmod.customAmplifierApplyScopes.includes('capMult')) {
                intensityMultiplier *= rmod.getCustomAmplifier();
            }

            if(rmod.capMult?.effects?.[id]) {
                const amt = 1 + (Formulas.calculateValue(rmod.capMult?.effects?.[id], rmod.level) - 1)*rmod.efficiency*intensityMultiplier;
                modifiersBreakdown.capMult.push({
                    id: mod,
                    name: rmod.name,
                    value: amt,
                    label: rmod.capMult?.effects?.[id]?.label ?? rmod.name,
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
            // console.log(`Effect ${id} changed from ${prevValue} -> ${currValue}`, resourceModifiers.modifiersGroupped.byDeps);
            resourceModifiers.modifiersGroupped.byDeps[id]?.forEach(modifierId => {
                resourceModifiers.cacheModifier(modifierId); // regenerate caches
                this.regenerateModifier(modifierId, true)
            })
        }

    }

    regenerateModifier(id, preserveEfficiency = false) {
        const deps = resourceModifiers.getDependenciesToRegenerate(id);
        /*if(!preserveEfficiency) {
            console.log('regeneratingModifier: ', id, deps.effects, preserveEfficiency);
        }*/
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
                // console.log('Reasserted: ', effId);
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
                this.assertResource(rs);
            });
        }
        if(deps.effects.length) {
            //TODO: if missing resources are present in deps - we need to reset those
            deps.effects.forEach(effId => {
                this.assertEffect(effId);
                // console.log('Reasserted: ', effId);
            });
        }
    }

    toggleConsumingEfficiency(resourceId, efficiency, bReset = false) {
        // For resources with constant efficiency, never throttle dependents
        if (gameResources.getResource(resourceId)?.isConstantEfficiency) {
            return {
                efficiency,
                affectedResourceIds: []
            }
        }
        const consuming = resourceModifiers.modifiersGroupped.byResource[resourceId]?.consumption;

        let affectedResourceIds = [];
        let resourcesToReassert = new Set();

        if(consuming && consuming.length) {
            // First pass: update all consumer efficiencies without triggering reasserts
            consuming.forEach(consumerId => {
                const consumer = resourceModifiers.getModifier(consumerId);
                
                if(bReset) {
                    consumer.nIter = 0;
                }
                consumer.nIter = (consumer.nIter) + 1;
                if(consumer.nIter > 8) {
                    console.warn('Consuming efficiency loop detected for ', consumer.id, consumer.efficiency, efficiency);
                    return;
                }
                
                // Initialize bottlenecks dictionary if not exists
                if (!consumer.bottlenecks) {
                    consumer.bottlenecks = {};
                }
                
                if (efficiency < 1) {
                    // Resource is a bottleneck - store its targetEfficiency
                    consumer.bottlenecks[resourceId] = efficiency;
                    consumer.bottleNeck = resourceId;
                } else {
                    // Resource is no longer a bottleneck - remove it
                    if (consumer.bottlenecks[resourceId] !== undefined) {
                        delete consumer.bottlenecks[resourceId];
                        affectedResourceIds.push(resourceId);
                    }
                    if (consumer.bottleNeck === resourceId) {
                        consumer.bottleNeck = null;
                    }
                }
                
                // Calculate new efficiency as min of all bottlenecks
                const bottleneckValues = Object.values(consumer.bottlenecks);
                const newEfficiency = bottleneckValues.length > 0 
                    ? Math.min(1, ...bottleneckValues) 
                    : 1;
                
                // Update efficiency directly without triggering cascading reasserts
                resourceModifiers.setEfficiency(consumer.id, newEfficiency);
                
                // Collect resources to reassert later
                const deps = resourceModifiers.getDependenciesToRegenerate(consumer.id);
                deps.resources.forEach(rs => resourcesToReassert.add(rs));
                
                // Update bottleNeck to the most restrictive one
                if (bottleneckValues.length > 0) {
                    let minEff = Infinity;
                    let minResourceId = null;
                    for (const [resId, eff] of Object.entries(consumer.bottlenecks)) {
                        if (eff < minEff) {
                            minEff = eff;
                            minResourceId = resId;
                        }
                    }
                    consumer.bottleNeck = minResourceId;
                }
            })
            
            // Second pass: reassert all affected resources AFTER all efficiencies are updated
            resourcesToReassert.forEach(rs => this.assertResource(rs));
        }

        return {
            efficiency,
            affectedResourceIds
        }
    }

    resetConsumingEfficiency(resourceId, bCheckBottleneck = false) {
        const consuming = resourceModifiers.modifiersGroupped.byResource[resourceId]?.consumption;
        let resourcesToReassert = new Set();
        
        if(consuming && consuming.length) {
            // First pass: update all consumer efficiencies
            consuming.forEach(consumerId => {
                const consumer = resourceModifiers.getModifier(consumerId);
                
                // Initialize bottlenecks if not exists
                if (!consumer.bottlenecks) {
                    consumer.bottlenecks = {};
                }
                
                if(!bCheckBottleneck) {
                    // Full reset - remove this resource from bottlenecks
                    delete consumer.bottlenecks[resourceId];
                    if (consumer.bottleNeck === resourceId) {
                        consumer.bottleNeck = null;
                    }
                    
                    // Recalculate efficiency from remaining bottlenecks
                    const bottleneckValues = Object.values(consumer.bottlenecks);
                    const newEfficiency = bottleneckValues.length > 0 
                        ? Math.min(1, ...bottleneckValues) 
                        : 1;
                    resourceModifiers.setEfficiency(consumer.id, newEfficiency);
                    
                    // Update bottleNeck to the most restrictive remaining one
                    if (bottleneckValues.length > 0) {
                        let minEff = Infinity;
                        let minResourceId = null;
                        for (const [resId, eff] of Object.entries(consumer.bottlenecks)) {
                            if (eff < minEff) {
                                minEff = eff;
                                minResourceId = resId;
                            }
                        }
                        consumer.bottleNeck = minResourceId;
                    }
                } else {
                    // Partial reset - only reset if this resource was the bottleneck
                    if(consumer.bottleNeck === resourceId || consumer.bottlenecks[resourceId] !== undefined) {
                        delete consumer.bottlenecks[resourceId];
                        
                        const bottleneckValues = Object.values(consumer.bottlenecks);
                        const newEfficiency = bottleneckValues.length > 0 
                            ? Math.min(1, ...bottleneckValues) 
                            : 1;
                        resourceModifiers.setEfficiency(consumer.id, newEfficiency);
                        
                        // Update bottleNeck
                        if (bottleneckValues.length > 0) {
                            let minEff = Infinity;
                            let minResourceId = null;
                            for (const [resId, eff] of Object.entries(consumer.bottlenecks)) {
                                if (eff < minEff) {
                                    minEff = eff;
                                    minResourceId = resId;
                                }
                            }
                            consumer.bottleNeck = minResourceId;
                        } else {
                            consumer.bottleNeck = null;
                        }
                    }
                }

                // Collect resources to reassert
                resourceModifiers.getDependenciesToRegenerate(consumer.id).resources.forEach(rs => resourcesToReassert.add(rs));
            })
            
            // Second pass: reassert all affected resources
            resourcesToReassert.forEach(rs => this.assertResource(rs));
        }
        gameResources.getResource(resourceId).isMissing = false;
        gameResources.getResource(resourceId).targetEfficiency = 1;

        return {
            affectedResources: [...resourcesToReassert]
        }
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