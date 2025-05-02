export class ResourceModifiers {

    constructor() {
        this.modifiers = {}
        this.modifiersGroupped = {
            byResource: {},
            byEffect: {},
            byDeps: {},
            byResourceDeps: {}
        }
        ResourceModifiers.instance = this;
    }

    registerModifier(modifier, entityRefId = null) {
        if(modifier.groupId && entityRefId) {
            modifier = this.modifiers[modifier.groupId] ?? modifier;
            // console.log('(modifier.entityRefs || [])', modifier, this.modifiers);
            modifier.entityRefs ? modifier.entityRefs.push(entityRefId) : modifier.entityRefs = [entityRefId];
        }
        if(modifier.level == null) {
            modifier.level = 0
        }
        if(!modifier.id) {
            throw new Error(`Unique id is required`);
        }
        modifier.efficiency = modifier.efficiency || 1;
        this.modifiers[modifier.id] = modifier;

        const result = this.cacheModifier(modifier.id);

        // console.log('Modiff: ', this.modifiers, this.modifiersGroupped);

        return result;

    }

    unsetModifier(modifierId) {
        if(!this.modifiers[modifierId]) return;

        for(const id in this.modifiersGroupped.byResource) {
            for(const effectKey in this.modifiersGroupped.byResource[id]) {
                this.modifiersGroupped.byResource[id][effectKey] = this.modifiersGroupped.byResource[id][effectKey]
                    .filter(one => one !== modifierId);
            }
        }

        for(const id in this.modifiersGroupped.byEffect) {
            for(const effectKey in this.modifiersGroupped.byEffect[id]) {
                this.modifiersGroupped.byEffect[id][effectKey] = this.modifiersGroupped.byEffect[id][effectKey]
                    .filter(one => one !== modifierId);
            }
        }

        for(const id in this.modifiersGroupped.byDeps) {
            this.modifiersGroupped.byDeps[id] = this.modifiersGroupped.byDeps[id]
                .filter(one => one !== modifierId);
        }

        for(const id in this.modifiersGroupped.byResourceDeps) {
            this.modifiersGroupped.byResourceDeps[id] = this.modifiersGroupped.byResourceDeps[id]
                .filter(one => one !== modifierId);
        }

        delete this.modifiers[modifierId];
    }

    getModifier(id) {
        if(!this.modifiers[id]) {
            throw new Error(`Modifier ${id} wasn't found`)
        }

        return this.modifiers[id];
    }

    setEfficiency(id, efficiency) {
        this.getModifier(id).efficiency = efficiency;
        // return this.cacheModifier(modifier.id);
    }

    updateLevel(id, level) {
        this.getModifier(id).level = level;
        // return this.cacheModifier(modifier.id);
    }

    unpackModifier(modifier, effectKey) {

        if(modifier[`get_${effectKey}`]) {
            modifier[effectKey] = modifier[`get_${effectKey}`]();
        }

        if(modifier[effectKey].resources && modifier.allowedImpacts.includes('resources')) {
            for(const key in modifier[effectKey].resources) {
                if(!this.modifiersGroupped.byResource[key]) {
                    this.modifiersGroupped.byResource[key] = {

                    }
                }
                if(!this.modifiersGroupped.byResource[key][effectKey]) {
                    this.modifiersGroupped.byResource[key][effectKey] = []
                }
                if(!this.modifiersGroupped.byResource[key][effectKey].find(mod => mod === modifier.id)) {
                    this.modifiersGroupped.byResource[key][effectKey].push(modifier.id);
                }
            }
        }
        if(modifier[effectKey].effects && modifier.allowedImpacts.includes('effects')) {
            for(const key in modifier[effectKey].effects) {
                if(!this.modifiersGroupped.byEffect[key]) {
                    this.modifiersGroupped.byEffect[key] = {

                    }
                }
                if(!this.modifiersGroupped.byEffect[key][effectKey]) {
                    this.modifiersGroupped.byEffect[key][effectKey] = []
                }
                if(!this.modifiersGroupped.byEffect[key][effectKey].find(mod => mod === modifier.id)) {
                    this.modifiersGroupped.byEffect[key][effectKey].push(modifier.id);
                }
            }
        }
    }

    // caches all dependencies
    cacheModifier(id) {
        const modifier = this.getModifier(id);
        // Now group down modifiers
        if(modifier.income || modifier.get_income) {
            this.unpackModifier(modifier, 'income');
        }
        if(modifier.multiplier || modifier.get_multiplier) {
            this.unpackModifier(modifier, 'multiplier');
        }
        if(modifier.consumption || modifier.get_consumption) {
            this.unpackModifier(modifier, 'consumption');
        }
        if(modifier.rawCap || modifier.get_rawCap) {
            this.unpackModifier(modifier, 'rawCap');
        }
        if(modifier.capMult || modifier.get_capMult) {
            this.unpackModifier(modifier, 'capMult');
        }
        if(modifier.effectDeps) {
            modifier.effectDeps.forEach(dep => {
                if(!this.modifiersGroupped.byDeps[dep]) {
                    this.modifiersGroupped.byDeps[dep] = [];
                }
                if(!this.modifiersGroupped.byDeps[dep].includes(modifier.id)) {
                    this.modifiersGroupped.byDeps[dep].push(modifier.id)
                }
            })

        }
        if(modifier.resourceDeps) {
            modifier.resourceDeps.forEach(dep => {
                if(!this.modifiersGroupped.byResourceDeps[dep]) {
                    this.modifiersGroupped.byResourceDeps[dep] = [];
                }
                if(!this.modifiersGroupped.byResourceDeps[dep].includes(modifier.id)) {
                    this.modifiersGroupped.byResourceDeps[dep].push(modifier.id)
                }
            })

        }
        /*if(modifier.effect) {
            this.unpackModifier(modifier, 'effect');
        }
        if(modifier.effectMult) {
            this.unpackModifier(modifier, 'effectMult');
        }*/

        return modifier;
    }

    // get list of dependant resources or effects to re-assert
    getDependenciesToRegenerate(id) {
        const modif = this.getModifier(id);
        const dependantResources = [];
        const dependantEffects = [];

        if(modif.income) {
            dependantResources.push(...Object.keys(modif.income.resources || []))
            dependantEffects.push(...Object.keys(modif.income.effects || []))
        }

        if(modif.multiplier) {
            dependantResources.push(...Object.keys(modif.multiplier.resources || []))
            dependantEffects.push(...Object.keys(modif.multiplier.effects || []))
        }

        if(modif.consumption) {
            dependantResources.push(...Object.keys(modif.consumption.resources || []))
            dependantEffects.push(...Object.keys(modif.consumption.effects || []))
        }

        if(modif.rawCap) {
            dependantResources.push(...Object.keys(modif.rawCap.resources || []))
            dependantEffects.push(...Object.keys(modif.rawCap.effects || []))
        }

        if(modif.capMult) {
            dependantResources.push(...Object.keys(modif.capMult.resources || []))
            dependantEffects.push(...Object.keys(modif.capMult.effects || []))
        }

        if(modif.reourcesToReassert) {
            dependantResources.push(...modif.reourcesToReassert);
        }

        return {
            resources: dependantResources,
            effects: dependantEffects,
        }
    }

    cacheAll() {
        Object.keys(this.modifiers).forEach(id => this.cacheModifier(id))
    }

}

export const resourceModifiers = ResourceModifiers.instance || new ResourceModifiers();