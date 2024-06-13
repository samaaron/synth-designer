import BleepSynthEngine from "../bleepsynth/core/bleep_synth_engine.js";

export default class Model {

    #fileHandle = null;
    #wasEdited = false;
    #generator = null;
    #context = null;
    #controlMap = null;
    #synthEngine = null;
    #fx = null;
    
    static #instance = null;
    static #privateKey = Symbol("privateKey");

    constructor(key) {
        if (key !== Model.#privateKey) {
            throw new Error("Cannot instantiate a new Model. Use getInstance() instead.");
        }
    }

    async #initialize() {
        this.#context = new AudioContext();
        this.#synthEngine = await BleepSynthEngine.createInstance(this.#context);
    }

    static async getInstance() {
        if (!Model.#instance) {
            Model.#instance = new Model(Model.#privateKey);
            await Model.#instance.#initialize();
        }
        return Model.#instance;
    }

    get context() {
        return this.#context;
    }

    get wasEdited() {
        return this.#wasEdited;
    }

    set wasEdited(value) {
        this.#wasEdited = value;
    }

    get generator() {
        return this.#generator;
    }

    set generator(value) {
        this.#generator = value;
    }

    get fx() {
        return this.#fx;
    }   

    set fx(value) {
        this.#fx = value;
    }   

    get fileHandle() {
        return this.#fileHandle;
    }

    set fileHandle(value) {
        this.#fileHandle = value;
    }

    get synthEngine() {
        return this.#synthEngine;
    }   

    set synthEngine(value) {
        this.#synthEngine = value;
    }

}