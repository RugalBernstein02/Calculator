// by Mateo Joubert
"use strict";

/**
 * An Operator represents a function which accepts one or more numbers (operands) and transforms them according to some well-defined rule.
 * The Operator class provides an easily-extensible framework for defining new calculator operators.
 */
let Operator = class Operator extends Function {
    #name; #func;
    /** A custom string for formatting.
     * @see {@linkcode Operator.format} for an explanation of format strings
     */
    formatting;
    /**
     * @param {string} name The name of this operator
     * @param {(...operands: number[]) => number} func The function to call when this operator is called.
     * @param {string} formatting The string to use when formatting operands using {@linkcode Operator.format}.
     */
    constructor(name, func, formatting) {
        super(func);
        this.#name = name;
        this.#func = func;
        this.formatting = formatting;
        return new Proxy(this, {
            get: (target, prop) => {
                if (prop === "name") { return target.#name; }
                else if (prop === "arity" || prop === "length") {
                    return target.#func.length;
                }
                else { return target[prop]; };
            },
            set: (target, prop) => {
                console.warn(`Cannot set Operator#${String(prop)}, property is read-only`);
                return this.get(target, prop);
            },
            apply: (target, self, args) => {
                return target.#func.apply(self, args);
            }
        });
    }

    /** Create a string which represents the application of this operator on the given operands.
      * If too few operands are supplied, the remaining operands will default to `""`. 
      * 
      * **Format strings**  
      * A string, `format`, can be passed when instantiating to define how this operator is formatted. 
      * The formatting algorithm works by replacing instances of certain special substrings. 
      * The special format codes which can be used are:
      * - `{1}` (, `{2}`, `{3}`, ⋯) - replaced with the first (or second, third, ⋯, *n*th) operand.
      * - `{sup: x}`, where `x` is a string - `x` is displayed as a superscript. (`x` may not contain curly braces). 
      * - `{sup: {n}}`, where `n` is a index - `{n}` is first replaced with the value of operand *n*, then displayed as a superscript.
      * To use subscripts instead, replace `sup` with `sub` e.g. `{sub: 2}
      * 
      * **Note:** `format` returns HTML code, e.g. `"log<sub>2</sub>16"`. This must be insterted into an HTML document.
      * 
      * @example 
      * new Operator("round", (a) => ⋯, "⌈{1}⌋").format(3.14)
      * >> "⌈3.14⌋"
      * new Operator("power", (a, b) => ⋯, "{1}{sup: {2}}").format(2, 24) // superscript
      * >> "2²⁴"
      * 
      * @param {number[]} args the operands for this operator
      * @returns {string} the formatted string with this operator and operands
      */
    format (...args) {
        if (args.length < this.length) {
            args.length = this.length;
        }
        if (args.length > this.length) {
            args = args.slice(0, this.length);
        }

        let result = this.formatting;
        let substOperands = result.match(/\{\d+\}/g) ?? []; // find bracketed operand substitutions like {2}.
        for (let match of substOperands) {
            let index = match.match(/\d+/)[0];
            result = result.replaceAll(match, args[+(index - 1)] ?? "");
        }
        let tags = result.match(/\{(sup|sub): (\{\d+\}|[^\}]*)\}/g) ?? [] // find super- and subscript substitutions like {sup: 3}
        for (let tag of tags) {
            let name = tag.match(/(sub|sup)/)[0];
            let content = tag.match(/(?<=\{(?:sub|sup): )(.*)(?=\})/)[0];
            result = result.replace(tag, `<${name}>${content}</${name}>`);
        }

        return result;
    }

    toString() {
        return `(Operator) ${this.name} (${Array(this.arity).fill().map((_x, i) => String.fromCodePoint(i + 97)).join(" " + this.symbol + " ")})`;
    }
}

// export {Operator};
Object.defineProperty(globalThis, "Operator", {
    value: Operator,
    writable: false,
    enumerable: false,
    configurable: false,
});