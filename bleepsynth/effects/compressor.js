import { MonitoredDynamicsCompressorNode } from "../core/monitored_components.js";
import BleepEffect from "./effect.js";
import Utility from "../core/utility.js";

export default class Compressor extends BleepEffect {

    static DEFAULT_THRESHOLD = -9.7;    // dB
    static DEFAULT_KNEE = 6;            // dB
    static DEFAULT_RATIO = 1.15;        // dB
    static DEFAULT_ATTACK = 0.22/1000;  // 0.22 ms
    static DEFAULT_RELEASE = 100/1000;  // 100 ms

    #compressor

    constructor(context, monitor) {
        super(context, monitor);
        this.#compressor = new MonitoredDynamicsCompressorNode(context, monitor, {
            threshold: Compressor.DEFAULT_THRESHOLD,
            knee: Compressor.DEFAULT_KNEE,
            ratio: Compressor.DEFAULT_RATIO,
            attack: Compressor.DEFAULT_ATTACK,
            release: Compressor.DEFAULT_RELEASE
        });
        this._wetGain.connect(this.#compressor);
        this.#compressor.connect(this._out);
        // we want this fully wet by default
        this.setWetLevel(1);
        this.setDryLevel(0);
    }

   /**
    * Decibel value above which compression starts
    * @param {*} t
    * @param {*} when
    */
    setThreshold(t, when = this._context.currentTime) {
        t = Utility.clamp(t, -100, 0);
        this.#compressor.threshold.setValueAtTime(t, when);
    }

    /**
     * Sets the sound level in dB at which the compressive curve kicks in
     * @param {*} k
     * @param {*} when
     */
    setKnee(k, when = this._context.currentTime) {
        k = Utility.clamp(k, 0, 40);
        this.#compressor.knee.setValueAtTime(k, when);
    }

    /**
     * The amound of change in dB needed in the input for a 1 dB change in the output
     * @param {*} r
     * @param {*} when
     */
    setRatio(r, when = this._context.currentTime) {
        r = Utility.clamp(r, 1, 20);
        this.#compressor.ratio.setValueAtTime(r, when);
    }

    /**
     * Sets amount of time to reduce the gain by 10dB (in seconds)
     * @param {*} a
     * @param {*} when
     */
    setAttack(a, when = this._context.currentTime) {
        a = Utility.clamp(a, 0, 1);
        this.#compressor.attack.setValueAtTime(a, when);
    }

    /**
     * Sets time required to adapt rate back up by 10 dB (in seconds)
     * @param {*} r
     * @param {*} when
     */
    setRelease(r, when = this._context.currentTime) {
        r = Utility.clamp(r, 0, 1);
        this.#compressor.release.setValueAtTime(r, when);
    }

    /**
     * Set the parameters of this effect
     * @param {object} params - key value list of parameters
     * @param {number} when - the time at which the change should occur
     */
    setParams(params, when = this._context.currentTime) {
        super.setParams(params, when);
        if (params.threshold !== undefined) {
            this.setThreshold(params.threshold, when);
        }
        if (params.knee !== undefined) {
            this.setKnee(params.knee, when);
        }
        if (params.ratio !== undefined) {
            this.setRatio(params.ratio, when);
        }
        if (params.attack !== undefined) {
            this.setAttack(params.attack, when);
        }
        if (params.release !== undefined) {
            this.setRelease(params.release, when);
        }
    }

    /**
     * Stop the effect and tidy up
     */
    stop() {
        super.stop();
        this.#compressor.disconnect();
    }

    static getTweaks() {
        return super.getTweaks().concat(["threshold", "knee", "ratio", "attack", "release"]);
    }

}