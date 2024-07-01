import Monitor from "../core/monitor.js"
import { MonitoredConvolverNode } from "../core/monitored_components.js"
import BleepEffect from "./effect.js"
import BufferCache from "../core/buffer_cache.js"

export default class Reverb extends BleepEffect {

    #convolver
    #cache
    #impulseUrl

    /**
     * make a reverb effect
     * @param {AudioContext} context
     * @param {Monitor} monitor
     * @param {BufferCache} cache
     */
    constructor(context, monitor, cache, impulseUrl) {
        super(context, monitor);
        this.#cache = cache;
        this.#impulseUrl = impulseUrl;
        this.#convolver = new MonitoredConvolverNode(context, monitor);
        // connect everything up
        this._wetGain.connect(this.#convolver);
        this.#convolver.connect(this._out);
        // default settings
        this.setWetLevel(0.2);
        this.setDryLevel(1);
        this.loadImpulse();
    }

    /**
     * load an impulse response
     */
    async loadImpulse() {
        if (this.#convolver.buffer) {
          console.log("no need to load impulse for convolver")
          return true;
        }
        const buffer = await this.#cache.loadBuffer(this.#impulseUrl, this._context);
        this.#convolver.buffer = buffer;
        return true;
    }

    async load() {
      super.load();
      this.loadImpulse();
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