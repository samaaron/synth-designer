window.addEventListener('DOMContentLoaded', init);

let context;
let formant;
let crossfader;
let osc1;
let osc2;

/*
This says the Q and bandwidth are related by the formula 1/Q = 2*sinh(ln(2)/2*BW*w0/sin(w0)) where w0 = = 2*pi*f0/Fs and f0 is the center frequency and Fs is the sample rate.
*/

class PiecewiseLinear {

  #delta
  #points

  constructor(points) {
    this.#points = points;
    this.#delta = 1 / (this.#points.length - 1);
  }

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

function gui(name) {
  return document.getElementById(name);
}

function midiNoteToFreqHz(m) {
  return 440 * Math.pow(2, (m - 69) / 12.0);
}

function init() {

  gui("start-button").onclick = () => {
    context = new AudioContext();
    // formant = new FormantFilter(context);
  }

  gui("play-button").onclick = () => {
    startTest();
    //formant.start();
  }

  gui("stop-button").onclick = () => {
    stopTest();
    //formant.stop();
  }

  gui("vowel").addEventListener("input", function () {
    if (formant != undefined)
      formant.vowel(parseFloat(this.value));
  });

  gui("resonance").addEventListener("input", function () {
    if (formant != undefined)
      formant.resonance(parseFloat(this.value));
  });

  gui("pitch").addEventListener("input", function () {
    if (formant != undefined)
      formant.pitch = midiNoteToFreqHz(parseInt(this.value));
  });

  gui("balance").addEventListener("input", function () {
    if (crossfader != undefined)
      crossfader.balance = parseFloat(this.value);
  });

}

class FormantFilter {

  #context
  #filter1
  #filter2
  #filter3
  #mix
  #osc
  #phone
  #q

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

  constructor(ctx) {
    this.#context = ctx;

    this.#phone = 0.5;
    this.#q = 1.0;

    // oscillator
    this.#osc = ctx.createOscillator();
    this.#osc.type = "sawtooth";
    this.#osc.frequency.value = 60;

    // gain stage
    this.#mix = ctx.createGain();

    // formant filters
    this.#filter1 = ctx.createBiquadFilter();
    this.#filter1.type = "bandpass"

    this.#filter2 = ctx.createBiquadFilter();
    this.#filter2.type = "bandpass"

    this.#filter3 = ctx.createBiquadFilter();
    this.#filter3.type = "bandpass"

    // connect input to filters
    this.#osc.connect(this.#filter1);
    this.#osc.connect(this.#filter2);
    this.#osc.connect(this.#filter3);

    // connect filters to mixer
    this.#filter1.connect(this.#mix);
    this.#filter2.connect(this.#mix);
    this.#filter3.connect(this.#mix);

    // final connections
    this.#mix.gain.value = 0.3;
    this.#mix.connect(ctx.destination);

    this.setFormants();
    this.setGains();
    this.setBandwidths();

  }

  set pitch(f) {
    this.#osc.frequency.value = f;
  }

  // set the formant frequencies
  setFormants() {
    this.#filter1.frequency.value = FormantFilter.f1.interpolate(this.#phone);
    this.#filter2.frequency.value = FormantFilter.f2.interpolate(this.#phone);
    this.#filter3.frequency.value = FormantFilter.f3.interpolate(this.#phone);
  }

  // set the formant gains
  setGains() {
    this.#filter1.gain.value = FormantFilter.a1.interpolate(this.#phone);
    this.#filter2.gain.value = FormantFilter.a2.interpolate(this.#phone);
    this.#filter3.gain.value = FormantFilter.a3.interpolate(this.#phone);
  }

  // set the formant bandwidths
  setBandwidths() {
    // Q is freq/bandwidth but we might scale to make more or less peaky
    this.#filter1.Q.value = this.#filter1.frequency.value / FormantFilter.b1.interpolate(this.#phone) * this.#q;
    this.#filter2.Q.value = this.#filter2.frequency.value / FormantFilter.b2.interpolate(this.#phone) * this.#q;
    this.#filter3.Q.value = this.#filter3.frequency.value / FormantFilter.b3.interpolate(this.#phone) * this.#q;
  }

  // set the vowel quality
  vowel(p) {
    this.#phone = p;
    this.setFormants();
    this.setGains();
  }

  // set the resonance
  resonance(q) {
    this.#q = q;
    this.setBandwidths();
  }

  // start the oscillator
  start() {
    this.#osc.start();
  }

  // stop the oscillator
  stop() {
    this.#osc.stop();
  }

}

// crossfade between two sources
// we repurpose a stereo panner and feed it an audio-rate unity value from
// a constance source node. Panning this gives us left and right gains that
// are applied to the two inputs, which are then summed 

class CrossFader {

  #context
  #in1
  #in2
  #unity
  #pan
  #splitter
  #mix

  constructor(ctx) {
    this.#context = ctx;
    this.#in1 = ctx.createGain();
    this.#in2 = ctx.createGain();
    this.#mix = ctx.createGain();
    this.#unity = ctx.createConstantSource();
    this.#unity.offset.value = 1;
    this.#pan = ctx.createStereoPanner();
    this.#splitter = ctx.createChannelSplitter(2);
    this.#unity.connect(this.#pan);
    this.#pan.connect(this.#splitter);
    this.#splitter.connect(this.#in1.gain, 0);
    this.#splitter.connect(this.#in2.gain, 1);
    this.#in1.connect(this.#mix);
    this.#in2.connect(this.#mix);
  }

  get in1() {
    return this.#in1;
  }

  get in2() {
    return this.#in2;
  }

  get out() {
    return this.#mix;
  }

  start() {
    this.#unity.start();
  }

  stop() {
    this.#unity.stop();
  }

  set balance(b) {
    this.#pan.pan.value = b;
  }

}

function startTest() {

  crossfader = new CrossFader(context);

  osc1 = context.createOscillator();
  osc1.frequency.value = 110;
  osc1.type = "sawtooth";

  osc2 = context.createOscillator();
  osc2.frequency.value = 440;
  osc2.type = "square";

  osc1.connect(crossfader.in1);
  osc2.connect(crossfader.in2);
  crossfader.out.connect(context.destination);

  crossfader.start();
  osc1.start();
  osc2.start();

}

function stopTest() {
  crossfader.stop();
  osc1.stop();
  osc2.stop();
}