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
        // console.log('START_ITER: EntEEF', resourceModifiers.getModifier('entity_runningAction').efficiency);

        while(!isAssertsFinished) {
            isAssertsFinished = true;
            for(const resourceId in gameResources.resources) {
                if(gameResources.resources[resourceId].balance) {
                    if(gameResources.resources[resourceId].isService && gameResources.resources[resourceId].balance < -SMALL_NUMBER) {
                        // we are missing service resource
                        const effPercentage = gameResources.resources[resourceId].multiplier * gameResources.resources[resourceId].income / gameResources.resources[resourceId].consumption;
                        resourceCalculators.toggleConsumingEfficiency(resourceId, effPercentage, true);
                        gameResources.resources[resourceId].isMissing = true;
                        gameResources.resources[resourceId].amount = 0;
                        gameResources.resources[resourceId].targetEfficiency = effPercentage * gameResources.resources[resourceId].targetEfficiency;
                        isAssertsFinished = false;
                    } else
                    if(-1*gameResources.resources[resourceId].balance*dT - SMALL_NUMBER > gameResources.resources[resourceId].amount) {
                        // now we should retain list of stuff consuming
                        const effPercentage = gameResources.resources[resourceId].multiplier * gameResources.resources[resourceId].income / gameResources.resources[resourceId].consumption;
                        // console.log('resource is finishing: ', resourceId, gameResources.resources[resourceId].balance, effPercentage);
                        resourceCalculators.toggleConsumingEfficiency(resourceId, effPercentage, true);
                        gameResources.resources[resourceId].isMissing = true;
                        gameResources.resources[resourceId].amount = 0;
                        gameResources.resources[resourceId].targetEfficiency = effPercentage * gameResources.resources[resourceId].targetEfficiency;
                        isAssertsFinished = false;
                    }
                }
            }
        }
        const end = performance.now();
        // console.log('FINISH_ITER: EntEEF', end - start, resourceModifiers.getModifier('entity_runningAction').efficiency);

        for(const resourceId in gameResources.resources) {
            if(gameResources.resources[resourceId].isService) {
                gameResources.setResource(resourceId, gameResources.resources[resourceId].balance, false);
            } else {
                gameResources.addResource(resourceId, gameResources.resources[resourceId].balance*dT);
            }

        }

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