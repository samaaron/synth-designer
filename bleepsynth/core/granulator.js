import { MonitoredAudioBufferSourceNode, MonitoredBiquadFilterNode, MonitoredGainNode, MonitoredStereoPannerNode } from "./monitored_components.js";
import Utility from "./utility.js";

export default class Granulator {

    static MIN_RAMP_SEC = 0.005; // shortest grain onset/offset ramp in sec
    static MAX_GRAIN_AMP = 1.0; // maximum amplitude of a grain
    static STOP_DELAY_SEC = 0.2; // extra time lag before we stop the grain player in sec

    static PARAM_RANGES = {
        level: { min: 0, max: 1, default: 0.8 },            // overall volume
        attack: { min: 0, max: 5, default: 0.01 },          // attack in seconds
        cutoff: { min: 20, max: 20000, default: 20000 },    // filter cutoff in Hz
        density: { min: 1, max: 20, default: 10 },          // grain density in grains per second
        detune: { min: -2400, max: 2400, default: 0 },      // sample detune in cents
        detune_var: { min: 0, max: 2400, default: 0 },      // pitch variance in cents
        duration: { min: 0.02, max: 100, default: 1 },      // duration in seconds
        index: { min: 0, max: 1, default: 0.5 },            // buffer index
        index_var: { min: 0, max: 1, default: 0.01 },       // time variance
        pan: { min: -1, max: 1, default: 0 },               // pan
        pan_var: { min: 0, max: 1, default: 0 },            // pan variance
        rate: { min: 0.1, max: 10, default: 1 },            // sample rate multiplier
        release: { min: 0, max: 5, default: 2 },            // release in seconds
        resonance: { min: 0, max: 25, default: 0 },         // filter resonance
        shape: { min: 0, max: 1, default: 0.5 },            // grain shape
        size: { min: 0.1, max: 1, default: 0.2 },           // grain size in sec
        time_var: { min: 0, max: 0.1, default: 0.05 },      // time variance of grain start (jitter)
    };

    #volume = null;
    #monitor = null;
    #lowpass = null;
    #pan = null;
    #context = null;
    #buffer = null;
    #opts = null;

    /**
     * @param {AudioContext} context
     * @param {AudioBuffer} buffer
     * @param {object} opts
     */
    constructor(context, monitor, buffer, opts) {
        this.#context = context;
        this.#monitor = monitor;
        this.#buffer = buffer;
        this.#opts = {...this.#getDefaultOpts(), ...opts};
        // console.log(this.#opts);
        // lowpass
        this.#lowpass = new MonitoredBiquadFilterNode(context, monitor, {
            type: "lowpass",
            frequency: this.#opts.cutoff
        });
        // pan
        this.#pan = new MonitoredStereoPannerNode(context, monitor, {
            pan: this.#opts.pan
        });
        // volume
        this.#volume = new MonitoredGainNode(context, monitor);
        // connect up
        this.#lowpass.connect(this.#pan);
        this.#pan.connect(this.#volume);
    }

    #getDefaultOpts() {
        let defaultOpts={};
        for (const param in Granulator.PARAM_RANGES) {
            defaultOpts[param] = Granulator.PARAM_RANGES[param].default;
        }
        return defaultOpts;
    }

    /**
     * clean up and remove from monitor
     */
    stop() {
        // console.log("releasing granulator");
        this.#volume.disconnect();
        this.#pan.disconnect();
        this.#lowpass.disconnect();
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
        // number of grains, rounding up so we have at least one
        const numberOfGrains = Math.ceil(this.#opts.density * this.#opts.duration);
        // work out the step size, which is how far we step in seconds for each grain
        const stepSize = (this.#opts.duration + this.#opts.release) / numberOfGrains;
        // work out far we step through the buffer on each iteration
        const bufferLength = this.#buffer.duration - this.#opts.size;
        const delta = this.#opts.index_var * this.#buffer.duration;
        // where we start reading grains from in the buffer
        let grainStartSec = this.#opts.index * bufferLength;
        this.#applyOverallEnvelope(when);
        // main loop
        for (let i = 0; i < numberOfGrains; i++) {
            const timeOffset = Math.max(0, i * stepSize + Utility.randomBetween(-this.#opts.time_var, this.#opts.time_var));
            const grainPlayTime = when + timeOffset;
            grainStartSec += Utility.clamp(Utility.randomBetween(-delta, delta), 0, bufferLength);
            this.#playGrain(grainPlayTime, grainStartSec);
        }
        // schedule cleanup after last grain has played (plus extra delay for good luck)
        let stopTime = when - this.#context.currentTime + this.#opts.duration + this.#opts.release + this.#opts.size + Granulator.STOP_DELAY_SEC;
        setTimeout(() => {
            this.stop();
        }, stopTime * 1000);
    }

    #applyOverallEnvelope(tim) {
        this.#volume.gain.setValueAtTime(0, tim);
        this.#volume.gain.linearRampToValueAtTime(this.#opts.level, tim + this.#opts.attack);
        this.#volume.gain.setValueAtTime(this.#opts.level, tim + this.#opts.duration);
        this.#volume.gain.linearRampToValueAtTime(0, tim + this.#opts.duration + this.#opts.release);
    }

    #playGrain(grainPlayTime, grainStartSec) {
        // make the source node, with random detune
        const randomDetune = this.#opts.detune + Utility.randomBetween(-this.#opts.detune_var, this.#opts.detune_var);
        let source = new MonitoredAudioBufferSourceNode(this.#context, this.#monitor, {
            playbackRate: this.#opts.rate,
            detune: randomDetune,
            buffer: this.#buffer
        });
        // make the pan node, with random pan
        const randomPan = Utility.clamp(this.#opts.pan + Utility.randomBetween(-this.#opts.pan_var, this.#opts.pan_var), -1, 1);
        const pan = new MonitoredStereoPannerNode(this.#context, this.#monitor, {
            pan: randomPan
        });
        // make the gain node
        const gain = new MonitoredGainNode(this.#context, this.#monitor);
        // wire it all up
        source.connect(gain);
        gain.connect(pan);
        pan.connect(this.#lowpass);
        // apply the envelope shape
        this.#applyGrainEnvelope(gain, grainPlayTime, this.#opts.size, this.#opts.shape);
        // tidy up when done
        source.onended = () => {
            source.disconnect();
            gain.disconnect();
            pan.disconnect();
        };
        // play this grain
        source.start(grainPlayTime, grainStartSec, this.#opts.size);
    }

    #applyGrainEnvelope(gain, tim, grainLength, shape) {
        const peakTime = Granulator.MIN_RAMP_SEC + (grainLength - 2 * Granulator.MIN_RAMP_SEC) * shape;
        gain.gain.setValueAtTime(0, tim);
        gain.gain.linearRampToValueAtTime(Granulator.MAX_GRAIN_AMP, tim + peakTime);
        gain.gain.linearRampToValueAtTime(0, tim + grainLength);
    }

}