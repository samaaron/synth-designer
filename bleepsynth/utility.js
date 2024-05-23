export default class Utility {

    static midiToNoteName(m) {
        const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        return noteNames[m % 12] + (Math.floor(m / 12) - 1);
      }
            
      static midiNoteToFreqHz(m) {
        return 440 * Math.pow(2, (m - 69) / 12.0);
      }
      
}