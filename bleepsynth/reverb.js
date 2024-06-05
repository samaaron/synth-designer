import Monitor from "./monitor.js"
import { MonitoredConvolverNode } from "./monitored_components.js"
import BleepEffect from "./effect.js"
import SampleCache from "./samplecache.js"

export default class Reverb extends BleepEffect {

    static IMPULSE_PATH = "./bleepsynth/impulses/";

    #convolver
    #cache

    /**
     * make a reverb effect
     * @param {AudioContext} context 
     * @param {Monitor} monitor 
     * @param {SampleCache} cache 
     */
    constructor(context, monitor, cache) {
        super(context, monitor);
        this.#cache = cache;
        this.#convolver = new MonitoredConvolverNode(context, monitor);
        // connect everything up
        this._wetGain.connect(this.#convolver);
        this.#convolver.connect(this._out);
    }

    /**
     * load an impulse response
     * @param {string} filename 
     */
    async load(filename) {
        const impulseName = `${Reverb.IMPULSE_PATH}${filename}`;
        const buffer = await this.#cache.getSample(this._context, impulseName);
        this.#convolver.buffer = buffer;
    }

    /**
     * stop the reverb unit
     */
    stop() {
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