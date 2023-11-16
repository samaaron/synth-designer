window.addEventListener('DOMContentLoaded', init);

let context;
let formant;

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

function init() {

  gui("start-button").onclick = () => {
    context = new AudioContext();
    formant = new FormantFilter(context);
  }

  gui("play-button").onclick = () => {
    formant.start();
  }

  gui("stop-button").onclick = () => {
    formant.stop();
  }

  gui("vowel").addEventListener("input", function () {
    if (formant != undefined)
      formant.vowel(parseFloat(this.value));
  });

  gui("resonance").addEventListener("input", function () {
    if (formant != undefined)
      formant.resonance(parseFloat(this.value));
  });

  gui("leak").addEventListener("input", function () {
    if (formant != undefined)
      formant.leak = parseFloat(this.value);
  });

}

class FormantFilter {

  #context
  filter1
  filter2
  filter3
  gain1
  gain2
  gain3
  #leak
  mix
  osc
  phone
  q

  static f1 = new PiecewiseLinear([800, 350, 270, 450, 325]);
  static a1 = new PiecewiseLinear([0, 0, 0, 0, 0]);
  static b1 = new PiecewiseLinear([80, 60, 60, 70, 50]);

  static f2 = new PiecewiseLinear([1150, 2000, 2140, 800, 700]);
  static a2 = new PiecewiseLinear([-6, -20, -12, -11, -16]);
  static b2 = new PiecewiseLinear([90, 100, 90, 80, 60]);

  static f3 = new PiecewiseLinear([2900, 2800, 2950, 2830, 2700]);
  static a3 = new PiecewiseLinear([-32, -15, -26, -22, -35]);
  static b3 = new PiecewiseLinear([120, 120, 100, 100, 170]);

  constructor(ctx) {
    this.#context = ctx;

    this.phone = 0;
    this.q = 0;

    this.osc = ctx.createOscillator();
    this.osc.type = "sawtooth";
    this.osc.frequency.value = 60;

    this.mix = ctx.createGain();
    this.#leak = ctx.createGain();

    this.filter1 = ctx.createBiquadFilter();
    this.filter1.type = "bandpass"

    this.filter2 = ctx.createBiquadFilter();
    this.filter2.type = "bandpass"

    this.filter3 = ctx.createBiquadFilter();
    this.filter3.type = "bandpass"

    this.osc.connect(this.filter1);
    this.osc.connect(this.filter2);
    this.osc.connect(this.filter3);

    this.filter1.connect(this.mix);
    this.filter2.connect(this.mix);
    this.filter3.connect(this.mix);

    this.#leak.gain.value = 0.1;
    this.osc.connect(this.#leak);
    this.#leak.connect(this.mix);

    this.mix.gain.value = 0.3;

    this.mix.connect(ctx.destination);

  }

  setFormants() {
    this.filter1.frequency.value = FormantFilter.f1.interpolate(this.phone);
    this.filter2.frequency.value = FormantFilter.f2.interpolate(this.phone);
    this.filter3.frequency.value = FormantFilter.f3.interpolate(this.phone);
  }

  setGains() {
    this.filter1.gain.value = FormantFilter.a1.interpolate(this.phone);
    this.filter2.gain.value = FormantFilter.a2.interpolate(this.phone);
    this.filter3.gain.value = FormantFilter.a3.interpolate(this.phone);
  }

  setBandwidths() {
    this.filter1.Q.value = FormantFilter.b1.interpolate(this.phone) * this.q;
    this.filter2.Q.value = FormantFilter.b2.interpolate(this.phone) * this.q;
    this.filter3.Q.value = FormantFilter.b3.interpolate(this.phone) * this.q;
  }

  vowel(p) {
    this.phone = p;
    this.setFormants();
    this.setGains();
  }

  resonance(q) {
    this.q = q;
    this.setBandwidths();
  }

  set leak(v) {
    this.#leak.gain.value = v;
  }

  start() {
    this.osc.start();
  }

  stop() {
    this.osc.stop();
  }

}

