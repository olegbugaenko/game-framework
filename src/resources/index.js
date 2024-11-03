import { gameResources } from "./game-resources";
import { resourceModifiers } from "./resource-modifiers";
import { resourceCalculators } from "./resource-calculators";
import { gameEffects } from "./game-effects";
import { resourceApi } from  "./resource-api";
import {SMALL_NUMBER} from "../utils/consts";

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
        console.log('iter started: ', JSON.parse(JSON.stringify(gameResources.resources['crafting_ability'])));
        gameResources.handleDelayed();
        let maxIter = 10;
        let iter = 0;
        // console.log('START_ITER: EntEEF', resourceModifiers.getModifier('entity_runningAction').efficiency);
        // console.log('asserting: ', JSON.parse(JSON.stringify(gameResources.resources['crafting_ability'])));
        let resourcesToUpdate = [];
        for (const resourceId in gameResources.resources) {
            resourcesToUpdate.push(resourceId);
        }

        while(!isAssertsFinished && resourcesToUpdate.length > 0) {
            isAssertsFinished = true;
            iter++;
            let newResourcesToUpdate = [];
            for(const resourceId of resourcesToUpdate) {
                if(gameResources.resources[resourceId].balance) {
                    if(gameResources.resources[resourceId].isService && gameResources.resources[resourceId].balance < -SMALL_NUMBER) {
                        // we are missing service resource
                        const effPercentage = gameResources.resources[resourceId].multiplier * gameResources.resources[resourceId].income / gameResources.resources[resourceId].consumption;
                        const togg = resourceCalculators.toggleConsumingEfficiency(resourceId, effPercentage, true);
                        newResourcesToUpdate.push(...togg.affectedResourceIds)
                        gameResources.resources[resourceId].isMissing = true;
                        gameResources.resources[resourceId].amount = 0;
                        gameResources.resources[resourceId].targetEfficiency = effPercentage * gameResources.resources[resourceId].targetEfficiency;
                        isAssertsFinished = false;
                    } else
                    if(-1*gameResources.resources[resourceId].balance*dT - SMALL_NUMBER > gameResources.resources[resourceId].amount) {
                        // now we should retain list of stuff consuming
                        const effPercentage = gameResources.resources[resourceId].multiplier * gameResources.resources[resourceId].income / gameResources.resources[resourceId].consumption;
                        // console.log('resource is finishing: ', resourceId, gameResources.resources[resourceId].balance, effPercentage);
                        const togg = resourceCalculators.toggleConsumingEfficiency(resourceId, effPercentage, true);
                        newResourcesToUpdate.push(...togg.affectedResourceIds)
                        gameResources.resources[resourceId].isMissing = true;
                        gameResources.resources[resourceId].amount = 0;
                        gameResources.resources[resourceId].targetEfficiency = effPercentage * gameResources.resources[resourceId].targetEfficiency;
                        isAssertsFinished = false;
                    }
                    resourcesToUpdate = [...new Set(newResourcesToUpdate)];
                }
            }
            console.log(`Iter: ${iter}`, resourcesToUpdate.length);
        }
        const end = performance.now();
        // console.log('FINISH_ITER: EntEEF', end - start, resourceModifiers.getModifier('entity_runningAction').efficiency);

        for(const resourceId in gameResources.resources) {
            if(gameResources.resources[resourceId].isService) {
                if(resourceId === 'crafting_ability') {
                    // it's positive due to paper is also missing for crafting enchanted paper
                    // but targetEfficiency < 1 due to it still missing if not other limitations
                    // so, we reset it back to 1 on delayed
                    // Next iteration - handleDelayed (set targetEfficiency to 1)
                    // so, we again re
                    console.log('Set at iter '+resourceId, gameResources.resources[resourceId].amount, gameResources.resources[resourceId].balance, gameResources.resources[resourceId].targetEfficiency, JSON.parse(JSON.stringify(gameResources.resources[resourceId])));
                }
                gameResources.setResource(resourceId, gameResources.resources[resourceId].balance, false, true);
            } else {
                gameResources.addResource(resourceId, gameResources.resources[resourceId].balance*dT, true);
            }

        }


        console.log('iter ended: ', JSON.parse(JSON.stringify(gameResources.resources['crafting_ability'])));

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