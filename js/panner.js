export default class Panner {

    #pan
    #context
    #monitor
  
    constructor(ctx,monitor) {
      this.#context = ctx;
      this.#monitor = monitor;
      this.#pan = ctx.createStereoPanner();
      this.#monitor.retain("panner");
    }
  
    // stereo position between -1 and 1
    set angle(p) {
      this.#pan.pan.value = p;
    }
  
    // stereo position between -1 and 1
    get angle() {
      return this.#pan.pan.value;
    }
  
    get angleCV() {
      return this.#pan.pan;
    }
  
    get in() {
      return this.#pan;
    }
  
    get out() {
      return this.#pan;
    }
  
    stop(tim) {
      if (VERBOSE) console.log("stopping Panner");
      let stopTime = tim - this.#context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        if (VERBOSE) console.log("disconnecting Panner");
        this.#pan.disconnect();
        this.#pan = null;
        this.#context = null;
        this.#monitor.release("panner");
      }, (stopTime + 0.1) * 1000);
    }
  
  }
  