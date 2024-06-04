import Amplifier from './amplifier.js';
import CrossFader from './crossfader.js';
import CombFilter from './comb_filter.js';
import Decay from './decay.js';
import DelayLine from './delayline.js';
import Envelope from './envelope.js';
import { LowpassFilter, HighpassFilter } from './filters.js';
import LFO from './lfo.js';
import NoiseGenerator from './noise.js';
import Panner from './panner.js';
import Waveshaper from './wave_shaper.js';
import { SinOsc, SawOsc, SquareOsc, TriOsc, PulseOsc } from './oscillators.js';
import Wavefolder from './wave_folder.js';
import SuperSaw from './supersaw.js';
import FormantFilter from './formant_filter.js';
import Reverb from './reverb.js';

const MAX_MIDI_FREQ = 4186; // C8
const MIN_MIDI_FREQ = 27.5;  // A0
const MAX_LEVEL = 1;
const MIN_LEVEL = 0;

const MIDDLE_C = 261.63; // Hz

// mapping between grammar names for modules and class names

const MODULE_CLASSES = {
  "ADSR": Envelope,
  "AUDIO": Audio,
  "COMB": CombFilter,
  "DECAY": Decay,
  "DELAY": DelayLine,
  "FADER": CrossFader,
  "FOLDER": Wavefolder,
  "FORMANT": FormantFilter,
  "HPF": HighpassFilter,
  "LFO": LFO,
  "LPF": LowpassFilter,
  "NOISE": NoiseGenerator,
  "PAN": Panner,
  "PULSE-OSC": PulseOsc,
  "SAW-OSC": SawOsc,
  "SHAPER": Waveshaper,
  "SIN-OSC": SinOsc,
  "SQR-OSC": SquareOsc,
  "SUPERSAW": SuperSaw,
  "TRI-OSC": TriOsc,
  "VCA": Amplifier
};

const EFFECT_CLASSES = {
  "reverb_large": Reverb,
  "reverb_medium": Reverb,
  "reverb_small": Reverb
}

const Constants = {
  MAX_MIDI_FREQ,
  MIN_MIDI_FREQ,
  MIN_LEVEL,
  MAX_LEVEL,
  MIDDLE_C,
  MODULE_CLASSES,
  EFFECT_CLASSES
};

export default Constants;