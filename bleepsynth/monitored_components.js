/**
 * mixin to add monitor properties to a base class
 * @param {object} baseClass
 * @returns {object}
 */
function monitorMixin(baseClass) {
    return class extends baseClass {
        #monitor
        constructor(monitor, ...args) {
            super(...args);
            this.#monitor = monitor;
            this.#monitor.retain(baseClass.name);
        }
        disconnect() {
            this.#monitor.release(baseClass.name);
            super.disconnect();
        }
    }
}

/**
 * Monitored oscillator node
 */
export class MonitoredOscillatorNode extends monitorMixin(OscillatorNode) {
    constructor(context, monitor, options) {
        super(monitor, context, options);
    }
}

/**
 * Monitored gain node
 */
export class MonitoredGainNode extends monitorMixin(GainNode) {
    constructor(context, monitor, options) {
        super(monitor, context, options);
    }
}

/**
 * Monitored constant source node
 */
export class MonitoredConstantSourceNode extends monitorMixin(ConstantSourceNode) {
    constructor(context, monitor, options) {
        super(monitor, context, options);
    }
}

/**
 * Monitored delay node
 */
export class MonitoredDelayNode extends monitorMixin(DelayNode) {
    constructor(context, monitor, options) {
        super(monitor, context, options);
    }
}

/**
 * Monitored biquad filter node
 */
export class MonitoredBiquadFilterNode extends monitorMixin(BiquadFilterNode) {
    constructor(context, monitor, options) {
        super(monitor, context, options);
    }
}

/**
 * Monitored audio buffer source node
 */
export class MonitoredAudioBufferSourceNode extends monitorMixin(AudioBufferSourceNode) {
    constructor(context, monitor, options) {
        super(monitor, context, options);
    }
}

/**
 * Monitored stereo panner node
 */
export class MonitoredStereoPannerNode extends monitorMixin(StereoPannerNode) {
    constructor(context, monitor, options) {
        super(monitor, context, options);
    }
}

/**
 * Monitored convolver node
 */
export class MonitoredConvolverNode extends monitorMixin(ConvolverNode) {
    constructor(context, monitor, options) {
        super(monitor, context, options);
    }
}

/**
 * Monitored wave shaper node
 */
export class MonitoredWaveShaperNode extends monitorMixin(WaveShaperNode) {
    constructor(context, monitor, options) {
        super(monitor, context, options);
    }
}

export class MonitoredDynamicsCompressorNode extends monitorMixin(DynamicsCompressorNode) {
    constructor(context, monitor, options) {
        super(monitor, context, options);
    }
}
