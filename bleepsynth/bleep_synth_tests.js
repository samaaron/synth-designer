import Expression from "./expression";
import Utility from "./utility";

export default class BleepSynthTests {

  static testSynths() {
    console.log("testing synths");
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