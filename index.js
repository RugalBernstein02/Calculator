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
function innerText (elem, value) {
    if (!(elem instanceof HTMLElement)) {elem = document.getElementById(elem)}
    const old = elem.innerText;
    if (value != undefined) {
        elem.innerText = value;
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

// § variables and constants

/** A function which does nothing. Used as a default or substitute value where a function is required. */
const NO_OP = () => {};
/** The operands which will be supplied to a operation. */
let operands = [],
/** The queued operation to perform when the result is requested. */
operation = Operation.empty,
/** True if the "m" key is being pressed/held, used to make the memory keys work. */
mDown = false,
/** `true` if second function mode is enabled. 
 *  2ndf mode allows the user to toggle between two set of functions on the same key 
 *  (much like the Shift key toggles between two sets of characters). */
secondf = false,
/** The function to call the next time something is entered */
oninput = NO_OP,
/** The current stage of input. 
Inputting data is divided into three stages, for inputting each operand. The value of this variable is   
- 0 if no data has been entered yet,  
- 1 if the user is entering the first operand, and  
- 2 if the user is entering the second operand. */
inputStage = 0,
/** The container which holds buttons for extra buttons like sin, floor and ln. */
moreDialog = document.querySelector("#more-dialog"),
/** The container which holds buttons for basic buttons like digits, addition and clear. */
buttonContainer = document.querySelector("#button-container");

// § Operations

/** The list of operations supported by this calculator. */
const operations = [
    new Operation("add", '+', (a, b) => (a + b)),
    new Operation("subtract", '-', (a, b) => (a - b)),
    // U+00D7 = "×" MULTIPLICATION SIGN
    new Operation("multiply", '\u00D7', (a, b) => (a * b)), 
    new Operation("divide", '÷', (a, b) => (a / b)),
    new Operation("hundredth", '%', (a) => (a / 100), {"nonSpaced": true}),
    new Operation("square", '²', (a) => (a ** 2), {"nonSpaced": true}),
    new Operation("square-root", '√', (a) => (a ** 0.5), {"prefix": true, "nonSpaced": true}),
    new Operation("power", "^", (a, b) => (a ** b)),
    new Operation("nth-root", "√", (a, b) => (b ** (1 / a)), {"nonSpaced": true}),
    new Operation("scientific", 'E', (a, b) => (a * 10 ** b), {"nonSpaced": true}),
    new Operation("round", '⌈ ⌋', (a) => Math.round(a), {"nonSpaced": true, "leftRight": "⌈ ⌋"}),
    new Operation("floor", '⌊ ⌋', (a) => Math.ceil(a), {"nonSpaced": true, "leftRight": "⌊ ⌋"}),
    new Operation("ceiling", '⌈ ⌉', (a) => Math.ceil(a), {"nonSpaced": true, "leftRight": "⌈ ⌉"}),
]

/** Find a operation in the `operations` array by index in the array, name or symbol.
 *  @param {number | string} searchKey - The string to search for
 *  @returns {Operation} the Operation whose index, name or symbol is the same as `searchKey`
 */
Operation.search = function (searchKey) {
    if (searchKey in operations) {return operations[searchKey];}
    else {
        for (let operation of operations) {
            if (operation.name === searchKey ||
                operation.symbol === searchKey
             ) {return operation;}
        }
        return null;
    }
}

// § Main logic

function mainText (value) {
    const result = innerText("main-display", value);
    // fitMain.fit();
    return result;
}
function secondaryText (value) {return innerText("secondary-display", value);}

/**
 * Briefly show a value on the main display and its name (such as M (for memory) or ⲡ) on the secondary display.
 * Optionally replaces the content of the main display with `value`.
 * @param {string} name - the name to show on the secondary display
 * @param {number} value - the value to show on the main display
 * @param {boolean} overwrite - true if the main display should be overwritten
 */
function showValue (name, value, overwrite = true, timeout = 500) {
    let oldS = secondaryText();
    let oldM = mainText();
    mainText(value);
    secondaryText(name);
    setTimeout(() => {
        secondaryText(oldS);
        if (!overwrite) {
            mainText(oldM);
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
        memory.value += +(mainText());
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
    if (main) {
        mainText("0");
    }
    if (secondary) {
        secondaryText("");
    }
}

function input (char) {
    oninput();
    oninput = NO_OP;
    if (char === "." && mainText().includes(".")) {return null;}
    if (inputStage === 0) {inputStage = 1;}
    if (mainText() === "") {
        mainText(0);
    }
    if (mainText() === "0") {
        mainText((char === "." ? "0" : "") + char);
    }
    else {
        mainText(mainText().concat(char));
    }
}

function backspace () {
    if (mainText().at(-2) === ".") {
        if (mainText().length > 2) {
            mainText(mainText().substring(0, mainText().length - 2));
        }
        else {
            mainText("0");
        }
    }
    else if (mainText().length > 1) {
        mainText(mainText().substring(0, mainText().length - 1));
    }
    else {
        mainText("0");
    }
}

function clear () {
    blankDisplay(true, true);
    // Reset internal variables to their initial values
    operands = [];
    operation = Operation.empty;
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
    operation = op;
    operands[0] = +(mainText());
    operands.length = 1;
    operands.length = 2;
    let text = operation.format(...operands);
    secondaryText(text);
    mainText("0");
    if (operation.length == 1) {
        calculate();
    }
    else {
        inputStage = 2;
    }
}

function calculate (extras = {}) {

    if (operation === Operation.empty) {
        return;
    }

    // Repeat mechanism
    operands[inputStage === 0 ? 0 : 1] = +(mainText());

    operands.length = operation.length;
    
    if (extras.percentage) {
        // "ogo2" = original operand2
        extras.ogo2 = operands[1];
        operands[1] = operands[0] * (operands[1] / 100);
    }
    
    operands.length = operation.length;
    let result = operation.apply(operation, operands);
    result = round(result, 12);
    mainText(result);

    if (extras.percentage) {
        operands[1] = extras.ogo2 + "%";
    }
    let text = operation.format.apply(operation, operands);
    secondaryText(text);
    if (operation.name == "divide" && operands[1] == 0) {
        mainText("undefined");
        operation = Operation.empty;
    }

    inputStage = 0;
    set2ndf(false);
    oninput = blankDisplay;
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
                secondf ? prepare(Operation.search("scientific")) : input('.');
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
        case "round":
        case "ceiling":
        case "floor":
            handler = (event) => {prepare(Operation.search(event.target.id))};
            break;
        default:
            console.warn("No handler for \"" + button.id + "\"");
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
    else if (key === "Enter") {
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