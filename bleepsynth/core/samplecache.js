export default class SampleCache {

    #cache
    #missCount

    constructor() {
        this.#cache = new Map();
        this.#missCount = 0;
    }

    /**
     * load a sample, if not in the cache then store it
     * @param {AudioContext} context 
     * @param {string} filename 
     * @returns {AudioBuffer}
     */
    async getSample(context, filename) {
        if (this.#cache.has(filename)) {
            return this.#cache.get(filename);
        }
        this.#missCount++;
        const response = await fetch(filename);
        const rawBuffer = await response.arrayBuffer();
        const decodedBuffer = await context.decodeAudioData(rawBuffer);
        this.#cache.set(filename, decodedBuffer);
        return decodedBuffer;
    }

    clear() {
        this.#cache.clear();
    }

    get size() {
        return this.#cache.size;
    }

}