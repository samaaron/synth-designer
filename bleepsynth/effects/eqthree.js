import Effect from "./effect.js";
import { MonitoredBiquadFilterNode } from "../core/monitored_components.js";
import Utility from "../core/utility.js";
import Monitor from "../core/monitor.js";

/**
 * EQThree - three band equaliser
 */

export default class EQThree extends Effect {

    static PARAMS = {
        lowGain: { min: -30, max: 30, default: 0 },
        midGain: { min: -30, max: 30, default: 0 },
        highGain: { min: -30, max: 30, default: 0 },
        lowFreq: { min: 10, max: 2000, default: 400 },
        highFreq: { min: 2000, max: 20000, default: 4000 }
    }

    #lowFreq = EQThree.PARAMS.lowFreq.default;
    #highFreq = EQThree.PARAMS.highFreq.default;

    #lowBand
    #midBand
    #highBand

    /**
     * constructor
     * @param {AudioContext} context 
     * @param {Monitor} monitor 
     */
    constructor(context, monitor) {
        super(context, monitor);
        this.#lowFreq = EQThree.PARAMS.lowFreq.default;
        this.#highFreq = EQThree.PARAMS.highFreq.default;
        this.#lowBand = new MonitoredBiquadFilterNode(context, monitor, {
            type: "lowshelf",
            frequency: this.#lowFreq,
            gain: EQThree.PARAMS.lowGain.default
        });
        this.#midBand = new MonitoredBiquadFilterNode(context, monitor, {
            type: "peaking",
            frequency: this.#getMidFreq(),
            Q: this.#getMidQ(),
            gain: EQThree.PARAMS.midGain.default
        });
        this.#highBand = new MonitoredBiquadFilterNode(context, monitor, {
            type: "highshelf",
            frequency: this.#highFreq,
            gain: EQThree.PARAMS.highGain.default
        });
        // connect up
        this._wetGain.connect(this.#lowBand);
        this.#lowBand.connect(this.#midBand);
        this.#midBand.connect(this.#highBand);
        this.#highBand.connect(this._out);
        // default levels
        this.setWetLevel(1);
        this.setDryLevel(0);
    }

    /**
     * calculate the mid frequency as geometric mean of low and high
     * @returns {number}
     */
    #getMidFreq() {
        return Math.sqrt(this.#lowFreq * this.#highFreq);
    }

    /**
     * calculate the mid band Q 
     * @returns {number}
     */
    #getMidQ() {
        return this.#getMidFreq() / (this.#highFreq - this.#lowFreq);
    }

    /**
     * set the parameters
     * @param {object} params 
     * @param {number} when 
     */
    setParams(params, when = this._context.currentTime) {
        super.setParams(params, when);
        if (params.lowGain !== undefined) {
            this.#setLowGain(params.lowGain, when);
        }
        if (params.midGain !== undefined) {
            this.#setMidGain(params.midGain, when);
        }
        if (params.highGain !== undefined) {
            this.#setHighGain(params.highGain, when);
        }
        if (params.lowFreq !== undefined) {
            this.#setLowFreq(params.lowFreq, when);
        }
        if (params.highFreq !== undefined) {
            this.#setHighFreq(params.highFreq, when);
        }
    }

    /**
     * set the low gain
     * @param {number} g 
     * @param {number} when 
     */
    #setLowGain(g, when = this._context.currentTime) {
        g = Utility.clamp(g, EQThree.PARAMS.lowGain.min, EQThree.PARAMS.lowGain.max);
        this.#lowBand.gain.setValueAtTime(g, when);
    }

    /**
     * set the mid gain
     * @param {number} g 
     * @param {number} when 
     */
    #setMidGain(g, when = this._context.currentTime) {
        g = Utility.clamp(g, EQThree.PARAMS.midGain.min, EQThree.PARAMS.midGain.max);
        this.#midBand.gain.setValueAtTime(g, when);
    }

    /**
     * set the high gain
     * @param {number} g 
     * @param {number} when 
     */
    #setHighGain(g, when = this._context.currentTime) {
        g = Utility.clamp(g, EQThree.PARAMS.highGain.min, EQThree.PARAMS.highGain.max);
        this.#highBand.gain.setValueAtTime(g, when);
    }   

    /**
     * set the low frequency
     * @param {number} f 
     * @param {number} when 
     */
    #setLowFreq(f, when = this._context.currentTime) {
        f = Utility.clamp(f, EQThree.PARAMS.lowFreq.min, EQThree.PARAMS.lowFreq.max);
        this.#lowBand.frequency.setValueAtTime(f, when);
        this.#updateMiddleBand(when);
    }

    /**
     * set the high frequency
     * @param {number} f 
     * @param {number} when 
     */
    #setHighFreq(f, when = this._context.currentTime) {
        f = Utility.clamp(f, EQThree.PARAMS.highFreq.min, EQThree.PARAMS.highFreq.max);
        this.#highBand.frequency.setValueAtTime(f, when);
        this.#updateMiddleBand(when);
    }

    /**
     * update the middle band frequency and Q
     * @param {number} when 
     */
    #updateMiddleBand(when = this._context.currentTime) {
        this.#midBand.frequency.setValueAtTime(this.#getMidFreq(), when);
        this.#midBand.Q.setValueAtTime(this.#getMidQ(), when);
    }

    /**
     * stop the effect
     */
    stop() {
        super.stop();
        this.#lowBand.disconnect();
        this.#midBand.disconnect();
        this.#highBand.disconnect();
    }   

    /**
     * get the name of the effect
     * @returns {string}
     */
    get name() {
        return "eqthree";
    }

    /**
     * get the tweaks for the effect
     * @returns {Array<string
     */
    static getTweaks() {
        return super.getTweaks().concat(["lowGain", "midGain", "highGain", "lowFreq", "highFreq"]);
    }

}
