import BleepEffect from "./effect.js"
import { MonitoredGainNode, MonitoredStereoPannerNode } from "../core/monitored_components.js"
import Utility from "../core/utility.js"

export default class GainPan extends BleepEffect {

    #pan
    #gain

    /**
     * Make an autopanning effect
     * @param {AudioContext} context - the audio context
     * @param {Monitor} monitor - the monitor to track this object
     */
    constructor(context, monitor) {
        super(context, monitor);
        this.#pan = new MonitoredStereoPannerNode(context, monitor, {
            pan: 0
        });
        this.#gain = new MonitoredGainNode(context, monitor, {
            gain: 1
        });
        // connect up
        this._wetGain.connect(this.#gain);
        this.#gain.connect(this.#pan);
        this.#pan.connect(this._out);
        // fully wet
        this.setWetLevel(1);
        this.setDryLevel(0);
    }

    /**
     * Set the level
     * @param {number} level - level in range [0,1]
     * @param {number} when - the time at which the change should occur
     */
    setLevel(level, when = this._context.currentTime) {
        level = Utility.clamp(level, 0, 2);
        this.#gain.gain.setValueAtTime(level, when);
    }

    /**
     * set the pan
     * @param {number} pan - pan in range [-1,1]
     * @param {*} when - the time at which the change should occur
     */
    setPan(pan, when = this._context.currentTime) {
        pan = Utility.clamp(pan, -1, 1);
        this.#pan.pan.setValueAtTime(pan, when);
    }

    /**
     * Set the parameters of this effect
     * @param {object} params - key value list of parameters
     * @param {number} when - the time at which the change should occur
     */
    setParams(params, when = this._context.currentTime) {
        super.setParams(params, when);
        if (params.level !== undefined) {
            this.setLevel(params.level, when);
        }
        if (params.pan !== undefined) {
            this.setPan(params.pan, when);
        }
    }

    /**
     * Stop the effect and tidy up
     */
    stop() {
        super.stop();
        this.#pan.disconnect();
        this.#gain.disconnect();
    }

    static getTweaks() {
        return super.getTweaks().concat(["pan", "level"]);
    }

}