import BleepGenerator from './bleep_generator.js';
import BleepPlayer from './bleep_player.js';
import Constants from './constants.js';
import Grammar from './grammar.js';
import Monitor from './monitor.js';
import Reverb from '../effects/reverb.js';
import BufferCache from './buffer_cache.js';
import BleepEffect from '../effects/effect.js';
import Sampler from './sampler.js';
import Meter from './meter.js';
import FinalMix from './final_mix.js';

const privateContructorKey = Symbol("privateContructorKey");

export default class BleepSynthEngine {

    static WAVE_CYCLE_DATA = "bleepsynth/cycles/cycle_defs.json";
    static PRESETS_PATH = "bleepsynth/presets";
    static SAMPLES_PATH = "bleepsynth/samples";

    #monitor
    #bufferCache
    #synthCache
    #synthSemantics
    #synthGrammar
    #context
    #cycles = null;

    /**
     * make a bleep synth engine
     * cannot not call this directly, use createInstance(context)
     * @param {AudioContext} context
     */
    constructor(key) {
        if (key !== privateContructorKey) {
            throw new Error("BleepSynthEngine: Cannot call constructor directly, use createInstance(context)");
        }
        this.#context = new AudioContext();
        this.#monitor = new Monitor();
        this.#bufferCache = new BufferCache(this.#context);
        this.#synthCache = new Map();
        ({ semantics: this.#synthSemantics, grammar: this.#synthGrammar } = Grammar.makeGrammar());
    }

    /**
     * create an instance of the engine
     * @param {AudioContext} context
     * @returns {Promise<BleepSynthEngine>}
     */
    static async createInstance() {
        const engine = new BleepSynthEngine(privateContructorKey);
        await engine.#initialise();
        return engine;
    }

    /**
     * initialise the engine
     */
    async #initialise() {
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

    /**
     * get a synth generator from a URL
     * @param {string} url
     * @returns {Promise<{generator: BleepGenerator, message: string}>}
     */
    async createGeneratorFromURL(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error when fetching file: ${response.status}`);
        }
        const spec = await response.text();
        return this.createGeneratorFromSpec(spec);
    }

    /**
     * get a generator from a text synth specification
     * @param {string} spec
     */
    createGeneratorFromSpec(spec) {
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
    createPlayerFromGenerator(generator, params={}) {
        return new BleepPlayer(this.#context, this.#monitor, generator, this.#cycles, params);
    }

    /**
     * get a named synth player
     * @param {string} name
     * @param {object} params
     * @returns {BleepPlayer}
     */
    createPlayer(name, params = {}) {
        if (this.#synthCache.has(name)) {
            const generator = this.#synthCache.get(name);
            return this.createPlayerFromGenerator(generator, params);
        } else {
            throw new Error(`No generator found for ${name}`);
        }
    }

    /**
     * load a synth definition from a file into the synthdef cache
     * @param {string} filename
     */
    async loadSynthDef(filename) {
        const url = `${BleepSynthEngine.PRESETS_PATH}/${filename}.txt`;
        const { generator, message } = await this.createGeneratorFromURL(url);
        console.log(message);
        this.#synthCache.set(generator.shortname, generator);
    }

    /**
     * load all the preset synth definitions into the cache
     */
    async loadPresetSynthDefs() {
        for (let filename of Constants.SYNTH_PRESETS) {
            await this.loadSynthDef(filename);
        }
    }

    /**
     * load a sample into the buffer cache
     * @param {string} sampleName
     */
    loadSample(sampleName) {
        this.#bufferCache.loadBuffer(`${BleepSynthEngine.SAMPLES_PATH}/${sampleName}.flac`, this.#context);
    }

    /**
     * play a sample
     * @param {number} when
     * @param {string} sampleName
     * @param {AudioNode} outputNode
     * @param {object} params
     */
    playSample(when = this.#context.currentTime, sampleName, outputNode, params = {}) {
        const samplePath = `${BleepSynthEngine.SAMPLES_PATH}/${sampleName}.flac`;
        this.#bufferCache.loadBuffer(samplePath, this.#context)
            .then(buffer => {
                const sampler = new Sampler(this.#context, this.#monitor, buffer, params);
                sampler.out.connect(outputNode);
                sampler.play(when);
            });
    }

    /**
     * get an effect
     * @param {string} name
     * @returns {BleepEffect}
     */
    async createEffect(name) {
        let effect = null;
        const className = Constants.EFFECT_CLASSES[name];
        if (className === Reverb) {
            effect = new Reverb(this.#context, this.#monitor, this.#bufferCache);
            await effect.load(Constants.REVERB_IMPULSES[name]);
        } else {
            effect = new className(this.#context, this.#monitor);
        }
        return effect;
    }

    createMeter() {
        return new Meter(this.#context, this.#monitor);
    }

    createFinalMix() {
        return new FinalMix(this.#context, this.#monitor);
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

    /**
     * get the array of synth presets
     * @returns {Array<string>}
     */
    static getPresetNames() {
        return Constants.SYNTH_PRESETS;
    }

    /**
     * get the audio context
     * @returns {AudioContext}
     */
    get context() {
        return this.#context;
    }

    /**
     * get the current time (of the audio context)
     * @returns {number}
     */
    get currentTime() {
        return this.#context.currentTime;
    }

    /**
     * get the destination (of the audio context)
     * @returns {AudioDestinationNode}
     */
    get destination() {
        return this.#context.destination;
    }

}