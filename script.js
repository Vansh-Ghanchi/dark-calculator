let expression = "";

// this helps me know if = was just pressed
let pressedEquals = false;

// grabbing the display elements
let topDisplay = document.getElementById("expression");
let bottomDisplay = document.getElementById("result");
let displayBox = document.querySelector(".display");


// this just refreshes what's shown on screen
function updateDisplay() {
    if (expression == "") {
        topDisplay.textContent = "0";
    } else {
        topDisplay.textContent = expression;
    }

    bottomDisplay.textContent = showPreview();

    // make the font smaller if the number gets too long
    if (expression.length > 12) {
        topDisplay.style.fontSize = "1.4rem";
    } else if (expression.length > 8) {
        topDisplay.style.fontSize = "1.7rem";
    } else {
        topDisplay.style.fontSize = "2rem";
    }
}


// shows a live result below while typing
function showPreview() {
    // not enough to calculate yet
    if (expression.length < 3) return "";

    try {
        let str = expression
            .replace(/÷/g, "/")
            .replace(/×/g, "*")
            .replace(/−/g, "-");

        let ans = eval(str);

        if (ans !== undefined && !isNaN(ans)) {
            return "= " + cleanNumber(ans);
        }
    } catch (err) {
        // expression is probably incomplete, just ignore
    }

    return "";
}


// removes ugly long decimals like 0.1000000001
function cleanNumber(n) {
    if (n.toString().includes(".")) {
        return parseFloat(n.toFixed(10)).toString();
    }
    return n.toString();
}


// called when a number button is clicked
function inputNumber(num) {
    if (pressedEquals) {
        expression = "";
        pressedEquals = false;
    }

    // don't let it start with multiple zeros
    if (expression === "0" && num !== ".") {
        expression = num;
    } else {
        expression += num;
    }

    updateDisplay();
}


// adds a decimal point
function inputDecimal() {
    if (pressedEquals) {
        expression = "0";
        pressedEquals = false;
    }

    // split by operators to check the last number part
    let parts = expression.split(/[+\-×÷−]/);
    let lastPart = parts[parts.length - 1];

    // already has a dot, don't add another one
    if (lastPart.includes(".")) return;

    if (expression === "") {
        expression = "0";
    }

    expression += ".";
    updateDisplay();
}


// called when an operator button (+, -, etc.) is clicked
function inputOperator(op) {
    if (expression === "" && op !== "−") return;

    let last = expression.slice(-1);
    let ops = ["+", "−", "×", "÷"];

    // replace the last operator if user clicked another one right after
    if (ops.includes(last)) {
        expression = expression.slice(0, -1) + op;
    } else {
        expression += op;
    }

    pressedEquals = false;
    updateDisplay();
}


// backspace — removes the last character
function clearLast() {
    if (pressedEquals) {
        allClear();
        return;
    }

    expression = expression.slice(0, -1);
    updateDisplay();
}


// clears everything
function allClear() {
    expression = "";
    pressedEquals = false;
    displayBox.classList.remove("error");
    updateDisplay();
}


// the = button logic
function calculate() {
    if (expression === "") return;

    let ops = ["+", "−", "×", "÷"];
    let lastChar = expression.slice(-1);

    // don't calculate if it ends with an operator
    if (ops.includes(lastChar)) return;

    try {
        let str = expression
            .replace(/÷/g, "/")
            .replace(/×/g, "*")
            .replace(/−/g, "-");

        let answer = eval(str);

        // division by zero check
        if (!isFinite(answer)) {
            showError("Can't divide by 0!");
            return;
        }

        if (isNaN(answer)) {
            showError("Something went wrong");
            return;
        }

        bottomDisplay.textContent = "";
        expression = cleanNumber(answer);
        pressedEquals = true;
        updateDisplay();

    } catch (e) {
        showError("Error!");
    }
}


// shows a red error and shakes the display
function showError(msg) {
    expression = "";
    topDisplay.textContent = msg;
    bottomDisplay.textContent = "";

    // remove and re-add the class so animation restarts
    displayBox.classList.remove("error");
    void displayBox.offsetWidth;
    displayBox.classList.add("error");

    // auto reset after 1.5 seconds
    setTimeout(function () {
        displayBox.classList.remove("error");
        updateDisplay();
    }, 1500);
}


// keyboard support so you can type with your actual keyboard
document.addEventListener("keydown", function (e) {
    if (e.key >= "0" && e.key <= "9") {
        inputNumber(e.key);
    } else if (e.key === ".") {
        inputDecimal();
    } else if (e.key === "+") {
        inputOperator("+");
    } else if (e.key === "-") {
        inputOperator("−");
    } else if (e.key === "*") {
        inputOperator("×");
    } else if (e.key === "/") {
        e.preventDefault(); // stops browser from doing anything with /
        inputOperator("÷");
    } else if (e.key === "Enter" || e.key === "=") {
        calculate();
    } else if (e.key === "Backspace") {
        clearLast();
    } else if (e.key === "Escape") {
        allClear();
    }
});


// run on load
updateDisplay();
