import { gameResources } from "./game-resources";
import { resourceModifiers } from "./resource-modifiers";
import { resourceCalculators } from "./resource-calculators";
import { gameEffects } from "./game-effects";
import { resourceApi } from  "./resource-api";
import {SMALL_NUMBER} from "../utils/consts";

// Runtime switch between legacy and optimized resource balancing
let activeAlgo = 'optimized'; // 'legacy' | 'optimized'
// Expose setter via API without circular imports
resourceApi.setResourcesAlgo = (mode) => {
    if(mode === 'legacy' || mode === 'optimized') {
        activeAlgo = mode;
    }
    return activeAlgo;
};

// Helper to calculate targetEfficiency
// Uses iterative approach: decrease when balance < 0, increase gradually when balance > 0
const calcTargetEfficiency = (res) => {
    const currentTarget = res.targetEfficiency ?? 1;
    const effectiveIncome = res.multiplier * res.income;
    
    // If balance is positive and targetEfficiency < 1, gradually increase
    if (res.balance > SMALL_NUMBER && currentTarget < 1) {
        // Calculate how much we can increase based on excess income
        const exceedFactor = res.consumption > SMALL_NUMBER 
            ? effectiveIncome / res.consumption 
            : 1;
        if(res.id === 'inventory_herbalists_elixir') {
            console.log('exceedFactor: ', res.id, exceedFactor, effectiveIncome, res.consumption, currentTarget);
        }
        return Math.min(1, currentTarget * Math.max(1, exceedFactor));
    }
    
    // If balance is negative, calculate from baseConsumption
    if (res.balance < -SMALL_NUMBER) {
        const baseCons = res.baseConsumption || res.consumption;
        if (baseCons <= SMALL_NUMBER) return 1;
        if (effectiveIncome <= SMALL_NUMBER) return 0; // No income = no efficiency
        return Math.min(1, effectiveIncome / baseCons);
    }
    
    // Balance is ~0, keep current targetEfficiency
    return currentTarget;
};

class ResourcesManager {

    constructor() {
        ResourcesManager.instance = this;
    }

    initialize() {
        for(const resourceId in gameResources.resources) {
            resourceCalculators.assertResource(resourceId);
        }
    }

    tick(dT) {
        let isAssertsFinished = false;
        const start = performance.now();
        // console.log('iter started: ', JSON.parse(JSON.stringify(gameResources.resources['crafting_ability'])));
        gameResources.handleDelayed();
        let maxIter = 20;
        let iter = 0;
        // console.log('START_ITER: EntEEF', resourceModifiers.getModifier('entity_runningAction').efficiency);
        // console.log('asserting: ', JSON.parse(JSON.stringify(gameResources.resources['crafting_ability'])));
        // Build initial dirty set
        const hasFlow = (res) => Math.abs(res?.income || 0) > SMALL_NUMBER || Math.abs(res?.consumption || 0) > SMALL_NUMBER;
        let resourcesToUpdate = [];
        if(activeAlgo === 'optimized') {
            const shouldTrack = (res) => {
                if(!res) return false;
                // Always track resources that need unfreeze
                if((res.targetEfficiency ?? 1) < 1) return true;
                if(Math.abs(res.balance || 0) > SMALL_NUMBER) return true;
                if(res.isService && res.isMissing) return true;
                if(hasFlow(res) && res.isMissing) return true;
                return false;
            };
            for (const resourceId in gameResources.resources) {
                const res = gameResources.resources[resourceId];
                if(shouldTrack(res)) {
                    resourcesToUpdate.push(resourceId);
                }
            }
        } else {
            for (const resourceId in gameResources.resources) {
                resourcesToUpdate.push(resourceId);
            }
        }

        while(!isAssertsFinished) {
            isAssertsFinished = true;
            iter++;
            let newResourcesToUpdate = [];

            // Helper to safely queue resource for re-assert
            const addDirty = (rid) => {
                const r = gameResources.resources[rid];
                if(!r) return;
                if(activeAlgo === 'optimized') {
                    if(r.isConstantEfficiency) return;
                    // If resource needs unfreeze, always allow it to be processed
                    if((r.targetEfficiency ?? 1) < 1) {
                        newResourcesToUpdate.push(rid);
                        return;
                    }
                    // Otherwise skip zero-flow resources
                    if(!hasFlow(r)) return;
                }
                newResourcesToUpdate.push(rid);
            };

            for(const resourceId of resourcesToUpdate) {
                const res = gameResources.resources[resourceId];
                // Process if there is flow OR resource needs unfreeze OR service missing
                const needProcess = (Math.abs(res.balance || 0) > SMALL_NUMBER)
                    || ((res.targetEfficiency ?? 1) < 1)
                    || (res.isService && res.isMissing);
                if(needProcess) {
                    if(gameResources.resources[resourceId].isService && gameResources.resources[resourceId].balance < -SMALL_NUMBER) {
                        // we are missing service resource
                        if (!gameResources.resources[resourceId].isConstantEfficiency) {
                            const newTargetEff = calcTargetEfficiency(gameResources.resources[resourceId]);
                            const togg = resourceCalculators.toggleConsumingEfficiency(resourceId, newTargetEff, true);
                            (togg.affectedResourceIds || []).forEach(addDirty);
                            gameResources.resources[resourceId].isMissing = true;
                            gameResources.resources[resourceId].amount = 0;
                            gameResources.resources[resourceId].targetEfficiency = newTargetEff;
                            isAssertsFinished = false;
                        } else {
                            gameResources.resources[resourceId].isMissing = false;
                            gameResources.resources[resourceId].targetEfficiency = 1;
                        }
                        // console.log(`Iter${iter}: ${resourceId} is missing: `, effPercentage, gameResources.resources[resourceId].targetEfficiency, gameResources.listMissing(), JSON.parse(JSON.stringify(gameResources.resources[resourceId])))
                        
                    } else
                    if(-1*gameResources.resources[resourceId].balance*dT - SMALL_NUMBER > gameResources.resources[resourceId].amount) {
                        // now we should retain list of stuff consuming
                        if (!gameResources.resources[resourceId].isConstantEfficiency) {
                            const doPropagate = activeAlgo === 'optimized' ? hasFlow(gameResources.resources[resourceId]) : true;
                            if(doPropagate) {
                                const newTargetEff = calcTargetEfficiency(gameResources.resources[resourceId]);
                                // console.log('resource is finishing: ', resourceId, gameResources.resources[resourceId].balance, newTargetEff);
                                const togg = resourceCalculators.toggleConsumingEfficiency(resourceId, newTargetEff, true);
                                (togg.affectedResourceIds || []).forEach(addDirty);
                                gameResources.resources[resourceId].isMissing = true;
                                gameResources.resources[resourceId].amount = 0;
                                gameResources.resources[resourceId].targetEfficiency = newTargetEff;
                            }
                        } else {
                            gameResources.resources[resourceId].isMissing = false;
                            gameResources.resources[resourceId].targetEfficiency = 1;
                        }
                        // console.log(`Iter${iter}: ${resourceId} is missing: `, effPercentage, gameResources.resources[resourceId].targetEfficiency, gameResources.listMissing(), JSON.parse(JSON.stringify(gameResources.resources[resourceId])))
                        isAssertsFinished = false;
                    } else {
                        if (gameResources.resources[resourceId].isMissing && gameResources.resources[resourceId].balance > SMALL_NUMBER) {
                            // Resource was missing but now has positive balance - recalculate efficiency
                            if (!gameResources.resources[resourceId].isConstantEfficiency) {
                                const newTargetEff = calcTargetEfficiency(gameResources.resources[resourceId]);
                                const affected = resourceCalculators.toggleConsumingEfficiency(resourceId, newTargetEff, true);
                                gameResources.resources[resourceId].targetEfficiency = newTargetEff;
                                gameResources.resources[resourceId].isMissing = newTargetEff < 1;
                                addDirty(resourceId);
                                if(affected.affectedResources) {
                                    (affected.affectedResources || []).forEach(addDirty);
                                }
                            } else {
                                gameResources.resources[resourceId].isMissing = false;
                                gameResources.resources[resourceId].targetEfficiency = 1;
                            }
                            // console.log(`Iter${iter}: Toggling `+resourceId, newTargetEff, JSON.parse(JSON.stringify(newResourcesToUpdate)), gameResources.listMissing(), JSON.parse(JSON.stringify(gameResources.resources[resourceId])));
                            isAssertsFinished = false;
                        }
                    }
                }
            }
            // Update worklist after full pass
            resourcesToUpdate = [...new Set(newResourcesToUpdate)];
            // console.log(`Iter: ${iter}`, resourcesToUpdate.length, newResourcesToUpdate, JSON.parse(JSON.stringify(gameResources.resources)));
            if(iter > maxIter) {
                const problematicResources = resourcesToUpdate.map(resourceId => {
                    const res = gameResources.resources[resourceId];
                    return {
                        id: resourceId,
                        name: res.name,
                        balance: res.balance,
                        income: res.income,
                        consumption: res.consumption,
                        multiplier: res.multiplier,
                        amount: res.amount,
                        isMissing: res.isMissing,
                        targetEfficiency: res.targetEfficiency,
                        isService: res.isService,
                        isConstantEfficiency: res.isConstantEfficiency,
                        issues: [
                            res.isService && res.balance < -SMALL_NUMBER ? 'service_resource_negative_balance' : null,
                            !res.isService && -1*res.balance*dT - SMALL_NUMBER > res.amount ? 'resource_finishing' : null,
                            res.isMissing && res.balance > 0 ? 'missing_but_positive_balance' : null,
                        ].filter(Boolean)
                    };
                });
                
                console.error('CRITICAL ERROR: not able to find resources divergence.', {
                    iteration: iter,
                    maxIterations: maxIter,
                    resourcesStillUpdating: resourcesToUpdate,
                    problematicResources,
                    allResources: JSON.parse(JSON.stringify(gameResources.resources)),
                    missingResources: gameResources.listMissing()
                });
                isAssertsFinished = true;
            }
        }
        const end = performance.now();
        // console.log('FINISH_ITER: EntEEF', end - start, resourceModifiers.getModifier('entity_runningAction').efficiency);

        for(const resourceId in gameResources.resources) {
            if(gameResources.resources[resourceId].isService) {
                gameResources.setResource(resourceId, gameResources.resources[resourceId].balance, false, true);
            } else {
                gameResources.addResource(resourceId, gameResources.resources[resourceId].balance*dT, true);
            }

        }


        // console.log('iter ended: ', JSON.parse(JSON.stringify(gameResources.resources['crafting_ability'])));

        // console.log('END_UP: EntEEF', resourceModifiers.getModifier('entity_runningAction').efficiency);

    }

    reassertAll() {
        for(const modifierId in resourceModifiers.modifiers) {
            resourceModifiers.cacheModifier(modifierId);
            resourceCalculators.regenerateModifier(modifierId)
        }

    }

}

const resourcesManager = ResourcesManager.instance || new ResourcesManager();

export {
    gameResources,
    resourceModifiers,
    resourceCalculators,
    resourcesManager,
    resourceApi,
    gameEffects,
}