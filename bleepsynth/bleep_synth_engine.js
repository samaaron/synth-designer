import Monitor from './monitor.js';

export default class BleepSynthEngine {

    #monitor

    constructor() {
        this.#monitor = new Monitor();
    }
    
}