import { gameResources } from "./game-resources";
import { resourceModifiers } from "./resource-modifiers";
import { resourceCalculators } from "./resource-calculators";
import { gameEffects } from "./game-effects";
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
        while(!isAssertsFinished) {
            isAssertsFinished = true;
            for(const resourceId in gameResources.resources) {
                if(gameResources.resources[resourceId].balance) {
                    if(-1*gameResources.resources[resourceId].balance*dT - SMALL_NUMBER > gameResources.resources[resourceId].amount) {
                        console.log('resource is finishing: ', resourceId, gameResources.resources[resourceId].balance);
                        // now we should retain list of stuff consuming
                        const effPercentage = gameResources.resources[resourceId].multiplier * gameResources.resources[resourceId].income / gameResources.resources[resourceId].consumption;
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
        // console.log('FINISH_ITER: ', end - start, resourceModifiers.getModifier('entity_supply_pottery').efficiency, resourceModifiers.getModifier('entity_supply_clothes').efficiency);

        for(const resourceId in gameResources.resources) {
            gameResources.addResource(resourceId, gameResources.resources[resourceId].balance*dT);
        }
    }

}

const resourcesManager = ResourcesManager.instance || new ResourcesManager();

export {
    gameResources,
    resourceModifiers,
    resourceCalculators,
    resourcesManager,
    gameEffects,
}