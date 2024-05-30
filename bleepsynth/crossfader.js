import Monitor from "./monitor";

export default class CrossFader {
  #context;
  #monitor;
  #inA;
  #inB;
  #balanceNode;
  #inverter;
  #constantOne;
  #mix;
  #gainA
  #gainB

  constructor(ctx, monitor) {
    this.#context = ctx;
    this.#monitor = monitor;
    this.#inA = ctx.createGain();
    this.#inB = ctx.createGain();
    this.#gainA = new GainNode(ctx,{
        gain : 0
    });
    this.#gainB = ctx.createGain();
    this.#balanceNode = ctx.createConstantSource();
    this.#mix = ctx.createGain();

    // Connect the inverted signal to the balanceGain node
    this.#balanceNode.connect(this.#gainA.gain);

    this.#inA.connect(this.#gainA);
    this.#gainA.connect(this.#mix); 

    this.#monitor.retainGroup(
      [
        Monitor.GAIN,
        Monitor.GAIN,
        Monitor.CONSTANT,
        Monitor.MERGER,
      ],
      Monitor.CROSS_FADER
    );
  }

  get inA() {
    return this.#inA;
  }

  get inB() {
    return this.#inB;
  }

  get out() {
    return this.#mix;
  }

  start(tim) {
    this.#balanceNode.start(tim);
  }

  stop(tim) {
    this.#balanceNode.stop(tim);
    this.#monitor.releaseGroup(
      [
        Monitor.GAIN,
        Monitor.GAIN,
        Monitor.CONSTANT,
        Monitor.MERGER,
      ],
      Monitor.CROSS_FADER
    );
  }

  set balance(b) {
    this.#balanceNode.offset.value = b;
  }

  get balanceCV() {
    return this.#balanceNode.offset;
  }
}
