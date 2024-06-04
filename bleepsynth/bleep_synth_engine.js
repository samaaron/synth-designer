import Monitor from './monitor.js';
import Grammar from './grammar.js';
import BleepGenerator from './bleep_generator.js';
import BleepPlayer from './bleep_player.js';
import Reverb from './reverb.js';
import Constants from './constants.js';

export default class BleepSynthEngine {

    #monitor
    #synthSemantics
    #synthGrammar

    /**
     * make a bleep synth engine
     */
    constructor() {
        this.#monitor = new Monitor();
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
     * @param {AudioContext} ctx 
     * @param {BleepGenerator} generator 
     * @param {number} pitchHz 
     * @param {number} level 
     * @param {object} params 
     * @returns {BleepPlayer}
     */
    getPlayer(ctx, generator, pitchHz, level, params) {
        return new BleepPlayer(ctx, this.#monitor, generator, pitchHz, level, params);
    }

    /**
     * get an effect
     * @param {AudioContext} ctx 
     * @param {string} name 
     * @returns 
     */
    async getEffect(ctx, name) {
        let effect = null;
        switch (name) {
            case "reverb_medium":
                effect = new Reverb(ctx, this.#monitor);
                await effect.load("./bleepsynth/impulses/hall-medium.flac");
                break;
            case "reverb_large":
                effect = new Reverb(ctx, this.#monitor);
                await effect.load("./bleepsynth/impulses/hall-large.flac");
                break;
            case "reverb_small":
                effect = new Reverb(ctx, this.#monitor);
                await effect.load("./bleepsynth/impulses/hall-small.flac");
                break;
            case "reverb_massive":
                effect = new Reverb(ctx, this.#monitor);
                await effect.load("./bleepsynth/impulses/reactor-hall.flac");
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