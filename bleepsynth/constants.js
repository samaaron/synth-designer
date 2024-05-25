const VERBOSE = true

const MIDDLE_C = 261.63; // Hz
const MAX_MIDI_FREQ = 4186; // C8
const MIN_MIDI_FREQ = 27.5;  // A0
const MAX_LEVEL = 1;
const MIN_LEVEL = 0;

// mapping between grammar names for modules and class names

const MODULE_CLASSES = {
    "SAW-OSC": "SawOsc",
    "SIN-OSC": "SinOsc",
    "TRI-OSC": "TriOsc",
    "SQR-OSC": "SquareOsc",
    "PULSE-OSC": "PulseOsc",
    "LFO": "LFO",
    "PAN": "Panner",
    "NOISE": "Noise",
    "LPF": "LowpassFilter",
    "HPF": "HighpassFilter",
    "VCA": "Amplifier",
    "SHAPER": "Waveshaper",
    "ADSR": "Envelope",
    "DECAY": "Decay",
    "AUDIO": "Audio",
    "DELAY": "Delay"
  };
  
  // valid tweaks, used for error checking
  
  const VALID_TWEAKS = {
    "SAW-OSC": ["detune", "pitch"],
    "SIN-OSC": ["detune", "pitch"],
    "SQR-OSC": ["detune", "pitch"],
    "TRI-OSC": ["detune", "pitch"],
    "PULSE-OSC": ["detune", "pitch", "pulsewidth"],
    "LFO": ["pitch", "phase"],
    "LPF": ["cutoff", "resonance"],
    "HPF": ["cutoff", "resonance"],
    "VCA": ["level"],
    "SHAPER": ["fuzz"],
    "ADSR": ["attack", "decay", "sustain", "release", "level"],
    "DECAY": ["attack", "decay", "level"],
    "PAN": ["angle"],
    "DELAY": ["lag"],
    "FOLDER": ["threshold", "symmetry", "gain", "level", "stages"]
  };
  
  // valid patch inputs, used for error checking
  
  const VALID_PATCH_INPUTS = {
    "AUDIO": ["in"],
    "SAW-OSC": ["pitchCV"],
    "SIN-OSC": ["pitchCV"],
    "SQR-OSC": ["pitchCV"],
    "TRI-OSC": ["pitchCV"],
    "PULSE-OSC": ["pitchCV", "pulsewidthCV"],
    "LPF": ["in", "cutoffCV"],
    "HPF": ["in", "cutoffCV"],
    "VCA": ["in", "levelCV"],
    "SHAPER": ["in"],
    "PAN": ["in", "angleCV"],
    "DELAY": ["in", "lagCV"],
    "FOLDER": ["in", "thresholdCV", "symmetryCV", "levelCV", "gainCV"]
  };
  
  // valid patch outputs - pointless at the moment but in future modules may have more than one output
  
  const VALID_PATCH_OUTPUTS = {
    "SAW-OSC": ["out"],
    "SIN-OSC": ["out"],
    "SQR-OSC": ["out"],
    "TRI-OSC": ["out"],
    "PULSE-OSC": ["out"],
    "LFO": ["out"],
    "NOISE": ["out"],
    "LPF": ["out"],
    "HPF": ["out"],
    "VCA": ["out"],
    "SHAPER": ["out"],
    "ADSR": ["out"],
    "DECAY": ["out"],
    "PAN": ["out"],
    "DELAY": ["out"],
    "FOLDER": ["out"]
  };
  
const Constants = {
    VERBOSE,
    MIDDLE_C,
    MAX_MIDI_FREQ,
    MIN_MIDI_FREQ,
    MIN_LEVEL,
    MAX_LEVEL,
    MODULE_CLASSES: MODULE_CLASSES,
    VALID_TWEAKS: VALID_TWEAKS,
    VALID_PATCH_INPUTS: VALID_PATCH_INPUTS,
    VALID_PATCH_OUTPUTS: VALID_PATCH_OUTPUTS
};

export default Constants;