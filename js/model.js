import BleepSynthEngine from "../bleepsynth/core/bleep_synth_engine.js";

export default class Model {

    #fileHandle = null;
    #wasEdited = false;
    #generator = null;
    #context = null;
    #synthEngine = null;
    #fx = null;
    #spec = null;
    #message = null;
    #learning = false;
    #lastSliderMoved = -1;

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

    set spec(value) {
        this.#spec = value;
    }

    get spec() {
        return this.#spec;
    }

    get message() {
        return this.#message;
    }

    set message(value) {
        this.#message = value;
    }

    set learning(value) {
        this.#learning = value;
    }

    get learning() {
        return this.#learning;
    }

    set lastSliderMoved(value) {
        this.#lastSliderMoved = value;
    }

    get lastSliderMoved() {
        return this.#lastSliderMoved;
    }

    /**
    * load file
    * https://developer.chrome.com/articles/file-system-access/
    */
    async loadFile() {
        [this.#fileHandle] = await window.showOpenFilePicker();
        const file = await this.#fileHandle.getFile();
        this.#spec = await file.text();
        this.#wasEdited = false;
        const result = this.#synthEngine.getGeneratorFromSpec(this.#spec);
        this.#generator = result.generator;
        this.#message = result.message;
    }

    /**
    * save file
    * https://developer.chrome.com/articles/file-system-access/
    */
    async saveFile() {
        if (this.#fileHandle != null) {
            const writable = await this.#fileHandle.createWritable();
            await writable.write(this.#spec);
            await writable.close();
            this.#wasEdited = false;
        }
    }

    /**
     * save as file
     * https://developer.chrome.com/articles/file-system-access/
     */
    async saveAsFile() {
        let opts = {};
        if (this.#generator.shortname.length > 0) {
            opts.suggestedName = this.#generator.shortname + ".txt";
        }
        this.#fileHandle = await window.showSaveFilePicker(opts);
        const writable = await this.#fileHandle.createWritable();
        await writable.write(this.#spec);
        await writable.close();
        this.#wasEdited = false;
    }

}