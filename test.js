window.addEventListener('DOMContentLoaded', init);

let context;
let formant;

/*
This says the Q and bandwidth are related by the formula 1/Q = 2*sinh(ln(2)/2*BW*w0/sin(w0)) where w0 = = 2*pi*f0/Fs and f0 is the center frequency and Fs is the sample rate.
*/

function init() {
  console.log("init");
  const f1 = new PiecewiseLinear([800, 350, 270, 450, 325]);
  const a1 = new PiecewiseLinear([0, 0, 0, 0, 0]);
  const b1 = new PiecewiseLinear([80, 60, 60, 70, 50]);

  const f2 = new PiecewiseLinear([1150, 2000, 2140, 800, 700]);
  //const a2 = new PiecewiseLinear([-6, -20, -12, -11, -16]);
  const a2 = new PiecewiseLinear([0.71, 0.32, 0.50, 0.53, 0.40]);
  const b2 = new PiecewiseLinear([90, 100, 90, 80, 60]);

  const f3 = new PiecewiseLinear([2900, 2800, 2950, 2830, 2700]);
  //const a3 = new PiecewiseLinear([-32, -15, -26, -22, -35]);
  const a3 = new PiecewiseLinear([0.16, 0.42, 0.22, 0.28, 0.13]);
  const b3 = new PiecewiseLinear([120, 120, 100, 100, 170]);

  for (let i = 0; i < 21; i++) {
    let x = i * (1 / 20);
    console.log(`x=${x} y=${f1.interpolate(x)}`);
  }

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
    if (formant!=undefined)
    formant.vowel(parseFloat(this.value),0.1);
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
  mix
  osc

  f1
  a1
  b1
  f2
  a2
  b2
  f3
  a3
  b3

  constructor(ctx) {
    this.#context = ctx;
    this.osc = ctx.createOscillator();
    this.osc.type = "sawtooth";
    this.osc.frequency.value = 60;

    this.mix = ctx.createGain();

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
    this.mix.gain.value = 0.3;

    this.mix.connect(ctx.destination);

    this.f1 = new PiecewiseLinear([800, 350, 270, 450, 325]);
    this.a1 = new PiecewiseLinear([0, 0, 0, 0, 0]);
    this.b1 = new PiecewiseLinear([80, 60, 60, 70, 50]);

    this.f2 = new PiecewiseLinear([1150, 2000, 2140, 800, 700]);
    this.a2 = new PiecewiseLinear([-6, -20, -12, -11, -16]);
    this.b2 = new PiecewiseLinear([90, 100, 90, 80, 60]);

    this.f3 = new PiecewiseLinear([2900, 2800, 2950, 2830, 2700]);
    this.a3 = new PiecewiseLinear([-32, -15, -26, -22, -35]);
    this.b3 = new PiecewiseLinear([120, 120, 100, 100, 170]);

  }

  vowel(v,q) {
    console.log(`(${this.f1.interpolate(v)},${this.f2.interpolate(v)},${this.f3.interpolate(v)})`);

    this.filter1.frequency.value = this.f1.interpolate(v);
    this.filter2.frequency.value = this.f2.interpolate(v);
    this.filter3.frequency.value = this.f3.interpolate(v);

    this.filter1.gain.value = this.a1.interpolate(v);
    this.filter2.gain.value = this.a2.interpolate(v);
    this.filter3.gain.value = this.a3.interpolate(v);

    this.filter1.Q.value = this.b1.interpolate(v)*q;
    this.filter2.Q.value = this.b2.interpolate(v)*q;
    this.filter3.Q.value = this.b3.interpolate(v)*q;

  }

  start() {
    this.osc.start();
  }

  stop() {
    this.osc.stop();
  }

}

class PiecewiseLinear {

  #delta
  #points

  constructor(points) {
    this.#points = points;
    this.#delta = 1 / (this.#points.length-1);
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
