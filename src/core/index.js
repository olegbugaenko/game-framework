import {gameResources, resourcesManager} from "../resources";
import {gameEntity} from "../game-entity";
import {gameUnlocks} from "../utils/unlocks";

export class GameCore {

    constructor() {
        this.isInitialized = false;
        this.isTicking = false;
        this.modules = {};
        this.globalTime = 0;
        this.numTicks = 0;
        this.pid = Math.random();
        GameCore.instance = this;
    }

    registerModule(id, moduleProto) {
        if(this.modules[id]) return;

        const module = new moduleProto();

        module.gameInstance = this;

        if(!module.initialize) {
            throw new Error(`Module ${id} missing "initialize" method implementation`)
        }
        if(!module.tick) {
            throw new Error(`Module ${id} missing "tick" method implementation`)
        }
        if(!module.load) {
            throw new Error(`Module ${id} missing "load" method implementation`)
        }
        if(!module.save) {
            throw new Error(`Module ${id} missing "save" method implementation`)
        }
        this.modules[id] = module;
    }

    getModule(id) {
        return this.modules[id];
    }

    initialize(cb) {
        for(const key in this.modules) {
            this.modules[key].initialize(this);
        }
        resourcesManager.initialize();
        gameUnlocks.initialize();
        if(cb) {
            cb(this);
        }

        this.isInitialized = true;
    }

    startTicking(interval, delta, cb, bDebug) {
        this.isTicking = true;
        this.ticker = setInterval(() => {
            if(this.isInitialized) {
                let ticks = {};
                let start;
                let total = 0;
                for(const key in this.modules) {
                    if(bDebug) {
                        start = performance.now();
                    }
                    this.modules[key].tick(this, delta);
                    if(bDebug) {
                        const dt = performance.now() - start;
                        ticks[key] = dt;
                        total += dt;
                    }
                }
                if(bDebug) {
                    start = performance.now();
                }
                resourcesManager.tick(delta);
                if(bDebug) {
                    ticks['resourcesManager'] = performance.now() - start;
                    total += ticks['resourcesManager'];
                    console.log('TICKS: ', ticks, total);
                }
                cb(this, delta);
                this.numTicks++;
                this.globalTime += delta;
            }
        }, interval)
    }

    stopTicking() {
        clearInterval(this.ticker);
    }

    save() {
        const obj = {};
        for(const key in this.modules) {
            obj[key] = this.modules[key].save();
        }
        obj.resources = gameResources.save();
        obj.globalTime = this.globalTime;
        obj.numTicks = this.numTicks;
        obj.lastSave = Date.now();
        return obj;
    }

    load(obj) {
        gameResources.load(obj.resources || {});
        for(const key in this.modules) {
            this.modules[key].load(obj[key]);
        }
        gameResources.load(obj.resources || {});
        this.numTicks = obj.numTicks;
        this.globalTime = obj.globalTime;
    }

    getModule(id) {
        return this.modules[id];
    }

}

export const gameCore = GameCore.instance || new GameCore();