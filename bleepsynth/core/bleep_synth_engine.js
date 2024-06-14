import BleepGenerator from './bleep_generator.js';
import BleepPlayer from './bleep_player.js';
import Constants from './constants.js';
import Grammar from './grammar.js';
import Monitor from './monitor.js';
import Reverb from '../effects/reverb.js';
import SampleCache from './samplecache.js';
import BleepEffect from '../effects/effect.js'; 

const privateContructorKey = Symbol("privateContructorKey");

export default class BleepSynthEngine {

    static WAVE_CYCLE_DATA = `bleepsynth/cycles/cycle_defs.json`;

    #monitor
    #cache
    #synthSemantics
    #synthGrammar
    #context
    #cycles = null;

    /**
     * make a bleep synth engine
     * do not call this directly, use createInstance(context)
     * @param {AudioContext} context
     */
    constructor(context, key) {
        if (key !== privateContructorKey) {
            throw new Error("BleepSynthEngine: Cannot call constructor directly, use createInstance(context)");
        }
        this.#context = context;
        this.#monitor = new Monitor();
        this.#cache = new SampleCache(context);
        ({ semantics: this.#synthSemantics, grammar: this.#synthGrammar } = Grammar.makeGrammar());
    }

    /**
     * create an instance of the engine
     * @param {AudioContext} context
     * @returns {Promise<BleepSynthEngine>}
     */
    static async createInstance(context) {
        const engine = new BleepSynthEngine(context, privateContructorKey);
        await engine.initialise();
        return engine;
    }

    /**
     * initialise the engine
     */
    async initialise() {
        await this.#loadCycles();
    }

    /**
     * load wave cycles
     * @returns {Promise<object>}
     */
    async #loadCycles() {
        try {
            const response = await fetch(BleepSynthEngine.WAVE_CYCLE_DATA);
            if (!response.ok) {
                throw new Error(`HTTP error when fetching wave cycles: ${response.status}`);
            }
            this.#cycles = await response.json();
        } catch (error) {
            console.error("Unable to fetch wave cycles:", error);
        }
    }
    
    async getGeneratorFromFile(filename) {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP error when fetching file: ${response.status}`);
        }
        const spec = await response.text();
        return this.getGeneratorFromSpec(spec);
    }

    /**
     * get a generator from a synth specification
     * @param {string} spec 
     */
    getGeneratorFromSpec(spec) {
        let generator = null;
        let result = this.#synthGrammar.match(spec + "\n");
        let message = null;
        if (result.succeeded()) {
            try {
                message = "OK";
                const adapter = this.#synthSemantics(result);
                let json = adapter.interpret();
                generator = new BleepGenerator(json,this.#cycles);
                if (generator.hasWarning) {
                    message += "\n" + generator.warningString;
                }
                if (!generator.isValid) {
                    message += "\n" + generator.errorString;
                }
            } catch (error) {
                message = error.message;
            }
        } else {
            message = result.message;
        }
        return { generator: generator, message: message };
    }

    /**
     * get a player from a generator
     * @param {BleepGenerator} generator 
     * @param {number} pitchHz 
     * @param {number} level 
     * @param {object} params 
     * @returns {BleepPlayer}
     */
    getPlayer(generator, params={}) {
        return new BleepPlayer(this.#context, this.#monitor, generator, this.#cycles, params);
    }

    /**
     * get an effect
     * @param {string} name 
     * @returns {BleepEffect}
     */
    async getEffect(name) {
        let effect = null;
        const className = Constants.EFFECT_CLASSES[name];
        if (className === Reverb) {
            effect = new Reverb(this.#context, this.#monitor, this.#cache);
            await effect.load(Constants.REVERB_IMPULSES[name]);
        } else {
            effect = new className(this.#context, this.#monitor);
        }
        return effect;
    }

    /**
     * get the monitor
     * @returns {Monitor}
     */
    get monitor() {
        return this.#monitor;
    }

    /**
     * get the effect names
     * @returns {Array<string>} 
     */
    static getEffectNames() {
        return Object.keys(Constants.EFFECT_CLASSES);
    }

    /**
     * get the module names
     * @returns {Array<string>}
     */
    static getModuleNames() {
        return Object.keys(Constants.MODULE_CLASSES);
    }

}