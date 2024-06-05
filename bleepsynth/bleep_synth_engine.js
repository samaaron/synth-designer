import Monitor from './monitor.js';
import Grammar from './grammar.js';
import BleepGenerator from './bleep_generator.js';
import BleepPlayer from './bleep_player.js';
import Reverb from './reverb.js';
import Constants from './constants.js';
import AutoPan from './autopan.js';
import Flanger from './flanger.js';
import SampleCache from './samplecache.js';

export default class BleepSynthEngine {

    #monitor
    #cache
    #synthSemantics
    #synthGrammar
    #context

    /**
     * make a bleep synth engine
     */
    constructor(context) {
        this.#context = context;
        this.#monitor = new Monitor();
        this.#cache = new SampleCache(context);
        ({ synthSemantics: this.#synthSemantics, synthGrammar: this.#synthGrammar } = Grammar.makeGrammar());
    }

    /**
     * get a generator from a synth specification
     * @param {string} spec 
     */
    getGenerator(spec) {
        let generator = null;
        let result = this.#synthGrammar.match(spec + "\n");
        let message = null;
        if (result.succeeded()) {
            try {
                message = "OK";
                const adapter = this.#synthSemantics(result);
                let json = Grammar.convertToStandardJSON(adapter.interpret());
                generator = new BleepGenerator(json);
                if (generator.hasWarning) {
                    message += "\n" + generator.warningString;
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
     * @param {AudioContext} context 
     * @param {BleepGenerator} generator 
     * @param {number} pitchHz 
     * @param {number} level 
     * @param {object} params 
     * @returns {BleepPlayer}
     */
    getPlayer(generator, pitchHz, level, params) {
        return new BleepPlayer(this.#context, this.#monitor, generator, pitchHz, level, params);
    }

    /**
     * get an effect
     * @param {AudioContext} ctx 
     * @param {string} name 
     * @returns 
     */
    async getEffect(name) {
        let effect = null;
        switch (name) {
            case "reverb_medium":
            case "reverb_large":
            case "reverb_small":
            case "reverb_massive":
            case "room_large":
            case "room_small":
            case "plate_drums":
            case "plate_vocal":
            case "plate_large":
            case "plate_small":
            case "ambience_large":
            case "ambience_medium":
            case "ambience_small":
            case "ambience_gated":
                effect = new Reverb(this.#context, this.#monitor, this.#cache);
                await effect.load(Constants.REVERB_IMPULSES[name]);
                break;
            case "autopan":
                effect = new AutoPan(this.#context, this.#monitor);
                break;
            case "flanger":
                effect = new Flanger(this.#context, this.#monitor);
                break;
            default:
                console.error("unknown effect name: " + name);
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
        return Constants.EFFECT_CLASSES;
    }

    /**
     * get the module names
     * @returns {Array<string>}
     */
    static getModuleNames() {
        return Object.keys(Constants.MODULE_CLASSES);
    }

}