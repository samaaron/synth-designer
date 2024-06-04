import Flags from "./flags";

/**
 * Monitor - keep track of WebAudio components
 */

export default class Monitor {

    /**
     * @type {Map}
     */
    #map

    /**
     * Constructs a new Monitor instance
     */
    constructor() {
        this.#map = new Map();
    }

    /**
    * Increments the count of active instances for a given module
    * If the module is not already in the map, it is added with a count of 1
    *
    * @param {string} key - The identifier of the module to retain
    */
    retain(key) {
        if (Flags.DEBUG_MONITOR) {
            console.log(`retain ${key}`);
        }
        if (this.#map.has(key)) {
            this.#map.set(key, this.#map.get(key) + 1);
        } else {
            this.#map.set(key, 1);
        }
    }

    /**
     * Decrements the count of active instances for a given module
     * If the module's count reaches 0, it is removed from the map
     *
     * @param {string} key - The identifier of the module to release
     */
    release(key) {
        if (Flags.DEBUG_MONITOR) {
            console.log(`release ${key}`);
        }
        if (this.#map.has(key)) {
            const newVal = this.#map.get(key) - 1;
            if (newVal <= 0) {
                this.#map.delete(key);
            } else {
                this.#map.set(key, newVal);
            }
        }
    }

    /**
     * Retain a group (array) of items
     * @param {object} nodeList
     * @param {string} source - the name of the object that called the method
     */
    retainGroup(nodeList, source) {
        if (Flags.DEBUG_MONITOR) {
            console.log(`retain ${nodeList} for ${source}`);
        }
        for (let node of nodeList) {
            this.retain(node, source);
        }
    }

    /**
     * Release a group (array) of items
     * @param {object} nodeList
     * @param {string} source - the name of the object that called the method
     */
    releaseGroup(nodeList, source) {
        if (Flags.DEBUG_MONITOR) {
            console.log(`release ${nodeList} for ${source}`);
        }
        for (let node of nodeList) {
            this.release(node, source);
        }
    }

    /**
     * Gets a string containing the multi-line monitor state
     * @returns {string} - the monitor state as a string
     */
    get detailString() {
        return "MONITOR:\n" + Array.from(this.#map).map(([key, value]) => `${value} : ${key}`).join('\n');
    }

    /**
     * Get a string containing a single line summary of the monitor state
     * @returns {string}
     */
    get summaryString() {
        return Array.from(this.#map).map(([key, value]) => `${key} : ${value}`).join(', ');
    }

    /**
     * Logs the current state of the monitor to the console
     */
    debug() {
        console.log(this.detailString());
        console.log(this.summaryString());
    }
}
