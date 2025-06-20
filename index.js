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

// § Operations

/** The list of operations supported by this calculator. */
const operations = [
    new Operation("identity", x => x, "{1} = "),
    new Operation("add", (a, b) => (a + b), "{1} + {2}"),
    new Operation("subtract", (a, b) => (a - b), "{1} - {2}"),
    // U+00D7 = "×" MULTIPLICATION SIGN
    new Operation("multiply", (a, b) => (a * b), "{1} \u00D7 {2}"), 
    new Operation("divide", (a, b) => (a / b), "{1} ÷ {2}"),
    new Operation("hundredth", (a) => (a / 100), "{1}%"),
    new Operation("square", (a) => (a ** 2), "{1}²"),
    new Operation("square-root", (a) => (a ** 0.5), "√{1}"),
    new Operation("power", (a, b) => (a ** b), "{1}{sup: {2}}"),
    new Operation("nth-root", (a, b) => (b ** (1 / a)), "{sup: {1}}{2}"),
    new Operation("scientific", (a, b) => (a * 10 ** b), "{1}\u00D710{sup: {2}}"),
    new Operation("modulus", (a, b) => (a % b), "{1} mod {2}"),
    new Operation("log10", (a) => Math.log10(a), "log{sub: 10}{1}"),
    new Operation("ln", (a) => Math.log(a), "ln {1}"),
    new Operation("logb", (a, b) => (Math.log(b) / Math.log(a)), "log{sub: {1}}{2}"),
    new Operation("sine", (a) => (Math.sin(a)), "sin({1})"),
    new Operation("cosine", (a) => (Math.cos(a)), "cos({1})"),
    new Operation("tangent", (a) => (Math.tan(a)), "tan({1})"),
    new Operation("hyperbolic-sine", (a) => (Math.sinh(a)), "sinh({1})"),
    new Operation("hyperbolic-cosine", (a) => (Math.cosh(a)), "cosh({1})"),
    new Operation("hyperbolic-tangent", (a) => (Math.tanh(a)), "tanh({1})"),
];

/** Find a operation in the `operations` array by name.
 *  @param {number | string} searchKey - The string to search for
 *  @returns {Operation} the Operation whose index or name is the same as `searchKey`
 */
Operation.search = function (searchKey) {
    for (let operation of operations) {
        if (operation.name === searchKey) {return operation;}
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
/** The operands which will be supplied to a operation. */
let operands = [],
/** The queued operation to perform when the result is requested. */
operation = Operation.search("identity"),
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
Inputting data is divided into three stages, for inputting each operand. The value of this variable is   
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
    // (disabled for debugging)
    /* operands = [];
    operation = Operation.identity;
    inputStage = 0; */
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
    operation = op;
    operands[0] = +(mainHTML());
    operands.length = 1;
    let text = operation.format(...operands);
    secondaryHTML(text);
    mainHTML("0");
    if (operation.length == 1) {
        calculate();
    }
    else {
        inputStage = 2;
    }
}

function calculate (extras = {}) {
    // Repeat mechanism - choose first or second operand depending on whether this operation is being repeated
    operands[inputStage === 0 ? 0 : 1] = +(mainHTML());
    // ensure that only the necessary operands are supplied
    operands.length = operation.length;
    // prepare for special percentage calculation
    if (extras.percentage) {
        extras.ogo2 = operands[1]; // "ogo2" = "OriGinal Operand2"
        operands[1] = operands[0] * (operands[1] / 100);
    }
    
    operands.length = operation.length;
    let result = operation.apply(operation, operands);
    result = round(result, 12);
    mainHTML(result);

    if (extras.percentage) {
        operands[1] = extras.ogo2 + "%";
    }
    let text = operation.format.apply(operation, operands);
    secondaryHTML(text);
    if (operation.name == "divide" && operands[1] == 0) {
        mainHTML("undefined");
        operation = Operation.empty;
    }

    inputStage = 0;
    set2ndf(false);
    onInput = function calculate () {blankDisplay(true, true);}
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
                prepare(secondf ? Operation.search(second) : Operation.search(button.id));
            };
            break;
        case "percentage":
            handler = () => {
                if (secondf) {
                    prepare(Operation.search("scientific"));
                }
                else if (inputStage === 1) {
                    prepare(Operation.search("hundredth"));
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
                secondf ? prepare(Operation.search("scientific")) : input(".");
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
            if (Operation.search(button.id)) {
                handler = (event) => {prepare(Operation.search(event.target.id))};
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