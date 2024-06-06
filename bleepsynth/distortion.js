import BleepEffect from "./effect.js";
import { MonitoredBiquadFilterNode, MonitoredGainNode, MonitoredWaveShaperNode } from "./monitored_components";
import Utility from "./utility.js";

class DistortionPrototype extends BleepEffect {

    static DEFAULT_PRE_GAIN = 1
    static DEFAULT_POST_GAIN = 1
    static DEFAULT_FREQUENCY = 1500
    static DEFAULT_BANDWIDTH = 100

    _distort
    _pregain
    _postgain
    _bandpass

    constructor(context, monitor, steepness) {
        super(context, monitor);
        this._distort = new MonitoredWaveShaperNode(context, monitor, {
            oversample: "4x",
            curve: distortionCurve(steepness)
        });
        this._pregain = new MonitoredGainNode(context, monitor, {
            gain: Distortion.DEFAULT_PRE_GAIN
        });
        this._postgain = new MonitoredGainNode(context, monitor, {
            gain: Distortion.DEFAULT_POST_GAIN
        });
        this._bandpass = new MonitoredBiquadFilterNode(context, monitor, {
            type: "bandpass",
            frequency: Distortion.DEFAULT_FREQUENCY
        })
        this._wetGain.connect(this._pregain);
        this._pregain.connect(this._bandpass);
        this._bandpass.connect(this._distort)
        this._distort.connect(this._postgain);
        this._postgain.connect(this._out);
        // we want this fully wet by default
        this.setWetLevel(1);
        this.setDryLevel(0);
        this.setBandwidth(Distortion.DEFAULT_BANDWIDTH, context.currentTime);
    }

    /**
     * Set the parameters
     * @param {*} params - parameter list
     * @param {*} when - the time at which parameter changes should occur
     */
    setParams(params, when = this._context.currentTime) {
        super.setParams(params, when);
        if (typeof params.preGain !== undefined) {
            this.setPreGain(params.preGain, when);
        }
        if (typeof params.postGain !== undefined) {
            this.setPostGain(params.postGain, when);
        }
        if (typeof params.frequency !== undefined) {
            this.setFrequency(params.frequency, when);
        }
        if (typeof params.bandwidth !== undefined) {
            this.setBandwidth(params.bandwidth, when);
        }
    }

    /**
     * The pre-gain control the level going into the distortion curve
     * Higher levels cause more clipping
     * @param {*} g - the gain level
     * @param {*} when - the time at which the change should occur
     */
    setPreGain(g, when = this._context.currentTime) {
        this._pregain.gain.setValueAtTime(g, when);
    }

    /**
 * The post-gain is a level adjustment after the distortion curve
 * Often needed because compression makes the signal louder
 * @param {*} g - the gain level
 * @param {*} when - the time at which the change should occur
 */
    setPostGain(g, when = this._context.currentTime) {
        this._postgain.gain.setValueAtTime(g, when);
    }

    /**
     * The centre frequency of a bandpass filter, which shapes the tone of the distortion
     * @param {*} f - frequency in Hz
     * @param {*} when - the time at which the change should occur
     */
    setFrequency(f, when = this._context.currentTime) {
        this._bandpass.frequency.setValueAtTime(f, when);
    }

    /**
     * The bandwidth (in arbitrary units) of the bandpass filter
     * High values of b give wider bandwidth, in fact b is related to filter Q
     * @param {*} b - bandwidth of the filter in the range 0.1 to 100
     * @param {*} when - the time at which the change should occur
     */
    setBandwidth(b, when = this._context.currentTime) {
        b = Utility.clamp(b, 0.1, 100);
        const q = 1 / b;
        this._bandpass.Q.setValueAtTime(q, when);
    }

    /**
     * Stop this effect and tidy up
     */
    stop() {
        super.stop();
        this._distort.disconnect();
        this._pregain.disconnect();
        this._postgain.disconnect();
        this._bandpass.disconnect();
    }

}

/**
 * Makes a compressive curve
 * this is a sigmoid function which is linear for k=0 and goes through (-1,-1), (0,0) and (1,1)
* https://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion
 * @param {*} k - controls the steepness of the distortion curve
 * @returns a float array containing the compressive curve
 */
function distortionCurve(k) {
    const numSamples = 2048;
    const curve = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
        const x = (i * 2) / numSamples - 1;
        curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

/**
 * Distortion
 */
export class Distortion extends DistortionPrototype {
    constructor(context, monitor) {
        super(context, monitor, 100);
        this.setParams({
            frequency: 1000,
            bandwidth: 75,
            preGain: 0.5,
            postGain: 0.5
        });
    }
}

/**
 * Overdrive
 */
export class Overdrive extends DistortionPrototype {
    constructor(context, monitor) {
        super(context, monitor, 10);
        this.setParams({
            frequency: 1200,
            bandwidth: 400,
            preGain: 0.5,
            postGain: 0.5
        });
    }
}