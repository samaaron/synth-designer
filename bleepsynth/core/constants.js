import Amplifier from '../modules/amplifier.js';
import CrossFader from '../modules/crossfader.js';
import CombFilter from '../modules/comb_filter.js';
import Decay from '../modules/decay.js';
import DelayLine from '../modules/delayline.js';
import Envelope from '../modules/envelope.js';
import { LowpassFilter, HighpassFilter } from '../modules/filters.js';
import LFO from '../modules/lfo.js';
import NoiseGenerator from '../modules/noise.js';
import Panner from '../modules/panner.js';
import Waveshaper from '../modules/wave_shaper.js';
import { SinOsc, SawOsc, SquareOsc, TriOsc, PulseOsc, RandomOsc, CustomOsc } from '../modules/oscillators.js';
import Wavefolder from '../modules/wave_folder.js';
import SuperSaw from '../modules/supersaw.js';
import FormantFilter from '../modules/formant_filter.js';
import Reverb from '../effects/reverb.js';
import AutoPan from '../effects/autopan.js';
import Flanger from '../effects/flanger.js';
import Chorus from '../effects/chorus.js';
import Compressor from '../effects/compressor.js';
import { Distortion, Overdrive } from '../effects/distortion.js';
import { DeepPhaser, PicoPebble, ThickPhaser } from '../effects/phaser.js';
import MonoDelay from '../effects/mono_delay.js';
import StereoDelay from '../effects/stereo_delay.js';
import Tremolo from '../effects/tremolo.js';
import Leslie from '../effects/leslie.js';
import Bitcrusher from '../effects/bitcrusher.js';

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
  "CUSTOM-OSC": CustomOsc,
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
  "RAND-OSC" : RandomOsc,
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
  "reverb_small": Reverb,
  "reverb_massive": Reverb,
  "room_large": Reverb,
  "room_small": Reverb,
  "plate_drums": Reverb,
  "plate_vocal": Reverb,
  "plate_large": Reverb,
  "plate_small": Reverb,
  "ambience_large": Reverb,
  "ambience_medium": Reverb,
  "ambience_small": Reverb,
  "ambience_gated": Reverb,
  "autopan": AutoPan,
  "flanger": Flanger,
  "chorus": Chorus,
  "compressor": Compressor,
  "distortion": Distortion,
  "overdrive": Overdrive,
  "deep_phaser": DeepPhaser,
  "pico_pebble": PicoPebble,
  "thick_phaser": ThickPhaser,
  "mono_delay": MonoDelay,
  "stereo_delay": StereoDelay,
  "tremolo": Tremolo,
  "leslie": Leslie,
  "bitcrusher": Bitcrusher
};

const REVERB_IMPULSES = {
  "reverb_large": "hall-large.flac",
  "reverb_medium": "hall-medium.flac",
  "reverb_small": "hall-small.flac",
  "reverb_massive": "reactor-hall.flac",
  "room_large": "room-large.flac",
  "room_small": "room-small-bright.flac",
  "plate_drums": "plate-snare.flac",
  "plate_vocal": "rich-plate-vocal-2.flac",
  "plate_large": "plate-large.flac",
  "plate_small": "plate-small.flac",
  "ambience_large": "ambience-large.flac",
  "ambience_medium": "ambience-medium.flac",
  "ambience_small": "ambience-small.flac",
  "ambience_gated": "ambience-gated.flac"
};

const SYNTH_PRESETS = [
  "default",
  "fairvoice",
  "hammond",
  "supersaw",
  "synflute",
  "thickbass",
];

const Constants = {
  EFFECT_CLASSES,
  MAX_LEVEL,
  MAX_MIDI_FREQ,
  MIDDLE_C,
  MIN_LEVEL,
  MIN_MIDI_FREQ,
  MODULE_CLASSES,
  REVERB_IMPULSES,
  SYNTH_PRESETS,
};

export default Constants;