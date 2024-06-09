import Utility from "./utility.js";

export default class Expression {

    // ------------------------------------------------------------
    // convert an infix expression to postfix
    // ------------------------------------------------------------

    static convertToPostfix(expression) {
        // shunting yard algorithm with functions
        const ops = { "+": 1, "-": 1, "*": 2, "/": 2 };
        const funcs = { "log": 1, "exp": 1, "random": 1, "map": 1 };
        // split the expression
        const tokens = expression.split(/([\*\+\-\/\,\(\)])/g).filter(x => x);
        // deal with unary minus
        // is there a minus at the start?
        if ((tokens.length > 1) && (tokens[0] == "-") && Expression.isNumber(tokens[1])) {
            tokens.shift();
            let n = parseFloat(tokens.shift());
            tokens.unshift(`${-1 * n}`);
        }
        // is there a minus after a bracket or other operator?
        if (tokens.length > 2) {
            for (let i = 1; i < tokens.length - 1; i++) {
                let pre = tokens[i - 1];
                let mid = tokens[i];
                let post = tokens[i + 1];
                if ((mid == "-") && Expression.isNumber(post) && ((pre == "(") || (pre in ops))) {
                    let n = -1 * parseFloat(post);
                    tokens[i + 1] = `${n}`;
                    tokens.splice(i, 1);
                }
            }
        }
        let top = (s) => s[s.length - 1];
        let stack = [];
        let result = [];
        for (let t of tokens) {
            if (Expression.isNumber(t) || Expression.isIdentifier(t)) {
                result.push(t);
            } else if (t == "(") {
                stack.push(t);
            } else if (t == ")") {
                while (top(stack) != "(") {
                    let current = stack.pop();
                    result.push(current);
                }
                stack.pop();
                if (stack.length > 0) {
                    if (top(stack) in funcs) {
                        let current = stack.pop();
                        result.push(current);
                    }
                }
            } else if (t in funcs) {
                stack.push(t);
            } else if (t == ",") {
                while (top(stack) != "(") {
                    let current = stack.pop();
                    result.push(current);
                }
            } else if (t in ops) {
                // deal with unary minus
                while ((stack.length > 0) && (top(stack) in ops) && (ops[top(stack)] >= ops[t])) {
                    let current = stack.pop();
                    result.push(current);
                }
                stack.push(t);
            }
        }
        while (stack.length > 0) {
            let current = stack.pop();
            if (current != ",") {
                result.push(current);
            }
        }
        return result;
    }

    // evaluate a parameter expression in postfix form
    static evaluatePostfix(expression,params,minima,maxima) {
        let stack = [];
        const popOperand = () => {
            let op = stack.pop();
            if (Expression.isIdentifier(op)) {
                op = params[op.replace("param.", "")];
            }
            return op;
        }
        for (let t of expression) {
            if (Expression.isNumber(t)) {
                stack.push(parseFloat(t));
            } else if (Expression.isIdentifier(t)) {
                stack.push(t);
            } else if (t === "*" || t === "/" || t === "+" || t == "-") {
                let op2 = popOperand();
                let op1 = popOperand();
                switch (t) {
                    case "*": stack.push(op1 * op2); break;
                    case "/": stack.push(op1 / op2); break;
                    case "+": stack.push(op1 + op2); break;
                    case "-": stack.push(op1 - op2); break;
                }
            } else if (t === "log") {
                let op = popOperand();
                stack.push(Math.log(op));
            } else if (t === "exp") {
                let op = popOperand();
                stack.push(Math.exp(op));
            } else if (t === "random") {
                let op1 = stack.pop();
                let op2 = stack.pop();
                let r = Utility.randomBetween(op2, op1);
                stack.push(r);
            } else if (t === "map") {
                let op1 = stack.pop();
                let op2 = stack.pop();
                let op3 = stack.pop();
                let control = op3.replace("param.", "");
                let minval = minima[control];
                let maxval = maxima[control];
                let s = Utility.scaleValue(minval, maxval, op2, op1, params[control]);
                stack.push(s);
            }
        }
        let result = stack[0];
        if (Expression.isIdentifier(result))
            return params[result.replace("param.", "")];
        else
            return result;
    }

    // ------------------------------------------------------------
    // is this token a number?
    // ------------------------------------------------------------

    static isNumber(t) {
        return !isNaN(parseFloat(t)) && isFinite(t);
    }

    // ------------------------------------------------------------
    // is this token an identifier?
    // ------------------------------------------------------------

    static isIdentifier(t) {
        return (typeof t === "string") && (t.startsWith("param."));
    }

}