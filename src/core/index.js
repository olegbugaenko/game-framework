import {gameResources, resourcesManager} from "../resources";
import {gameEntity} from "../game-entity";

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
        gameEntity.initialize();
        if(cb) {
            cb(this);
        }

        this.isInitialized = true;
    }

    startTicking(interval, delta, cb) {
        this.isTicking = true;
        this.ticker = setInterval(() => {
            if(this.isInitialized) {
                for(const key in this.modules) {
                    this.modules[key].tick(this, delta);
                }
                resourcesManager.tick(delta);
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