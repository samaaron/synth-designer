export default class BleepSynthModule {

    _context
    _monitor

    static getTweaks() {
        return [];
    }

    static getInputs() {
        return [];
    }

    static getOutputs() {
        return [];
    }

    constructor(context, monitor) {
        this._context = context;
        this._monitor = monitor;
    }

}