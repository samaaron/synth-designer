import BleepSynthModule from "./bleep_synth_module";
import { MonitoredBiquadFilterNode, MonitoredGainNode } from "./monitored_components";
import Utility from "./utility";

/**
 * Piecewise linear interpolation for the formant filter
 */
class PiecewiseLinear {

    #delta
    #points

    /**
     * Construct a piecewise linear interpolator
     * @param {Array} points - array of points to interpolate
     */
    constructor(points) {
        this.#points = points;
        this.#delta = 1 / (this.#points.length - 1);
    }

    /**
     * Interpolate a value
     * @param {number} x - the value to find, in the range [0,1]
     * @returns the interpolated value
     */
    interpolate(x) {
        // x must be between 0 and 1
        if (x < 0) x = 0;
        if (x > 1) x = 1;
        // find the nearest point
        for (let i = 0; i < this.#points.length - 1; i++) {
            const p1 = this.#points[i];
            const p2 = this.#points[i + 1];
            let x1 = i * this.#delta;
            let x2 = (i + 1) * this.#delta;
            if (x >= x1 && x <= x2) {
                const t = (x - x1) / this.#delta;
                return p1 * (1 - t) + p2 * t;
            }
        }
        // if x is exactly at the last point
        return this.#points[this.#points.length - 1];
    }
}

/**
 * Formant filter
 */
export default class FormantFilter extends BleepSynthModule {

    static DEFAULT_Q = 1.0
    static DEFAULT_VOWEL = 0.5
    static NUM_FORMANTS = 3

    // https://www.classes.cs.uchicago.edu/archive/1999/spring/CS295/Computing_Resources/Csound/CsManual3.48b1.HTML/Appendices/table3.html

    // first formant 
    static f1 = new PiecewiseLinear([650, 400, 290, 400, 350]);
    static a1 = new PiecewiseLinear([0, 0, 0, 0, 0]);
    static b1 = new PiecewiseLinear([80, 70, 40, 40, 40]);

    // second formant
    static f2 = new PiecewiseLinear([1080, 1700, 1870, 800, 600]);
    static a2 = new PiecewiseLinear([-6, -14, -15, -10, -20]);
    static b2 = new PiecewiseLinear([90, 80, 90, 80, 60]);

    // third formant
    static f3 = new PiecewiseLinear([2650, 2600, 2800, 2600, 2700]);
    static a3 = new PiecewiseLinear([-7, -12, -18, -12, -17]);
    static b3 = new PiecewiseLinear([120, 100, 100, 100, 100]);

    #filter
    #vowel
    #q
    #in
    #formants
    #bandwidths
    #amplitudes
    #out

    /**
     * Make a formant filter instance
     * @param {AudioContext} context 
     * @param {Monitor} monitor 
     */
    constructor(context, monitor) {
        super(context, monitor);
        this.#vowel = FormantFilter.DEFAULT_VOWEL;
        this.#q = FormantFilter.DEFAULT_Q;
        this.#formants = [FormantFilter.f1, FormantFilter.f2, FormantFilter.f3];
        this.#bandwidths = [FormantFilter.b1, FormantFilter.b2, FormantFilter.b3];
        this.#amplitudes = [FormantFilter.a1, FormantFilter.a2, FormantFilter.a3];
        // gain stages
        this.#in = new MonitoredGainNode(context, monitor, { 
            gain: 1 
        });
        this.#out = new MonitoredGainNode(context, monitor, { 
            gain: 1 
        });
        // formant filters
        this.#filter = [];
        for (let i = 0; i < FormantFilter.NUM_FORMANTS; i++) {
            this.#filter[i] = new MonitoredBiquadFilterNode(context, monitor, { 
                type: "bandpass" 
            });
            this.#in.connect(this.#filter[i]);
            this.#filter[i].connect(this.#out);
        }
        // setup
        this.#setFormants();
        this.#setAmplitudes();
        this.#setBandwidths();
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

    /**
     * Set the formant frequencies
     */
    #setFormants() {
        for (let i = 0; i < FormantFilter.NUM_FORMANTS; i++) {
            this.#filter[i].frequency.value = this.#formants[i].interpolate(this.#vowel);
        }
    }

    /**
     * Set the formant gains
     */
    #setAmplitudes() {
        for (let i = 0; i < FormantFilter.NUM_FORMANTS; i++) {
            this.#filter[i].gain.value = this.#amplitudes[i].interpolate(this.#vowel);
        }
    }

    /**
     * Set the formant bandwidths
     * Q is freq/bandwidth but we might scale to make more or less peaky
     */
    #setBandwidths() {
        for (let i = 0; i < FormantFilter.NUM_FORMANTS; i++) {
            this.#filter[i].Q.value = this.#filter[i].frequency.value / this.#bandwidths[i].interpolate(this.#vowel) * this.#q;
        }
    }

    stop(tim) {
        let stopTime = tim - this._context.currentTime;
        if (stopTime < 0) stopTime = 0;
        setTimeout(() => {
            this.#in.disconnect();
            this.#out.disconnect();
            for (let i = 0; i < FormantFilter.NUM_FORMANTS; i++) {
                this.#filter[i].disconnect();
            }
        }, (stopTime + 0.1) * 1000);
    }

    /**
     * Set the vowel quality
     * @param {number} v - the vowel quality in the range [0,1]
     */
    set vowel(v) {
        this.#vowel = v;
        this.#setFormants();
        this.#setAmplitudes();
    }

    /**
     * Set the resonance (strictly, a scaling factor on the formant bandwidths)
     * A value of about 1 is right, since this gives the default bandwidths
     * The useful range is around 0.5 to 2
     * @param {number} q - the bandwidth scaling factor 
     */
    set resonance(q) {
        this.#q = Utility.clamp(q,0.5,2);
        this.#setBandwidths();
    }
    
}

