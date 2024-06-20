import BleepEffect from "./effect.js";
import Utility from "../core/utility.js";
import { MonitoredBiquadFilterNode, MonitoredOscillatorNode, MonitoredGainNode,
    MonitoredStereoPannerNode, MonitoredDelayNode } from "../core/monitored_components.js";

export default class Leslie extends BleepEffect {

    static CHORALE_ROTATION_SPEED = 0.66;
    static TREMOLO_ROTATION_SPEED = 5.66;
    static DEFAULT_MOD_DEPTH = 0.0003;
    static DEFAULT_WET_LEVEL = 1;
    static DEFAULT_DRY_LEVEL = 0;
    static FILTER_CUTOFF = 800;
    static DELAY_TIME = 0.01;
    static SPEED_FACTOR = 1.17;  // treble rotor is faster than bass rotor
    static LOW_MOD_GAIN = 3;
    static HIGH_MOD_GAIN = 6;
    static GAIN_ADJUST = 0.75;

    #lowpass
    #highpass
    #lowlfo
    #highlfo
    #inverter
    #lowmod
    #highmod
    #lowlag
    #highlag
    #lowpan
    #highpan
    #lowgain
    #highgain

    constructor(context, monitor) {
        super(context, monitor);
        // filters
        this.#lowpass = new MonitoredBiquadFilterNode(context, monitor, {
            type: "lowpass",
            frequency: Leslie.FILTER_CUTOFF
        });
        this.#highpass = new MonitoredBiquadFilterNode(context, monitor, {
            type: "highpass",
            frequency: Leslie.FILTER_CUTOFF
        });
        this.#lowlfo = new MonitoredOscillatorNode(context, monitor, {
            type: "sine"
        });
        this.#lowlfo.start();
        this.#highlfo = new MonitoredOscillatorNode(context, monitor, {
            type: "sine"
        });
        this.#highlfo.start();
        this.#inverter = new MonitoredGainNode(context, monitor, {
            gain: -1
        });
        this.#lowgain = new MonitoredGainNode(context, monitor, {
            gain: Leslie.LOW_MOD_GAIN
        });
        this.#highgain = new MonitoredGainNode(context, monitor, {
            gain: Leslie.HIGH_MOD_GAIN
        });
        this.#lowmod = new MonitoredGainNode(context, monitor, {
            gain: Leslie.DEFAULT_MOD_DEPTH
        });
        this.#highmod = new MonitoredGainNode(context, monitor, {
            gain: Leslie.DEFAULT_MOD_DEPTH
        });
        this.#lowlag = new MonitoredDelayNode(context, monitor, {
            delayTime: Leslie.DELAY_TIME
        });
        this.#highlag = new MonitoredDelayNode(context, monitor, {
            delayTime: Leslie.DELAY_TIME
        });
        this.#lowpan = new MonitoredStereoPannerNode(context, monitor, {
            pan: 0
        });
        this.#highpan = new MonitoredStereoPannerNode(context, monitor, {
            pan: 0
        });

        this._wetGain.connect(this.#lowpass);
        this._wetGain.connect(this.#highpass);

        // low channel

        this.#lowpass.connect(this.#lowlag);
        this.#lowlag.connect(this.#lowpan);
        this.#lowpan.connect(this._out);

        this.#lowlfo.connect(this.#lowpan.pan);
        this.#lowlfo.connect(this.#lowmod);
        this.#lowmod.connect(this.#lowlag.delayTime);

        this.#lowlfo.connect(this.#lowgain);
        this.#lowgain.connect(this.#lowpass.gain);

        // high channel

        this.#highpass.connect(this.#inverter);
        this.#inverter.connect(this.#highlag);
        this.#highlag.connect(this.#highpan);
        this.#highpan.connect(this._out);

        this.#highlfo.connect(this.#highpan.pan);
        this.#highlfo.connect(this.#highmod);
        this.#highmod.connect(this.#highlag.delayTime);

        this.#highlfo.connect(this.#highgain);
        this.#highgain.connect(this.#highpass.gain);

        // gain adjustment

        this._out.gain.value = Leslie.GAIN_ADJUST;

        // defaults

        this.setSpeed(Leslie.TREMOLO_ROTATION_SPEED);
        this.setWetLevel(Leslie.DEFAULT_WET_LEVEL);
        this.setDryLevel(Leslie.DEFAULT_DRY_LEVEL);
    }

    setSpeed(s, when = this._context.currentTime) {
        this.#lowlfo.frequency.setValueAtTime(s,when);
        this.#highlfo.frequency.setValueAtTime(s*Leslie.SPEED_FACTOR,when);
    }

    setParams(params, when = this._context.currentTime) {
        super.setParams(params, when);
        if (params.speed !== undefined) {
            this.setSpeed(params.speed, when);
        }
    }

    stop() {
        super.stop();
        this.#lowlfo.stop();
        this.#highlfo.stop();
        this.#lowlfo.disconnect();
        this.#highlfo.disconnect();
        this.#lowpass.disconnect();
        this.#highpass.disconnect();
        this.#lowlag.disconnect();
        this.#highlag.disconnect();
        this.#lowpan.disconnect();
        this.#highpan.disconnect();
        this.#lowgain.disconnect();
        this.#highgain.disconnect();
        this.#lowmod.disconnect();
        this.#highmod.disconnect();
        this.#inverter.disconnect();
    }

    static getTweaks() {
        return super.getTweaks().concat(["speed"]);
    }

}
