// Mateo Joubert
"use strict";

function parseExtras (extras) {
    if (!extras) {return {};}
    const capitalize = x => x[0].toUpperCase().concat(x.slice(1));
    const keys = ["prefix", "nonSpaced"];
    let isArray = Array.isArray(extras);
    const result = {};
    for (let key of keys) {
        result["is" + capitalize(key)] = isArray ? extras.includes(key) : Boolean(extras[key]);
    }
    return result;
}

/**
 * An Operation represents a function which accepts one or more numbers (known as operands) and transforms them according to some well-defined rule.
 * The Operation class provides an extensible framework for defining new calculator operations, and was created to replace the existing methodology of hard-coding operations.
 * @example
 * add = new Operation("add", "+", (a, b) => a + b)
 * add(2, 3)
 * >> 5

 */
let Operation = class Operation extends Function {
    #name; #func;
    /** True if this operator should be formatted as a prefix operator. 
      * Prefix operators appear before their operands e.g. "-6" and "√2". 
      * Only unary operators can be prefix. */
     isPrefix;
     /** True if this operator should be formatted without spaces around it. e.g "3√2" instead of "3 √ 2". */
    isNonSpaced;
    /**
     * @param {string} name - The name of this operation
     * @param {string} symbol - The symbol which represents this operation
     * @param {(...operands: number[]) => number} func - The function to call when this operation is called. Must be a pure function.
     * @param {string[] | {prefix?: true, nonSpaced?: true}} extras - Any extra options to add for changing how this operation is formatted. 
     * An option is considered to be enabled if it is included in `extras` (if `extras` is an array) or if the value associated with that option's key evaluates to `true` (if `extras` is an Object)
     * @see Operation.isPrefix
     * @see Operation.isNonSpaced
     * @returns A new Operation.
     */
    constructor(name, symbol, func, extras) {
        super(func);
        this.#name = name;
        this.symbol = symbol;
        this.#func = func;
        Object.assign(this, parseExtras(extras));
        return new Proxy(this, {
            get: (target, prop) => {
                if (prop === "name") { return target.#name; }
                else if (prop === "arity" || prop === "length") {
                    return target.#func.length;
                }
                else { return target[prop]; };
            },
            set: (target, prop) => {
                console.warn(`Cannot set Operation#${String(prop)}, property is read-only`);
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
      * @example
      * multiply.format(2, 3)
      * >> "2 × 3"  
      * squareRoot.format(6)
      * >> "√6"
      * add.format(4)
      * >> "4 + "
      * 
      * @param {number[]} args - the operands for this operation
      */
    format (...args) {
        if (args.length < this.length) {
            args.length = this.length;
        }
        if (args.length > this.length) {
            args = args.slice(0, this.length);
        }
        // Special-case unary operations
        if (this.length === 1) {
            if (this.isPrefix) {
                return `${this.symbol}${this.isNonSpaced ? "" : " "}${args[0]}`;
            }
            else {
                return `${args[0]}${this.isNonSpaced ? "" : " "}${this.symbol}`;
            }
        }
        let joiner = this.isNonSpaced ? this.symbol : " " + this.symbol + " ";
        return args.join(joiner);
    }

    toString() {
        return `(Operation) ${this.name} (${Array(this.arity).fill().map((_x, i) => String.fromCodePoint(i + 97)).join(" " + this.symbol + " ")})`;
    }
    /** An operation which does nothing. Used as a default or substitute value where a operation is required. */
    static empty = new Operation("empty", "␀", () => {});
}

// export {Operation};
Object.defineProperty(globalThis, "Operation", {
    value: Operation,
    writable: false,
    enumerable: false,
    configurable: false,
});