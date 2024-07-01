import Monitor from "../core/monitor.js"
import { MonitoredConvolverNode } from "../core/monitored_components.js"
import BleepEffect from "./effect.js"
import BufferCache from "../core/buffer_cache.js"

export default class Reverb extends BleepEffect {

    #convolver
    #cache

    /**
     * make a reverb effect
     * @param {AudioContext} context
     * @param {Monitor} monitor
     * @param {BufferCache} cache
     */
    constructor(context, monitor, cache) {
        super(context, monitor);
        this.#cache = cache;
        this.#convolver = new MonitoredConvolverNode(context, monitor);
        // connect everything up
        this._wetGain.connect(this.#convolver);
        this.#convolver.connect(this._out);
        // default settings
        this.setWetLevel(0.2);
        this.setDryLevel(1);
    }

    /**
     * load an impulse response
     * @param {string} filename
     */
    async load(url) {
        const buffer = await this.#cache.loadBuffer(url, this._context);
        this.#convolver.buffer = buffer;
    }

    /**
     * stop the reverb unit
     */
    stop() {
        super.stop();
        this.#convolver.disconnect();
    }

    /**
     * time taken to fade out is equal to the duration of the impulse response
     * @returns {number}
     */
    timeToFadeOut() {
        return this._convolver.buffer.duration;
    }

}