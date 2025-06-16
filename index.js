"use strict";

const fitMain = fitty(document.querySelector("#main-display"));
fitMain.freeze();

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
/** The first operand supplied to a binary operation. */
let operand1,
/** The second operand supplied to a binary operation. */
operand2,
/** The queued operation to perform when the result is requested. */
operation = Operation.empty,
/** The value representing whether the "m" key is being pressed/held, used to make the multi-key feature work. */
mDown = false,
/** `true` if second function mode is enabled */
secondf = false,
/** The function to call the next time something is entered */
oninput = NO_OP,
/** The current stage of input. 
Inputting data is divided into three stages, for inputting each operand. The value of this variable is:
0 if no data has been entered yet,  
1 if the user is entering the first operand, and  
2 if the user is entering the second operand. */
inputStage = 0;

// § Operations

const operations = [
    new Operation("add", '+', (a, b) => (a + b)),
    new Operation("subtract", '-', (a, b) => (a - b)),
    new Operation("multiply", '×', (a, b) => (a * b)),
    new Operation("divide", '÷', (a, b) => (a / b)),
    new Operation("hundredth", '%', (a) => (a / 100)),
    new Operation("square", '²', (a) => (a ** 2)),
    new Operation("square-root", '√', (a) => (a ** 0.5), ["prefix", "nonspaced"]),
    new Operation("power", "^", (a, b) => (a ** b)),
    new Operation("nth-root", "√", (a, b) => (b ** (1 / a)), ["nonspaced"]),
    new Operation("scientific", 'E', (a, b) => (a * 10 ** b), ["nonspaced"]),
]

/** Find a operation in the `operations` array by index in the array, name or symbol.
 *  @param {string} searchKey - The string to search for
 *  @returns {Operation} the Operation whose index, name or symbol is the same as `searchKey`
 */
Operation.resolve = function (searchKey) {
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

// § Basic functions for interacting with the display

const memory = {
    "value": 0, // The value currently stored in memory
    "recall": () => { // Show the value in memory
        let old = secondaryText();
        secondaryText(`M = `);
        setTimeout(() => {
            secondaryText(old);
        }, 500);
        mainText(memory.value);
        if (memory.value === 0) {
            memory.lcd.classList.replace("on", "off");
        }
        else {
            memory.lcd.classList.replace("off", "on");
        }
    }, 
    "add": () => {
        memory.value += +(mainText());
        memory.recall();
    },
    "clear": () => {
        memory.value = 0;
        memory.recall();
    },
    "lcd": document.querySelector("#memory-lcd"),
}

function mainText (value) {
    const result = innerText("main-display", value);
    // fitMain.fit();
    return result;
}
function secondaryText (value) {return innerText("secondary-display", value);}

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
        mainText(char);
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
    operand1 = undefined;
    operand2 = undefined;
    operation = undefined;
    inputStage = 0;
}

function set2ndf (enabled) {
    secondf = typeof enabled === "boolean" ? enabled : !secondf;
    document.querySelector("#second-function").innerHTML = secondf ? "basic" : "2<sup>nd</sup>f";
    document.querySelectorAll("*[data-secondf]").forEach(elem => {
        if (secondf) {
            let s = attribute(elem, "data-secondf").split(" ")[1];
            elem.innerHTML = s;
        }
        else {
            elem.innerText = attribute(elem, "data-symbol");
        }
    });
}

function prepare (op) {
    inputStage = 2;
    operand1 = +(mainText());
    operation = op;
    let text = "";
    if (operation.isPrefix) {text += operation.symbol + " ";}
    text += operand1 + " ";
    if (!operation.isPrefix) {text += operation.symbol + " ";}
    secondaryText(text);
    mainText("0");
    if (operation.arity == 1) {calculate();}
}

function calculate (extras = {}) {
    // Repeat mechanism
    // inputStage is only set to 1 after input, 
    // therefore, if it is instead 0, that means that we have just returned from calculate.
    if (inputStage === 0) {
        operand1 = +(mainText());
    }
    else {
        operand2 = +(mainText());
    }

    if (operation.length >= 2) {
        if (extras.percentage) {
            extras.ogo2 = operand2; // "ogo2" = original operand2
            operand2 = operand1 * (operand2 / 100);
        }
    }
    else {
        operand2 = undefined;
    }
    let text = operation.format(operand1, operand2);
    let result = operation(operand1, operand2);
    result = round(result, 12);
    mainText(result);
    secondaryText(text);
    if (operation.name == "divide" && operand2 == 0) {
        mainText("undefined");
        operation = undefined;
    }
    inputStage = 0;
    oninput = blankDisplay;
}

// § Event handlers

//   Handle onscreen button input
document.querySelectorAll(".calc-button").forEach(button => {
    if (button.classList.contains("digit")) {
        button.onclick = event => {
            input(+event.target.name);
        };
        return;
    }
    let handler;
    switch (button.id) {
        case "add": 
        case "subtract": 
            handler = () => {prepare(Operation.resolve(button.id))};
            break;
        case "divide": 
        case "multiply": 
            handler = () => {
                let second = attribute(button, "data-secondf")?.split(" ")[0];
                prepare(secondf ? Operation.resolve(second) : Operation.resolve(button.id));
            };
            break;
        case "percentage":
            handler = () => {
                if (inputStage === 1) {
                    prepare(Operation.resolve("hundredth"));
                }
                if (inputStage === 2) {
                    calculate({percentage: true});
                }
            };
            break;
        case "correction":
            handler = () => {blankDisplay(true, false);};
            break;
        case "decimal":
            handler = () => {
                secondf ? prepare(Operation.resolve("scientific")) : input('.');
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