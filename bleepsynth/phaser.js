import { MonitoredBiquadFilterNode, MonitoredGainNode, MonitoredOscillatorNode, MonitoredStereoPannerNode } from "./monitored_components.js";
import BleepEffect from "./effect.js";
import Monitor from "./monitor.js";

/**
 * Prototype structure for phaser, abstract class
 */

class PhaserPrototype extends BleepEffect {

    _leftChannel
    _rightChannel
    _leftPan
    _rightPan
    _phase

    /**
     * Make a phaser prototype 
     * @param {AudioContext} context - the audio context
     * @param {Monitor} monitor - the monitor object to track this effect
     * @param {object} config - configuration parameters
     */
    constructor(context, monitor, config) {
        super(context, monitor);
        this._phase = config.phase;
        this._leftPan = new MonitoredStereoPannerNode(context, monitor, {
            pan: -config.spread
        });
        this._rightPan = new MonitoredStereoPannerNode(context, monitor, {
            pan: config.spread
        });
        // left channel
        this._leftChannel = new PhaserChannel(context, monitor, {
            rate: config.rate * (1 - config.phase),
            depth: config.depth,
            feedback: config.feedback,
            lfoType: config.lfoType,
            highCutoff: config.highCutoff,
            freqList: config.leftFreq,
            qList: config.leftQ
        });
        this._wetGain.connect(this._leftChannel.in);
        this._leftChannel.out.connect(this._leftPan);
        this._leftPan.connect(this._out);
        // right channel
        this._rightChannel = new PhaserChannel(context, monitor, {
            rate: config.rate * (1 + config.phase),
            depth: config.depth,
            feedback: config.feedback,
            lfoType: config.lfoType,
            highCutoff: config.highCutoff,
            freqList: config.rightFreq,
            qList: config.rightQ
        });
        this._wetGain.connect(this._rightChannel.in);
        this._rightChannel.out.connect(this._rightPan);
        this._rightPan.connect(this._out);
        // defaults
        this.setWetLevel(1);
        this.setDryLevel(0);
    }

    /**
     * set ths parameters for the effect
     * @param {object} params - key value list of parameters
     * @param {number} when - the time at which the change should occur
     */
    setParams(params, when = this._context.currentTime) {
        super.setParams(params, when);
        if (params.spread !== undefined) {
            this.setSpread(params.spread, when);
        }
        if (params.feedback !== undefined) {
            this.setFeedback(params.feedback, when);
        }
        if (params.depth !== undefined) {
            this.setDepth(params.depth, when);
        }
        if (params.rate !== undefined) {
            this.setRate(params.rate, when);
        }
        if (params.resonance !== undefined) {
            this.setResonance(params.resonance, when);
        }
    }

    /**
     * Set the stereo spread 
     * @param {number} s - stereo spread in the range [0,1]
     * @param {number} when - the time at which the change should occur
     */
    setSpread(s, when = this._context.currentTime) {
        this._leftPan.pan.setValueAtTime(-s, when);
        this._rightPan.pan.setValueAtTime(s, when);
    }

    /**
     * Set the feedback in the phaser network
     * @param {number} k - the feedback in the range [0,1]
     * @param {number} when - the time at which the change should occur
     */
    setFeedback(k, when = this._context.currentTime) {
        this._leftChannel.setFeedback(k, when);
        this._rightChannel.setFeedback(k, when);
    }

    /**
     * Set the depth of the phaser effect
     * @param {number} d - depth in the range [0,1]
     * @param {number} when - the time at which the change should occur 
     */
    setDepth(d, when = this._context.currentTime) {
        this._leftChannel.setDepth(d, when);
        this._rightChannel.setDepth(d, when);
    }

    /**
     * Set the rate of the phaser
     * @param {number} r - the rate of the phaser in Hz
     * @param {number} when - the time at which the change should occur 
     */
    setRate(r, when = this._context.currentTime) {
        this._leftChannel.setRate(r * (1 - this._phase), when);
        this._rightChannel.setRate(r * (1 + this._phase), when);
    }

    /**
     * Set the resonance, numbers close to 1 give a stronger effect
     * @param {number} q - the resonance of the allpass filters in the range [0,1]
     * @param {number} when - the time at which the change should occur 
     */
    setResonance(q, when = this._context.currentTime) {
        this._leftChannel.setResonance(q, when);
        this._rightChannel.setResonance(q, when);
    }

    /**
     * Calculates the time it takes for the chorus effect to fade out.
     * @returns {number} The estimated fade out time.
     */
    timeToFadeOut() {
        // delay line is very short for a phaser, this will cover it
        return 0.05;
    }

    /**
     * Stops the phaser effect and cleans up resources.
     */
    stop() {
        super.stop();
        this._leftChannel.stop();
        this._rightChannel.stop();
        this._leftPan.disconnect();
        this._rightPan.disconnect();
    }

    static getTweaks() {
        return super.getTweaks().concat(["spread", "feedback", "depth", "rate", "resonance"]);
    }

}

/**
 * A phaser network for a single audio channel
 */
class PhaserChannel {

    #context
    #monitor
    #freqList
    #qList
    #numStages
    #lfo
    #feedback
    #notch
    #lfogain
    #wetGain
    #dryGain
    #in
    #out
    #highpass

    /**
     * Make a phaser channel
     * @param {AudioContext} context - the audio context
     * @param {object} config - configuration parameters
     */
    constructor(context, monitor, config) {
        this.#context = context;
        this.#monitor = monitor;
        this.#freqList = config.freqList;
        this.#qList = config.qList;
        this.#numStages = this.#freqList.length;
        // highpass
        this.#highpass = new MonitoredBiquadFilterNode(context, monitor, {
            type: "highpass",
            frequency: config.highCutoff,
            Q: 1
        });
        // lfo
        this.#lfo = new MonitoredOscillatorNode(context, monitor, {
            type: config.lfoType,
            frequency: config.rate
        });
        // feedback
        this.#feedback = new MonitoredGainNode(context, monitor, {
            gain: config.feedback
        });
        // wet and dry paths
        this.#wetGain = new MonitoredGainNode(context, monitor, {
            gain: 0.5
        });
        this.#dryGain = new MonitoredGainNode(context, monitor, {
            gain: 0.5
        });
        this.#in = new MonitoredGainNode(context, monitor, {
            gain: 1
        });
        this.#out = new MonitoredGainNode(context, monitor, {
            gain: 1
        });
        // filters and gains
        this.#notch = [];
        this.#lfogain = [];
        for (let i = 0; i < this.#numStages; i++) {
            const n = new MonitoredBiquadFilterNode(context, monitor, {
                frequency: this.#freqList[i],
                Q: this.#qList[i],
                type: "allpass"
            });
            this.#notch.push(n);
            // lfo gains
            const g = new MonitoredGainNode(context, monitor, {
                gain: this.#freqList[i] * config.depth
            });
            this.#lfogain.push(g);
        }
        // connect allpass filters
        for (let i = 0; i < this.#numStages - 1; i++) {
            this.#notch[i].connect(this.#notch[i + 1]);
        }
        // connect LFOs
        for (let i = 0; i < this.#numStages; i++) {
            this.#lfo.connect(this.#lfogain[i]);
            this.#lfogain[i].connect(this.#notch[i].frequency);
        }
        // feedback loop
        this.#notch[this.#numStages - 1].connect(this.#feedback);
        this.#feedback.connect(this.#highpass);
        // dry path
        this.#in.connect(this.#dryGain);
        this.#dryGain.connect(this.#out);
        // wet path
        this.#in.connect(this.#highpass);
        this.#highpass.connect(this.#notch[0]);
        this.#notch[this.#numStages - 1].connect(this.#wetGain);
        this.#wetGain.connect(this.#out);
        // start
        this.#lfo.start();
    }

    /**
     * Set the rate of the phaser
     * @param {number} r - the rate of the phaser in Hz
     * @param {number} when - the time at which the change should occur 
     */
    setRate(r, when = this.#context.currentTime) {
        this.#lfo.frequency.setValueAtTime(r, when);
    }

    /**
     * Set the resonance, numbers close to 1 give a stronger effect
     * @param {number} q - the resonance of the allpass filters in the range [0,1]
     * @param {number} when - the time at which the change should occur 
     */
    setResonance(q, when = this.#context.currentTime) {
        for (let i = 0; i < this.#numStages; i++) {
            this.#notch[i].Q.setValueAtTime(q, when);
        }
    }

    /**
     * Set the depth of the phaser effect
     * @param {number} d - depth in the range [0,1]
     * @param {number} when - the time at which the change should occur 
     */
    setDepth(d, when = this.#context.currentTime) {
        for (let i = 0; i < this.#numStages; i++) {
            this.#lfogain[i].gain.setValueAtTime(this.#freqList[i] * d, when);
        }
    }

    /**
     * Set the feedback in the phaser network
     * @param {number} k - the feedback in the range [0,1]
     * @param {number} when - the time at which the change should occur
     */
    setFeedback(k, when = this.#context.currentTime) {
        this.#feedback.gain.setValueAtTime(k, when);
    }

    /**
     * Stops the phaser effect and cleans up resources.
     */
    stop() {
        this.#lfo.stop();
        for (let i = 0; i < this.#numStages; i++) {
            this.#notch[i].disconnect();
            this.#lfogain[i].disconnect();
        }
        this.#lfo.disconnect();
        this.#feedback.disconnect();
        this.#wetGain.disconnect();
        this.#dryGain.disconnect();
        this.#in.disconnect();
        this.#out.disconnect();
        this.#highpass.disconnect();
    }

    /**
     * Get the input node
     */
    get in() {
        return this.#in;
    }

    /**
     * Get the output node
     */
    get out() {
        return this.#out;
    }

}

/**
 * Nice deep phasing effect based on 6 stages with a fair amount of feedback
 */
export class DeepPhaser extends PhaserPrototype {
    constructor(context, monitor) {
        super(context, monitor, {
            phase: 0.02,
            depth: 0.8,
            rate: 0.3,
            spread: 0.99,
            feedback: 0.4,
            highCutoff: 120,
            lfoType: "triangle",
            leftFreq: [625, 600, 1200, 1250, 3200, 3210],
            rightFreq: [615, 620, 1210, 1220, 3215, 3205],
            leftQ: [0.4, 0.4, 0.5, 0.5, 0.6, 0.6],
            rightQ: [0.4, 0.4, 0.5, 0.5, 0.6, 0.6]
        });
    }
}

/**
 * A thick phasing sound based on two stages plus feedback
 */
export class ThickPhaser extends PhaserPrototype {
    constructor(context, monitor) {
        super(context, monitor, {
            phase: 0.05,
            depth: 0.8,
            rate: 0.3,
            spread: 0.99,
            feedback: 0.4,
            highCutoff: 220,
            lfoType: "triangle",
            leftFreq: [625, 3200],
            rightFreq: [615, 3200],
            leftQ: [0.43, 0.75],
            rightQ: [0.45, 0.74]
        });
    }
}

/**
 * A resonable approximation of the Electroharmonix Small Stone phaser
 * Parameters suggested by the "kleinstein" patch in Reaktor
 */
export class PicoPebble extends PhaserPrototype {
    constructor(context, monitor) {
        super(context, monitor, {
            phase: 0.01,
            depth: 0.93,
            rate: 0.2,
            spread: 0.99,
            feedback: 0.2,
            highCutoff: 264,
            lfoType: "triangle",
            leftFreq: [3215],
            rightFreq: [3225],
            leftQ: [0.75],
            rightQ: [0.75]
        });
    }
}

