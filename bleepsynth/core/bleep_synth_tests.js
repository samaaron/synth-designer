import Expression from "./expression.js";
import Utility from "./utility.js";
import BleepSynthEngine from "./bleep_synth_engine.js";
import Constants from "./constants.js";

export default class BleepSynthTests {

  static TEST_PATCHES = ["buzzer", "synflute", "noise","elpiano","fmbell","fmpluck","filterwobble"];

  static async testSynthFromGenerator() {
    console.log("testing synths");
    const synthEngine = await BleepSynthEngine.createInstance();
    let when = synthEngine.currentTime;
    for (let patch of BleepSynthTests.TEST_PATCHES) {
      const patchFile = `bleepsynth/presets/${patch}.txt`;
      console.log(`testing ${patchFile}`);
      const result = await synthEngine.createGeneratorFromURL(patchFile);
      const generator = result.generator;
      console.log(result.message);
      const player = synthEngine.createPlayerFromGenerator(generator, {
        pitch: Constants.MIDDLE_C,
        level: 0.8,
        duration: 1
      });
      player.out.connect(synthEngine.context.destination);
      player.play(when);
      when += 1.5;
    }
  }

  static async testSynthCache() {
    // start the engine
    const synthEngine = await BleepSynthEngine.createInstance();
    // load all presets
    await synthEngine.loadPresetSynthDefs();
    // play a scale
    let when = synthEngine.currentTime;
    for (let note = 60; note <= 72; note++) {
      const player = synthEngine.createPlayer("breton", {
        pitch: Utility.midiNoteToFreqHz(note),
        level: 0.8,
        duration: 0.5
      });
      player.out.connect(synthEngine.destination);
      // play immediately
      player.play(when);
      // play after 1 second
      when += 0.25;
    }
  }

  static async testSampler() {
    // start the engine
    const synthEngine = await BleepSynthEngine.createInstance();
    // play a sample
    let when = synthEngine.currentTime;
    synthEngine.playSample(when, "loop_amen", synthEngine.destination,{});
    synthEngine.playSample(when+2, "loop_amen", synthEngine.destination,{ cutoff:800 });
    // play some more samples to test the pan
    when+=2;
    for (let pan=-1; pan<=1; pan+=0.5) {
      console.log(`pan=${pan}`);
      synthEngine.playSample(when+4, "guit_em9", synthEngine.destination,{ pan:pan, level:0.5});
      when+=2;
    }
  }

  static testExpressionEvaluation() {
    let infix = [];
    infix.push("2*param.cutoff");
    infix.push("2+param.cutoff");
    infix.push("param.cutoff+param.resonance");
    infix.push("log(param.cutoff)+exp(param.resonance)");
    infix.push("2");
    infix.push("4/5");
    infix.push("8-5");
    infix.push("param.cutoff/3");
    infix.push("param.cutoff+random(0,1)");
    infix.push("exp(param.cutoff-param.resonance)");
    infix.push("param.pitch");
    infix.push("-1200");
    infix.push("(-1)*2");
    infix.push("2*-4");
    let param = { "cutoff": 2, "resonance": 3, "timbre": 4, "pitch": 50, "level": 0.5 };
    let minima = { "cutoff": 0, "resonance": 0, "timbre": 0, "pitch": 20, "level": 0 };
    let maxima = { "cutoff": 10, "resonance": 10, "timbre": 5, "pitch": 500, "level": 1 };
    for (let item of infix)
      BleepSynthTests.testExpression(item, param, minima, maxima);
  }

  // ------------------------------------------------------------
  // for testing, compare an expression in infix and postfix form
  // ------------------------------------------------------------

  static testExpression(infix, param, minima, maxima) {
    console.log(infix);
    let postfix = Expression.convertToPostfix(infix);
    console.log("".concat(postfix.map(z => `${z}`)));
    infix = infix.replace("log", "Math.log");
    infix = infix.replace("exp", "Math.exp");
    infix = infix.replace("random", "Utility.randomBetween");
    let infixResult = eval(infix);
    let postfixResult = Expression.evaluatePostfix(postfix, param, minima, maxima);
    console.log(`infix=${infixResult} postfix=${postfixResult}`);
    console.log("");
  }

}