import Constants from "./constants"

export default class LFO {

    #sinOsc
    #cosOsc
    #sinGain
    #cosGain
    #mixer
    #freqHz
    #context
    #monitor

    constructor(ctx,monitor) {
      this.#context = ctx;
      this.#monitor = monitor;
      this.#freqHz = 5; // Hz

      this.#sinOsc = ctx.createOscillator();
      this.#sinOsc.type = "sine";
      this.#sinOsc.frequency.value = this.#freqHz;

      this.#cosOsc = ctx.createOscillator();
      this.#cosOsc.type = "sine";
      this.#cosOsc.frequency.value = this.#freqHz;

      this.#sinGain = ctx.createGain();
      this.#cosGain = ctx.createGain();
      this.#mixer = ctx.createGain();

      this.#sinOsc.connect(this.#sinGain);
      this.#cosOsc.connect(this.#cosGain);
      this.#sinGain.connect(this.#mixer);
      this.#cosGain.connect(this.#mixer);

      this.#monitor.retain("lfo");

    }

    set phase(p) {
      this.#sinGain.gain.value = Math.cos(p);
      this.#cosGain.gain.value = Math.sin(p);
    }

    get pitch() {
      return this.#freqHz;
    }

    set pitch(n) {
      this.#freqHz = n;
      this.#sinOsc.frequency.value = this.#freqHz;
      this.#cosOsc.frequency.value = this.#freqHz;
    }

    get out() {
      return this.#mixer;
    }

    start(tim) {
      this.#sinOsc.start(tim);
      this.#cosOsc.start(tim);
    }

    stop(tim) {
      if (Constants.VERBOSE) console.log("stopping LFO");
      this.#sinOsc.stop(tim);
      this.#cosOsc.stop(tim);
      let stopTime = tim - this.#context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        if (Constants.VERBOSE) console.log("disconnecting LFO");
        this.#sinOsc.disconnect();
        this.#cosOsc.disconnect();
        this.#sinGain.disconnect();
        this.#cosGain.disconnect();
        this.#mixer.disconnect();
        this.#sinOsc = null;
        this.#cosOsc = null;
        this.#sinGain = null;
        this.#cosGain = null;
        this.#mixer = null;
        this.#context = null;
        this.#monitor.release("lfo");
      }, (stopTime + 0.1) * 1000);
    }

  }
