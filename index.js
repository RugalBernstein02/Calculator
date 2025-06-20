"use strict";

// § helper functions 

/** Round a number off to the given number of decimal places
  * @example round(Math.PI, 6) => 3.141593
  * @param {number} x - the number to round off
  * @param {number} n - the number of decimal places to round to
  */
function round (x, n) {
    return Math.round(x * (10 ** n)) / (10 ** n);
}

/** Round a number off to the given number of significant figures
  * @example round(Math.PI * 100, 3) => 314.159
  * @param {number} x - the number to round off
  * @param {number} n - the number of significant figures to round to
  */
function sigfigs (x, n) {
    if (x === 0) {return 0;}
    const p = n - Math.ceil(Math.log10(Math.abs(x)));
    if (p < 1) {return Math.floor(x);}
    return Math.floor(x) + round(x - Math.floor(x), p);
}

/** Set the `innerText` property of an element, and return its old value.  
 *  Does not change the `innerText` if `value` is undefined.  
 *  @param {string | HTMLElement} elem - the id or DOM object for the target element
 *  @param {string | undefined} value - the new `innerText` to assign to the element, or undefined to leave it as is
 *  @returns the `innerText` of the element before it was changed
 */
function innerHTML (elem, value) {
    if (!(elem instanceof HTMLElement)) {elem = document.getElementById(elem)}
    const old = elem.innerHTML;
    if (value != undefined) {
        elem.innerHTML = value;
    }
    return old;
}

/** Set the value of an attribute of an element, and return its old value.  
 *  Does not change the attribute if `value` is undefined.  
 *  @param {string | HTMLElement} elem - the id or DOM object for the target element
 *  @param {string} attr - the name of the attribute to change
 *  @param {string | undefined} value - the new `innerText` to assign to the element, or undefined to leave it as is
 *  @returns the `innerText` of the element before it was changed
 */
function attribute (elem, attr, value) {
    if (!(elem instanceof HTMLElement)) {elem = document.getElementById(elem);}
    const old = elem.getAttribute(attr);
    if (value != undefined) {
        elem.setAttribute(attr, value);
    }
    return old;
}

// § Operators

/** The list of operators supported by this calculator. */
// Some operators use ⛶ (U+2646 FOUR CORNERS) as a placeholder.
const operators = [
    new Operator("identity", x => x, "{1} = "),
    new Operator("add", (a, b) => (a + b), "{1} + {2}"),
    new Operator("subtract", (a, b) => (a - b), "{1} - {2}"),
    // U+00D7 = "×" MULTIPLICATION SIGN
    new Operator("multiply", (a, b) => (a * b), "{1} \u00D7 {2}"), 
    new Operator("divide", (a, b) => (a / b), "{1} ÷ {2}"),
    new Operator("hundredth", (a) => (a / 100), "{sup: {1}}/{sub: 100}"),
    new Operator("square", (a) => (a ** 2), "{1}²"),
    new Operator("square-root", (a) => (a ** 0.5), "√{1}"),
    new Operator("power", (a, b) => (a ** b), "{1}{sup: {2|⛶}}"),
    new Operator("nth-root", (a, b) => (b ** (1 / a)), "{sup: {1}}√{2|⛶}"),
    new Operator("scientific", (a, b) => (a * 10 ** b), "{1}\u00D710{sup: {2|⛶}}"),
    new Operator("modulus", (a, b) => (a % b), "{1} mod {2}"),
    new Operator("log10", (a) => Math.log10(a), "log{sub: 10}{1}"),
    new Operator("ln", (a) => Math.log(a), "ln {1}"),
    new Operator("logb", (a, b) => (Math.log(b) / Math.log(a)), "log{sub: {1}}{2|⛶}"),
    new Operator("sine", (a) => (Math.sin(a)), "sin({1})"),
    new Operator("cosine", (a) => (Math.cos(a)), "cos({1})"),
    new Operator("tangent", (a) => (Math.tan(a)), "tan({1})"),
    new Operator("hyperbolic-sine", (a) => (Math.sinh(a)), "sinh({1})"),
    new Operator("hyperbolic-cosine", (a) => (Math.cosh(a)), "cosh({1})"),
    new Operator("hyperbolic-tangent", (a) => (Math.tanh(a)), "tanh({1})"),
];

/** Find a operator in the `operators` array by name.
 *  @param {number | string} searchKey - The string to search for
 *  @returns {Operator} the Operator whose index or name is the same as `searchKey`
 */
Operator.search = function (searchKey) {
    for (let operator of operators) {
        if (operator.name === searchKey) {return operator;}
    }
    return null;
}

// § constants and variables

/** A function which does nothing. Used as a default or substitute value where a function is required. */
const NO_OP = () => {},
/** The container which holds buttons for extra buttons like sin, floor and ln. */
moreDialog = document.querySelector("#more-dialog"),
/** The container which holds buttons for basic buttons like digits, addition and clear. */
buttonContainer = document.querySelector("#button-container");
/** The operands which will be supplied to a operator. */
let operands = [],
/** The queued operator to perform when the `=` key is pressed. */
operator = Operator.search("identity"),
/** True if the "m" key is being pressed/held, used to make memory key combinations (e.g. M + A) work. 
 *  See README#Keyboard Input.
 */
mDown = false,
/** `true` if second function mode is enabled. 
 *  2ndf mode allows the user to toggle between two set of functions on the same key 
 *  (much like the Shift key toggles between two sets of characters). */
secondf = false,
/** The function to call the next time something is entered */
onInput = NO_OP,
/** The current stage of input. 
The process of entering data is divided into three stages. The value of this variable is   
- 0 if no data has been entered yet,  
- 1 if the user is entering the first operand, and  
- 2 if the user is entering the second operand. */
inputStage = 0;

// § Main logic

function mainHTML (value) {
    const result = innerHTML("main-display", value);
    // fitMain.fit();
    return result;
}
function secondaryHTML (value) {return innerHTML("secondary-display", value);}

/**
 * Briefly show a value on the main display and its name (such as M (for memory) or ⲡ) on the secondary display.
 * Optionally replaces the content of the main display with `value`.
 * @param {string} name - the name to show on the secondary display
 * @param {number} value - the value to show on the main display
 * @param {boolean} overwrite - true if the main display should be overwritten
 */
function showValue (name, value, overwrite = true, timeout = 500) {
    let oldS = secondaryHTML();
    let oldM = mainHTML();
    mainHTML(value);
    secondaryHTML(name);
    setTimeout(() => {
        secondaryHTML(oldS);
        if (!overwrite) {
            mainHTML(oldM);
        }
    }, timeout);
}

const memory = {
    "value": 0, // The value currently stored in memory
    "recall": (overwrite = true) => { // Show the value in memory
        showValue("Memory", memory.value, overwrite);
        if (memory.value === 0) {
            memory.lcd.classList.replace("on", "off");
        }
        else {
            memory.lcd.classList.replace("off", "on");
        }
    }, 
    "add": () => {
        memory.value += +(mainHTML());
        memory.recall(false);
    },
    "clear": () => {
        memory.value = 0;
        memory.recall(false);
    },
    "lcd": document.querySelector("#memory-lcd"),
}

/** Clear the displays. To clear a display, pass `true` for the relevant argument, or `false` to preserve its current text. The default for both parameters is `true`.
 *  @param {boolean} [main = true] - whether to clear the main display
 *  @param {boolean} [secondary = true] - whether to clear the secondary display
 */
function blankDisplay (main = true, secondary = true) {
    if (main) {mainHTML("0");}
    if (secondary) {secondaryHTML("");}
}

function input (char) {
    onInput();
    onInput = NO_OP;
    if (char === "." && mainHTML().includes(".")) {return null;}
    if (inputStage === 0) {inputStage = 1;}
    if (mainHTML() === "") {
        mainHTML(0);
    }
    if (mainHTML() === "0") {
        mainHTML((char === "." ? "0" : "") + char);
    }
    else {
        mainHTML(mainHTML().concat(char));
    }
}

function backspace () {
    if (mainHTML().at(-2) === ".") {
        if (mainHTML().length > 2) {
            mainHTML(mainHTML().substring(0, mainHTML().length - 2));
        }
        else {
            mainHTML("0");
        }
    }
    else if (mainHTML().length > 1) {
        mainHTML(mainHTML().substring(0, mainHTML().length - 1));
    }
    else {
        mainHTML("0");
    }
}

function clear () {
    blankDisplay(true, true);
    // Reset internal variables to their initial values
    operands = [];
    operator = Operator.identity;
    inputStage = 0;
}

function set2ndf (enabled) {
    secondf = typeof enabled === "boolean" ? enabled : !secondf;
    let f = b => b ? "on" : "off";
    document.querySelector("#second-function").classList.replace(f(!secondf), f(secondf));
    document.querySelectorAll("*[data-secondf]").forEach(elem => {
        if (secondf) {
            let s = attribute(elem, "data-secondf").split(/(?<!\\) /)[1];
            elem.innerHTML = s;
        }
        else {
            elem.innerText = attribute(elem, "data-symbol");
        }
    });
}

function prepare (op) {
    operator = op;
    operands[0] = +(mainHTML());
    operands.length = 1;
    let text = operator.format(...operands);
    secondaryHTML(text);
    if (operator.length == 1) {
        calculate();
    }
    else {
        mainHTML("0");
        inputStage = 2;
    }
}

function calculate (extras = {}) {
    // Repeat mechanism - choose first or second operand depending on whether this operator is being repeated
    operands[inputStage === 0 ? 0 : 1] = +(mainHTML());
    // ensure that only the necessary operands are supplied
    operands.length = operator.length;
    // prepare for special percentage calculation
    if (extras.percentage) {
        extras.ogo2 = operands[1]; // "ogo2" = "OriGinal Operand2"
        operands[1] = operands[0] * (operands[1] / 100);
    }
    
    operands.length = operator.length;
    let result = operator.apply(operator, operands);
    result = sigfigs(result, 11);
    mainHTML(result);

    if (extras.percentage) {
        operands[1] = extras.ogo2 + "%";
    }
    let text = operator.format.apply(operator, operands);
    secondaryHTML(text);
    if (operator.name == "divide" && operands[1] == 0) {
        mainHTML("undefined");
        operator = Operator.empty;
    }

    inputStage = 0;
    set2ndf(false);
    onInput = blankDisplay;
}

// § Event handlers

//  Handle onscreen button input
document.querySelectorAll(".calc-button").forEach(button => {
    if (button.classList.contains("digit")) {
        button.onclick = event => {
            input(+event.target.innerText);
        };
        return;
    }
    let handler;
    switch (button.id) {
        case "add": 
        case "subtract": 
        case "divide": 
        case "multiply": 
            handler = () => {
                let second = attribute(button, "data-secondf")?.split(" ")[0];
                prepare(secondf ? Operator.search(second) : Operator.search(button.id));
            };
            break;
        case "percentage":
            handler = () => {
                if (secondf) {
                    prepare(Operator.search("scientific"));
                }
                else if (inputStage < 2) {
                    prepare(Operator.search("hundredth"));
                }
                else if (inputStage === 2) {
                    calculate({percentage: true});
                }
            };
            break;
        case "correction":
            handler = () => {blankDisplay(true, false);};
            break;
        case "decimal":
            handler = () => {
                secondf ? prepare(Operator.search("scientific")) : input(".");
            };
            break;
        case "clear-all":
            handler = clear; break;
        case "result":
            handler = calculate; break;
        case "memory-add":
            handler = memory.add; break;
        case "memory-recall":
            handler = memory.recall; break;
        case "memory-clear":
            handler = memory.clear; break;
        case "second-function":
            handler = set2ndf; break;
        case "more-button":
            handler = () => {
                buttonContainer.style.display = "none";
                moreDialog.style.display = "grid"; 
            };
            break;
        case "return":
            handler = () => {
                buttonContainer.style.display = "grid";
                moreDialog.style.display = "none"; 
            };
            break;
        case "pi":
            handler = () => {showValue("π", 3.141592654, true)};
            break;
        case "euler":
            // U+212F = ℯ SCRIPT SMALL LETTER E
            handler = () => {showValue("\u212f", 2.718281828, true)};
            break;
        default:
            if (Operator.search(button.id)) {
                handler = (event) => {prepare(Operator.search(event.target.id))};
            }
            else {
                console.warn("Did not set handler for \"" + button.id + "\"");
            }
    }
    button.addEventListener("click", handler);
});

//  Handle physical keyboard input
document.addEventListener("keydown", (event) => {
    const key = event.key;
    if (key === "m") {
        mDown = true;
    }

    if (+key || key === "0") {
        // key is digit
        document.getElementById(`digit-${key}`).click();
    }
    else if (key === "x") {
        document.getElementById("clear-all").click();
    }
    else if (key === "/") {
        event.preventDefault();
        document.getElementById("divide").click();
    }
    else if (key === "*") {
        document.getElementById("multiply").click();
    }
    else if (key === "+") {
        if (mDown) {
            document.getElementById("memory-add").click();
        }
        else {
            document.getElementById("add").click();
        }
    }
    else if (key === "-") {
        document.getElementById("subtract").click();
    }
    else if (key === ".") {
        document.getElementById("decimal").click();
    }
    else if (key === "Enter" || key == "=") {
        document.getElementById("result").click();
    }
    else if (key === "Backspace") {
        event.preventDefault();
        backspace();
    }
    else if (key == "r" && mDown) {
        document.getElementById("memory-recall").click();
    }
    else if (key == "c") {
        if (mDown) {
            document.getElementById("memory-clear").click();
        }
        else {
            document.getElementById("correction").click();
        }
    }
    
});