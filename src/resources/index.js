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
        // console.log('iter started: ', JSON.parse(JSON.stringify(gameResources.resources['crafting_ability'])));
        gameResources.handleDelayed();
        let maxIter = 10;
        let iter = 0;
        // console.log('START_ITER: EntEEF', resourceModifiers.getModifier('entity_runningAction').efficiency);
        // console.log('asserting: ', JSON.parse(JSON.stringify(gameResources.resources['crafting_ability'])));
        let resourcesToUpdate = [];
        for (const resourceId in gameResources.resources) {
            resourcesToUpdate.push(resourceId);
        }

        while(!isAssertsFinished) {
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
                        console.log(`Iter${iter}: ${resourceId} is missing: `, effPercentage, gameResources.resources[resourceId].targetEfficiency, gameResources.listMissing(), JSON.parse(JSON.stringify(gameResources.resources[resourceId])))
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
                        console.log(`Iter${iter}: ${resourceId} is missing: `, effPercentage, gameResources.resources[resourceId].targetEfficiency, gameResources.listMissing(), JSON.parse(JSON.stringify(gameResources.resources[resourceId])))
                        isAssertsFinished = false;
                    } else {
                        if (gameResources.resources[resourceId].isMissing && gameResources.resources[resourceId].balance > 0) {
                            // console.log('Toggling '+resourceId);
                            // ми тугланули на 100% ресурс котрий ми начебто міссили. (crafting_ability)
                            // але цей тугл тягне за собою необхідність апдейту тих resourceModifiers, у яких ботлнек - цей ресурс
                            // Ми апдейтимо ефективність крафту паперу на 1, але у магічного паперу ботлнек - папір, якого ми не чіпаємо
                            // Тому, нам потрібно також перевіряти список ресурсів, у яких баланс > 0 і ми їх місаємо.
                            // Для таких ресурсів вартувало б ресетити ефективність
                            // Якщо ми ресетнемо ефективність паперу, позаяк його баланс є > 0, і він міссінг - це призведе
                            // до того, що баланс паперу знову стане негативним, і ми будемо змушені його перерахувати.
                            // Для того нам потрібно баланс паперу додавати в масив
                            // Як знати що саме його додати - це ресурс, який генерується чи мультиплікується ентітьою,
                            // котрій ми шомно ресетнули
                            // Тобто, якщо ми ресетнули ефективність по ресурсу crafting_ability - перевіряємо усе що генерилося
                            // тим що консюмить resourceId, і докидуємо ссууудааа
                            const prEff = gameResources.resources[resourceId].targetEfficiency;
                            const exceedFactor = gameResources.resources[resourceId].consumption
                                ? gameResources.resources[resourceId].multiplier * gameResources.resources[resourceId].income / gameResources.resources[resourceId].consumption
                                : 1./(SMALL_NUMBER + prEff);
                            const affected = resourceCalculators.toggleConsumingEfficiency(resourceId, exceedFactor, true);
                            gameResources.resources[resourceId].targetEfficiency = prEff * exceedFactor;
                            gameResources.resources[resourceId].isMissing = gameResources.resources[resourceId].targetEfficiency < 1;
                            const prUp = [...newResourcesToUpdate];
                            newResourcesToUpdate.push(resourceId);
                            if(affected.affectedResources) {
                                newResourcesToUpdate.push(...affected.affectedResources);
                            }
                            console.log(`Iter${iter}: Toggling `+resourceId, prEff, 1./(SMALL_NUMBER + prEff), exceedFactor, JSON.parse(JSON.stringify(newResourcesToUpdate)), gameResources.listMissing(), JSON.parse(JSON.stringify(gameResources.resources[resourceId])));
                            isAssertsFinished = false;
                        }
                    }
                    resourcesToUpdate = [...new Set(newResourcesToUpdate)];
                }
            }
            // console.log(`Iter: ${iter}`, resourcesToUpdate.length, newResourcesToUpdate, JSON.parse(JSON.stringify(gameResources.resources)));
            if(iter > maxIter) {
                console.error('CRITICAL ERROR: not able to find resources divergence.', JSON.parse(JSON.stringify(gameResources.resources)), gameResources.listMissing());
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