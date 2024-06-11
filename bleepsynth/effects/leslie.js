import BleepEffect from "./effect.js";
import Waveshaper from "../modules/wave_shaper.js";
import Utility from "../core/utility.js";
import { MonitoredBiquadFilterNode, MonitoredOscillatorNode, MonitoredGainNode, 
    MonitoredStereoPannerNode, MonitoredDelayNode } from "../core/monitored_components";

export default class Leslie extends BleepEffect {

    static DEFAULT_ROTATION_SPEED = 6.6;
    static DEFAULT_MOD_DEPTH = 0.0003;
    static DEFAULT_WET_LEVEL = 1;
    static DEFAULT_DRY_LEVEL = 0;
    static DEFAULT_DRIVE = 0.2;
    static FILTER_CUTOFF = 800;
    static DELAY_TIME = 0.01;

    #shaper
    #lowpass
    #highpass
    #lfo
    #inverter
    #lowmod
    #highmod
    #lowlag
    #highlag
    #lowpan
    #highpan

    constructor(context, monitor) {
        super(context, monitor);
        // overdrive
        this.#shaper = new Waveshaper(context, monitor);
        // filters
        this.#lowpass = new MonitoredBiquadFilterNode(context, monitor, {
            type: "lowpass",
            frequency: Leslie.FILTER_CUTOFF
        });
        this.#highpass = new MonitoredBiquadFilterNode(context, monitor, {
            type: "highpass",
            frequency: Leslie.FILTER_CUTOFF
        });
        this.#lfo = new MonitoredOscillatorNode(context, monitor, {
            type: "sine",
            frequency: Leslie.DEFAULT_ROTATION_SPEED
        });
        this.#lfo.start();
        this.#inverter = new MonitoredGainNode(context, monitor, {
            gain: -1
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

        this._wetGain.connect(this.#shaper.in);
        this.#shaper.out.connect(this.#lowpass);
        this.#shaper.out.connect(this.#highpass);

        this.#lowpass.connect(this.#lowlag);
        this.#lowlag.connect(this.#lowpan);
        this.#lowpan.connect(this._out);

        this.#lfo.connect(this.#lowpan.pan);
        this.#lfo.connect(this.#lowmod);
        this.#lowmod.connect(this.#lowlag.delayTime);

        this.#highpass.connect(this.#highlag);
        this.#highlag.connect(this.#highpan);
        this.#highpan.connect(this._out);

        this.#lfo.connect(this.#inverter);
        this.#lfo.connect(this.#highpan.pan);
        this.#inverter.connect(this.#highmod);
        this.#highmod.connect(this.#highlag.delayTime);

        this.setDrive(Leslie.DEFAULT_DRIVE);
    }

    setDrive(d) {
        this.#shaper.fuzz=Utility.clamp(d, 0, 8);
    }

}
