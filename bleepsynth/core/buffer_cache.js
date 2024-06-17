export default class BufferCache {

    #loadedBuffers = new Map();
    #pendingFetches = new Map();

    /**
     * get an audio buffer from a URL
     * @param {string} url
     * @param {AudioContext} context
     * @returns {Promise<AudioBuffer>}
     */
    async loadBuffer(url, context) {
        if (this.#loadedBuffers.has(url)) {
            //console.log("Returning loaded buffer", url);
            // Return a resolved promise with the audio buffer if it's already loaded
            return Promise.resolve(this.#loadedBuffers.get(url));
        }
        if (this.#pendingFetches.has(url)) {
            //console.log("Returning pending fetch", url);
            // Return the pending fetch promise if the buffer is being fetched
            return this.#pendingFetches.get(url);
        }
        //console.log("Fetching audio buffer", url);
        // Create the fetch promise
        const fetchPromise = fetch(url)
            .then(response => response.arrayBuffer())
            .then(array_buffer => context.decodeAudioData(array_buffer))
            .then(audio_buffer => {
                // Store the loaded buffer and clean up the pending fetch
                this.#loadedBuffers.set(url, audio_buffer);
                this.#pendingFetches.delete(url);
                return audio_buffer;
            })
            .catch(error => {
                // Clean up the pending fetch on error
                this.#pendingFetches.delete(url);
                throw error;
            });
        // Store the pending fetch promise
        this.#pendingFetches.set(url, fetchPromise);
        return fetchPromise;
    }
}