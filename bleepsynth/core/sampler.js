import { MonitoredAudioBufferSourceNode, MonitoredBiquadFilterNode, MonitoredGainNode, MonitoredStereoPannerNode } from "./monitored_components";

export default class Sampler {

    static DEFAULT_RATE = 1;
    static DEFAULT_LOOP = false;
    static DEFAULT_LEVEL = 1;
    static DEFAULT_CUTOFF = 18000;
    static DEFAULT_PAN = 0;

    #source = null;
    #volume = null;
    #monitor = null;
    #lowpass = null;
    #pan = null;
    #context = null;

    /**
     * @param {AudioContext} context
     * @param {AudioBuffer} buffer
     * @param {object} opts
     */
    constructor(context, monitor, buffer, opts) {
        this.#context = context;
        this.#monitor = monitor;
        // source
        this.#source = new MonitoredAudioBufferSourceNode(context, monitor, {
            buffer: buffer,
            playbackRate: opts.rate !== undefined ? opts.rate : Sampler.DEFAULT_RATE,
            loop: opts.loop !== undefined ? opts.loop : Sampler.DEFAULT_LOOP
        });
        // lowpass
        this.#lowpass = new MonitoredBiquadFilterNode(context, monitor, {
            type: "lowpass",
            frequency: opts.cutoff !== undefined ? opts.cutoff : Sampler.DEFAULT_CUTOFF
        });
        // pan
        this.#pan = new MonitoredStereoPannerNode(context, monitor, {
            pan: opts.pan !== undefined ? opts.pan : Sampler.DEFAULT_PAN
        });
        // volume
        this.#volume = new MonitoredGainNode(context, monitor, {
            gain: opts.level !== undefined ? opts.level : Sampler.DEFAULT_LEVEL
        });
        // connect up
        this.#source.connect(this.#lowpass);
        this.#lowpass.connect(this.#pan);
        this.#pan.connect(this.#volume);
        // set up garbage collection
        this.#source.onended = () => {
            this.stop();
        }
    }

    /**
     * clean up and remove from monitor
     */
    stop() {
        console.log("releasing sample");
        this.#volume.disconnect();
        this.#pan.disconnect();
        this.#lowpass.disconnect();
        this.#source.disconnect();
    }

    /**
     * @returns {GainNode}
     */
    get out() {
        return this.#volume;
    }

    /**
     * @param {number} time
     */
    play(when = this.#context.currentTime) {
        console.log("playing sample");
        this.#source.start(when);
    }

}