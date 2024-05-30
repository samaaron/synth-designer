import Amplifier from './amplifier.js';
import Decay from './decay.js';
import DelayLine from './delayline.js';
import Envelope from './envelope.js';
import HighpassFilter from './highpass_filter.js';
import LFO from './lfo.js';
import LowpassFilter from './lowpass_filter.js';
import NoiseGenerator from './noise.js';
import Panner from './panner.js';
import Waveshaper from './wave_shaper.js';
import {SinOsc, SawOsc, SquareOsc, TriOsc, PulseOsc} from './oscillators.js';
import Wavefolder from './wave_folder.js';

const MAX_MIDI_FREQ = 4186; // C8
const MIN_MIDI_FREQ = 27.5;  // A0
const MAX_LEVEL = 1;
const MIN_LEVEL = 0;

const MODULE_CONTEXT = {
    Amplifier : Amplifier,
    Decay : Decay,
    DelayLine : DelayLine,
    Envelope : Envelope,
    HighpassFilter : HighpassFilter,
    LFO : LFO,
    LowpassFilter : LowpassFilter,
    Noise : NoiseGenerator,
    Panner : Panner,
    PulseOsc : PulseOsc,
    SawOsc : SawOsc,
    SinOsc : SinOsc,
    SquareOsc : SquareOsc,
    TriOsc : TriOsc,
    Wavefolder : Wavefolder,
    Waveshaper : Waveshaper
  };
  
// mapping between grammar names for modules and class names

const MODULE_CLASSES = {
    "ADSR": "Envelope",
    "AUDIO": "Audio",
    "DECAY": "Decay",
    "DELAY": "DelayLine",
    "FOLDER": "Wavefolder",
    "HPF": "HighpassFilter",
    "LFO": "LFO",
    "LPF": "LowpassFilter",
    "NOISE": "Noise",
    "PAN": "Panner",
    "PULSE-OSC": "PulseOsc",
    "SAW-OSC": "SawOsc",
    "SHAPER": "Waveshaper",
    "SIN-OSC": "SinOsc",
    "SQR-OSC": "SquareOsc",
    "TRI-OSC": "TriOsc",
    "VCA": "Amplifier"
  };
  
  // valid tweaks, used for error checking
  
  const VALID_TWEAKS = {
    "ADSR": ["attack", "decay", "sustain", "release", "level"],
    "DECAY": ["attack", "decay", "level"],
    "DELAY": ["lag"],
    "FOLDER": ["symmetry", "gain"],
    "HPF": ["cutoff", "resonance"],
    "LFO": ["pitch", "phase"],
    "LPF": ["cutoff", "resonance"],
    "PAN": ["angle"],
    "PULSE-OSC": ["detune", "pitch", "pulsewidth"],
    "SAW-OSC": ["detune", "pitch"],
    "SHAPER": ["fuzz"],
    "SIN-OSC": ["detune", "pitch"],
    "SQR-OSC": ["detune", "pitch"],
    "TRI-OSC": ["detune", "pitch"],
    "VCA": ["level"]
  };
  
  // valid patch inputs, used for error checking
  
  const VALID_PATCH_INPUTS = {
    "AUDIO": ["in"],
    "DELAY": ["in", "lagCV"],
    "FOLDER": ["in", "symmetryCV", "gainCV"],
    "HPF": ["in", "cutoffCV"],
    "LPF": ["in", "cutoffCV"],
    "PAN": ["in", "angleCV"],
    "PULSE-OSC": ["pitchCV", "pulsewidthCV"],
    "SAW-OSC": ["pitchCV"],
    "SHAPER": ["in"],
    "SIN-OSC": ["pitchCV"],
    "SQR-OSC": ["pitchCV"],
    "TRI-OSC": ["pitchCV"],
    "VCA": ["in", "levelCV"]
  };
  
  // valid patch outputs - pointless at the moment but in future modules may have more than one output
  
  const VALID_PATCH_OUTPUTS = {
    "ADSR": ["out"],
    "DECAY": ["out"],
    "DELAY": ["out"],
    "FOLDER": ["out"],
    "HPF": ["out"],
    "LFO": ["out"],
    "LPF": ["out"],
    "NOISE": ["out"],
    "PAN": ["out"],
    "PULSE-OSC": ["out"],
    "SAW-OSC": ["out"],
    "SHAPER": ["out"],
    "SIN-OSC": ["out"],
    "SQR-OSC": ["out"],
    "TRI-OSC": ["out"],
    "VCA": ["out"]
  };
  
const Constants = {
    MAX_MIDI_FREQ,
    MIN_MIDI_FREQ,
    MIN_LEVEL,
    MAX_LEVEL,
    MODULE_CLASSES: MODULE_CLASSES,
    VALID_TWEAKS: VALID_TWEAKS,
    VALID_PATCH_INPUTS: VALID_PATCH_INPUTS,
    VALID_PATCH_OUTPUTS: VALID_PATCH_OUTPUTS,
    MODULE_CONTEXT
};

export default Constants;