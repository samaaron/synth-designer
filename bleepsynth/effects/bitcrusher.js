import BleepEffect from "./effect.js";
import { MonitoredWaveShaperNode } from "../core/monitored_components.js";
import Monitor from "../core/monitor.js";

export default class Bitcrusher extends BleepEffect {

    static DEFAULT_BITS = 2.5;
    static DEFAULT_WET_LEVEL = 1;
    static DEFAULT_DRY_LEVEL = 0;

    #crusher

    /**
     * make a bitcrusher effect
     * @param {AudioContext} context 
     * @param {Monitor} monitor 
     */
    constructor(context, monitor) {
        super(context, monitor);
        this.#crusher = new MonitoredWaveShaperNode(context, monitor, {
            curve: this.#createBitCrusherCurve(Bitcrusher.DEFAULT_BITS)
        });
        // connect
        this._wetGain.connect(this.#crusher);
        this.#crusher.connect(this._out);
        // set defaults
        this.setWetLevel(Bitcrusher.DEFAULT_WET_LEVEL);
        this.setDryLevel(Bitcrusher.DEFAULT_DRY_LEVEL);
    }

    /**
     * create a quantisation curve for bitcrusher
     * @param {number} bits - the number of bits to use
     */
    #createBitCrusherCurve(bits) {
        const numSamples = 2048;
        const curve = new Float32Array(numSamples);
        const step = 2 / (numSamples-1);
        const n = 2 ** bits; 
        for (let i = 0; i < numSamples; i++) {
            let x = i * step - 1;
            curve[i] = Math.round(x * n) / n;
        }
        return curve;
    }

    /**
     * stop the effect
     */
    stop() {
        super.stop();
        this.#crusher.disconnect();
    }
    
}

