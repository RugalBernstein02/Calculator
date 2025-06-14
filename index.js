// TODO: Add import statement for fitty

fitty(document.querySelector("#main-display")); // fitty is included in a module

function round (x, n) {
    return Math.round(x * (10 ** n)) / (10 ** n);
}

let operand1, // The first operand supplied to a binary operation 
operand2, // The second operand supplied to a binary operation
operation = null, // The queued operation to perform when result is requested
lastFunc, // the last function which was called, used to decide whether to clear the main display and/or the currentExpression display 
mDown = false, // The value representing whether the "m" key is being pressed/held, used to make the multi-key feature work.
repeat, // The repeat operation to perform if the equals key is pressed.
inputStage = 1, // The current stage of input. Inputting data is divided into two stages, for inputting each operand. This variable is 1 if the user is entering the first operand, and 2 if the user is entering the second operand, or has just completed an operation.
blankFlag = false; // Flag which controls the automatic blanking of the main display.

function innerText (elemId, value) {
    const old = document.getElementById(elemId).innerText;
    if (value != undefined) {
        document.getElementById(elemId).innerText = value;
    }
    return old;
}

function mainText (value) {
    const result = innerText("main-display", value);
    
    return result;
}
function secondaryText (value) {return innerText("secondary-display", value);}

function attribute (elemId, attr, value) {
    const old = document.getElementById(elemId).getAttribute(attr);
    if (value != undefined) {
        document.getElementById(elemId).setAttribute(attr, value);
    }
    return old;
} 

/** Clear the displays. To clear a display, pass `true` for the relevant argument, or `false` to preserve it. The default for both parameters is `true`.
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

const operationSymbols = {
    "add": "+",
    "subtract": "-",
    "divide": "÷",
    "multiply": "✕",
}

const memory = {
    "value": 0, // The value currently stored in memory
    "recall": () => { // Show the value in memory
        let old = secondaryText();
        secondaryText(`M = `);
        setTimeout(() => {
            secondaryText(old);
        }, 50);
        mainText(memory.value);
        if (memory.value === 0) {
            memory.lcd.classList.replace("on", "off");
        }
        else {
            memory.lcd.classList.replace("off", "on");
        }
        blankFlag = true;
        lastFunc = "memory.recall";
    }, 
    "add": () => {
        memory.value += +(mainText());
        memory.recall();
        lastFunc = "memory.add";
    },
    "clear": () => {
        memory.value = 0;
        memory.recall();
        lastFunc = "memory.clear";
    },
    "recallBtn": document.querySelector("#memory-recall"),
    "clearBtn": document.querySelector("#memory-clear"),
    "addBtn": document.querySelector("#memory-add"),
    "lcd": document.querySelector("#memory-lcd"),
}

function inputDigit (digit) {
    if (blankFlag) {
        blankDisplay(true, false /*true*/); // Do not enable clearing both displays without first implementing state management.
        blankFlag = !blankFlag;
    }
    if (mainText() === "0") {
        mainText(digit);
    }
    else {
        mainText(mainText().concat(digit));
    }
    lastFunc = "inputDigit";
}

function inputDecimal () {
    if (!mainText().includes(".")) {
        if (blankFlag) {
            secondaryText("");
            blankFlag = !blankFlag;
        }
        if (mainText() === "") {
            mainText(0);
        }
        mainText(mainText().concat("."));
        lastFunc = "inputDecimal";
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
    operand1 = undefined;
    operand2 = undefined;
    operation = undefined;
    inputStage = 1;
    blankFlag = false;
    lastFunc = "clear";
}

function prepare (op) {
    inputStage = 2;
    operand1 = +(mainText());
    operation = op;
    secondaryText(`${operand1} ${operationSymbols[operation]}`);
    mainText("0");
    lastFunc = "prepare";
}

function calculate (extras = {}) {
    if (operation == undefined && operand1 == undefined) {
        console.debug(new Error("operand1 && operation are undefined."));
        return;
    }
    if (inputStage !== 1) {
        operand2 = +(mainText());
    }
    if (extras.percentage) {
        extras.ogo2 = operand2; // "ogo2" = original operand2
        operand2 = operand1 * (operand2 / 1000);
    }
    let result;
    switch (operation) {
        case "add": result = operand1 + operand2; break;
        case "subtract": result = operand1 - operand2; break;
        case "multiply": result = operand1 * operand2; break;
        case "divide": 
            if (operand2 == 0) {
                mainText("undefined");
                operation = undefined;
                blankFlag = true;
                return;
            }
            result = operand1 / operand2; 
            break;
        default:
            console.warn(new Error("Unknown operation " + operation));
    }
    result = round(result, 12);
    secondaryText(`${operand1} ${operationSymbols[operation]} ${extras.percentage ? extras.ogo2 + "%" : operand2}`);
    mainText(result);
    operand1 = result;
    inputStage = 1;
    blankFlag = true;
    lastFunc = "calculator";
}

// Event handlers
//   Handle onscreen button input
document.querySelectorAll(".calc-button").forEach(button => {
    if (button.classList.contains("digit")) {
        button.addEventListener("click", event => {
            inputDigit(+event.target.name);
        });
    }
    else {
        let handler;
        switch (button.id) {
            case "add": 
            case "subtract": 
            case "multiply": 
            case "divide": 
                handler = () => {prepare(button.id)};
                break;
            case "percentage":
                handler = () => {
                    if (inputStage === 1) {
                        mainText(mainText() / 100);
                    }
                    else if (inputStage === 2) { // (inputStage === 1)
                        calculate({percentage: true});
                    }
                };
                break;
            case "decimal":
                handler = inputDecimal;
                break;
            case "clear":
                handler = clear;
                break;
            case "result":
                handler = calculate;
                break;
                break;
            case "memory-add":
                handler = memory.add;
                break;
            case "memory-recall":
                handler = memory.recall;
                break;
            case "memory-clear":
                handler = memory.clear;
                break;
        }
        button.addEventListener("click", handler);
    }
});

//  Handle physical keyboard input
document.addEventListener("keydown", (event) => {
    const key = event.key;
    if (key === "m") {
        mDown = true;
    }
    console.debug({"event": event, "key": key, "mDown": mDown});
    // if key is digit
    if (+key || key === "0") {
        document.getElementById(`digit-${key}`).click();
    }
    else if (key === "x") {
        document.getElementById("clear").click();
    }
    else if (key === "/" || key == "\\") {
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
            document.getElementById("clear").click();
        }
    }
});