// by Mateo Joubert
"use strict";

function parseExtras (extras) {
    if (!extras) {return {};}
    const capitalize = x => x[0].toUpperCase().concat(x.slice(1));
    const options = [
        "(boolean) prefix",
        "(boolean) nonSpaced",
        "(string) leftRight",
        "(function) custom"
    ];
    const result = {};
    for (let option of options) {
        let type = option.match(/(?<=\()[a-z]+(?=\))/)[0];
        let name = option.match(/[a-zA-Z]+$/)[0];
        switch (typeof option) {
            case "boolean":
                result["is" + capitalize(name)] = Boolean(extras[name]);
            case "string":
                result[name] = String(extras[name]);
            default:
                result[name] = extras[name];
        }
    }
    return result;
}

/**
 * An Operation represents a function which accepts one or more numbers (operands) and transforms them according to some well-defined rule.
 * The Operation class provides an easily extensible framework for defining new calculator operations, and was created to replace the existing methodology of hard-coding operations.
 */
let Operation = class Operation extends Function {
    #name; #func;
    /****Unary operators only:**
     * True if this operator should be formatted as a prefix operator. 
     * Prefix operators appear before their operands e.g. "-6" and "√2".  */
    isPrefix = false;
    /** True if this operator should be formatted without spaces around it e.g "3√2" instead of "3 √ 2". */
    isNonSpaced = false;
    /** **Unary operators only:** The characters to surround the operand with, separated by a space.  
     *  For example, suppose `o` is an operation whose `leftRight` option is `"\ /"`. Calling `o.format(42)` results in `\42/`.  
     *  `leftRight` must consist of two groups of characters separated by one space.
     *  In other words, it must be of the form /`.* .*`/  
     *  `leftRight` cannot be used with `prefix`; if both are enabled, `leftRight` will take precedence. */
    leftRight;
    /** A custom function for formatting. 
     *  When `format` is called, it will call this function as a callback and return the result. 
     *  No other formatting or modification will be applied. */
    custom;
    /**
     * @param {string} name - The name of this operation
     * @param {string} symbol - The symbol which represents this operation
     * @param {(...operands: number[]) => number} func - The function to call when this operation is called. Must be a pure function.
     * @param {{ prefix?: true, nonSpaced?: true, leftRight?: string, custom?: (...operands: number[]) => string}} extras - Any extra options to add for changing how this operation is formatted. 
     * @see Operation.isPrefix
     * @see Operation.isNonSpaced
     * @see Operation.leftRight
     * @see Operation.custom
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

        if (this.custom) {
            return this.custom(...args);
        }

        // Special cases for unary operations
        if (this.length === 1) {
            if (this.leftRight) {
                let leftRight = this.leftRight.split(" ");
                return leftRight[0] +
                    (this.isNonSpaced ? "" : " ") +
                    args[0] +
                    (this.isNonSpaced ? "" : " ") +
                    leftRight[1];
            }
            else if (this.isPrefix) {
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