export default class Utility {

  /**
   * get the midi note name for a note number
   * @param {number} m
   * @returns {string}
   */
  static midiToNoteName(m) {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    return noteNames[m % 12] + (Math.floor(m / 12) - 1);
  }

  /**
   * get the frequency in Hz for a midi note number
   * @param {number} m
   * @returns {number}
   */
  static midiNoteToFreqHz(m) {
    return 440 * Math.pow(2, (m - 69) / 12.0);
  }

  /**
   * scale a value p in the range (low,high) to a new range (min,max)
   * @param {number} low
   * @param {number} high
   * @param {number} min
   * @param {number} max
   * @param {number} p
   * @returns {number}
   */
  static scaleValue(low, high, min, max, p) {
    console.log(p);
    return min + (p - low) * (max - min) / (high - low);
  }

  /**
   * make a random number between two values
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  static randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Clamp a value to a maximum and minimum
   * https://www.youtube.com/watch?v=g2_zb6oyep8
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

}