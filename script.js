/**
 * Calcify — Premium Calculator
 * ─────────────────────────────────────────────
 * Architecture: Event-driven class with clean
 * state management. No eval() on raw strings;
 * all math is done safely via a simple parser.
 */

class Calculator {
    constructor() {
        // ── State ────────────────────────────────
        this.rawExpr = '';      // internal expression string
        this.displayExpr = '';      // user-facing (with symbols)
        this.lastAnswer = null;    // last calculated result
        this.afterEquals = false;   // did user just press =?
        this.activeOp = null;    // currently selected operator btn

        // ── History ──────────────────────────────
        this.history = [];

        // ── DOM refs ─────────────────────────────
        this.$expression = document.getElementById('expression');
        this.$result = document.getElementById('result');
        this.$display = document.getElementById('display');
        this.$historyList = document.getElementById('history-list');
        this.$historyEmpty = document.getElementById('history-empty');
        this.$historyPanel = document.getElementById('history-panel');
        this.$historyToggle = document.getElementById('btn-history-toggle');
        this.$clearHistory = document.getElementById('btn-clear-history');

        this._bindEvents();
        this._updateDisplay();
    }

    // ── Event Binding ─────────────────────────

    _bindEvents() {
        // Delegate all button clicks from the .buttons section
        document.querySelector('.buttons').addEventListener('click', (e) => {
            const btn = e.target.closest('.btn');
            if (!btn) return;
            this._triggerRipple(btn, e);
            this._handleAction(btn);
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => this._handleKey(e));

        // History toggle
        this.$historyToggle.addEventListener('click', () => this._toggleHistory());

        // Clear history
        this.$clearHistory.addEventListener('click', () => this._clearHistory());
    }

    // ── Button Action Dispatch ────────────────

    _handleAction(btn) {
        const action = btn.dataset.action;

        switch (action) {
            case 'num': this.inputNumber(btn.dataset.val); break;
            case 'op': this.inputOperator(btn.dataset.op); break;
            case 'dot': this.inputDecimal(); break;
            case 'eq': this.calculate(); break;
            case 'ac': this.allClear(); break;
            case 'pct': this.applyPercent(); break;
            case 'sign': this.toggleSign(); break;
        }
    }

    // ── Keyboard Handler ──────────────────────

    _handleKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key >= '0' && e.key <= '9') {
            this.inputNumber(e.key);
        } else if (e.key === '.') {
            this.inputDecimal();
        } else if (e.key === '+') {
            this.inputOperator('+');
        } else if (e.key === '-') {
            this.inputOperator('−');
        } else if (e.key === '*') {
            this.inputOperator('×');
        } else if (e.key === '/') {
            e.preventDefault();
            this.inputOperator('÷');
        } else if (e.key === '%') {
            this.applyPercent();
        } else if (e.key === 'Enter' || e.key === '=') {
            this.calculate();
        } else if (e.key === 'Backspace') {
            this.deleteLast();
        } else if (e.key === 'Escape') {
            this.allClear();
        }

        // Flash the corresponding button
        this._flashKeyboardBtn(e.key);
    }

    _flashKeyboardBtn(key) {
        const map = {
            '0': 'btn-0', '1': 'btn-1', '2': 'btn-2', '3': 'btn-3', '4': 'btn-4',
            '5': 'btn-5', '6': 'btn-6', '7': 'btn-7', '8': 'btn-8', '9': 'btn-9',
            '.': 'btn-dot', '+': 'btn-add', '-': 'btn-sub', '*': 'btn-mul',
            '/': 'btn-div', '%': 'btn-pct', 'Enter': 'btn-eq', '=': 'btn-eq',
            'Backspace': 'btn-c', 'Escape': 'btn-ac',
        };
        const id = map[key];
        if (!id) return;
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('ripple');
        setTimeout(() => el.classList.remove('ripple'), 280);
    }

    // ── Core Input Methods ────────────────────

    inputNumber(digit) {
        if (this.afterEquals) {
            this.rawExpr = '';
            this.displayExpr = '';
            this.afterEquals = false;
        }

        // Prevent leading zero
        if (this.rawExpr === '0' && digit !== '.') {
            this.rawExpr = digit;
            this.displayExpr = digit;
        } else {
            this.rawExpr += digit;
            this.displayExpr += digit;
        }

        this._clearActiveOp();
        this._updateDisplay();
    }

    inputOperator(op) {
        if (this.rawExpr === '' && op !== '−') return;

        const ops = ['+', '−', '×', '÷'];
        const last = this.displayExpr.slice(-1);

        if (ops.includes(last)) {
            // Replace last operator
            this.rawExpr = this.rawExpr.slice(0, -1) + this._toRaw(op);
            this.displayExpr = this.displayExpr.slice(0, -1) + op;
        } else {
            this.rawExpr += this._toRaw(op);
            this.displayExpr += op;
        }

        this.afterEquals = false;
        this._highlightOpBtn(op);
        this._updateDisplay();
    }

    inputDecimal() {
        if (this.afterEquals) {
            this.rawExpr = '0';
            this.displayExpr = '0';
            this.afterEquals = false;
        }

        const parts = this.displayExpr.split(/[+\-×÷−]/);
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes('.')) return;

        if (this.rawExpr === '') {
            this.rawExpr = '0';
            this.displayExpr = '0';
        }

        this.rawExpr += '.';
        this.displayExpr += '.';
        this._updateDisplay();
    }

    deleteLast() {
        if (this.afterEquals) {
            this.allClear();
            return;
        }
        this.rawExpr = this.rawExpr.slice(0, -1);
        this.displayExpr = this.displayExpr.slice(0, -1);
        this._clearActiveOp();
        this._updateDisplay();
    }

    allClear() {
        this.rawExpr = '';
        this.displayExpr = '';
        this.afterEquals = false;
        this.lastAnswer = null;
        this.$display.classList.remove('error');
        this._clearActiveOp();
        this._updateDisplay();
    }

    // ── Percent ───────────────────────────────

    applyPercent() {
        if (this.rawExpr === '') return;
        const ops = ['+', '−', '×', '÷'];
        const lastChar = this.displayExpr.slice(-1);
        if (ops.includes(lastChar)) return;

        // Find last number segment
        const idx = Math.max(
            this.displayExpr.lastIndexOf('+'),
            this.displayExpr.lastIndexOf('−'),
            this.displayExpr.lastIndexOf('×'),
            this.displayExpr.lastIndexOf('÷'),
        );
        const rawSegIdx = Math.max(
            this.rawExpr.lastIndexOf('+'),
            this.rawExpr.lastIndexOf('-'),
            this.rawExpr.lastIndexOf('*'),
            this.rawExpr.lastIndexOf('/'),
        );

        const displaySeg = idx === -1 ? this.displayExpr : this.displayExpr.slice(idx + 1);
        const rawSeg = rawSegIdx === -1 ? this.rawExpr : this.rawExpr.slice(rawSegIdx + 1);

        const pctVal = parseFloat(rawSeg) / 100;
        const pctDisp = this._clean(pctVal);

        if (idx === -1) {
            this.rawExpr = String(pctVal);
            this.displayExpr = pctDisp;
        } else {
            this.rawExpr = this.rawExpr.slice(0, rawSegIdx + 1) + String(pctVal);
            this.displayExpr = this.displayExpr.slice(0, idx + 1) + pctDisp;
        }

        this._updateDisplay();
    }

    // ── Toggle Sign ───────────────────────────

    toggleSign() {
        if (this.rawExpr === '' || this.rawExpr === '0') return;

        const ops = ['+', '−', '×', '÷'];
        const idx = Math.max(
            this.displayExpr.lastIndexOf('+'),
            this.displayExpr.lastIndexOf('−'),
            this.displayExpr.lastIndexOf('×'),
            this.displayExpr.lastIndexOf('÷'),
        );
        const rawIdx = Math.max(
            this.rawExpr.lastIndexOf('+'),
            this.rawExpr.lastIndexOf('-'),
            this.rawExpr.lastIndexOf('*'),
            this.rawExpr.lastIndexOf('/'),
        );

        const prefix = idx === -1 ? '' : this.displayExpr.slice(0, idx + 1);
        const rawPrefix = rawIdx === -1 ? '' : this.rawExpr.slice(0, rawIdx + 1);
        const dispSegment = idx === -1 ? this.displayExpr : this.displayExpr.slice(idx + 1);
        const rawSegment = rawIdx === -1 ? this.rawExpr : this.rawExpr.slice(rawIdx + 1);

        const num = parseFloat(rawSegment) * -1;
        const numStr = this._clean(num);

        this.rawExpr = rawPrefix + String(num);
        this.displayExpr = prefix + numStr;

        this._updateDisplay();
    }

    // ── Calculate ─────────────────────────────

    calculate() {
        if (this.rawExpr === '') return;

        const ops = ['+', '-', '*', '/'];
        const lastCh = this.rawExpr.slice(-1);
        if (ops.includes(lastCh)) return;

        try {
            const answer = this._safeEval(this.rawExpr);

            if (!isFinite(answer)) {
                this._showError("Can't divide by 0");
                return;
            }

            if (isNaN(answer)) {
                this._showError('Invalid expression');
                return;
            }

            // Save to history before overwriting
            this._addHistory(this.displayExpr, answer);

            this.$result.textContent = '';
            const cleanAnswer = this._clean(answer);

            this.rawExpr = cleanAnswer;
            this.displayExpr = cleanAnswer;
            this.lastAnswer = answer;
            this.afterEquals = true;
            this._clearActiveOp();

            this._updateDisplay(true);

        } catch (e) {
            this._showError('Error');
        }
    }

    // ── Safe Expression Evaluator ─────────────

    /**
     * Evaluates a string expression safely using a
     * recursive-descent parser instead of eval().
     * Supports: +, -, *, /, unary minus.
     */
    _safeEval(expr) {
        expr = expr.trim();
        const tokens = this._tokenize(expr);
        let pos = 0;

        function parseExpr() {
            let left = parseTerm();
            while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
                const op = tokens[pos++];
                const right = parseTerm();
                left = op === '+' ? left + right : left - right;
            }
            return left;
        }

        function parseTerm() {
            let left = parseFactor();
            while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
                const op = tokens[pos++];
                const right = parseFactor();
                left = op === '*' ? left * right : left / right;
            }
            return left;
        }

        function parseFactor() {
            if (pos < tokens.length && tokens[pos] === '-') {
                pos++;
                return -parseFactor();
            }
            if (pos < tokens.length && tokens[pos] === '(') {
                pos++; // consume '('
                const val = parseExpr();
                pos++; // consume ')'
                return val;
            }
            const num = parseFloat(tokens[pos++]);
            if (isNaN(num)) throw new Error('Unexpected token: ' + tokens[pos - 1]);
            return num;
        }

        const result = parseExpr();
        if (pos !== tokens.length) throw new Error('Unexpected token');
        return result;
    }

    _tokenize(expr) {
        const tokens = [];
        let i = 0;
        while (i < expr.length) {
            const ch = expr[i];
            if (' \t'.includes(ch)) { i++; continue; }
            if ('+-*/()'.includes(ch)) {
                tokens.push(ch);
                i++;
            } else if ((ch >= '0' && ch <= '9') || ch === '.') {
                let num = '';
                while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
                    num += expr[i++];
                }
                tokens.push(num);
            } else {
                i++;
            }
        }
        return tokens;
    }

    // ── Live Preview ──────────────────────────

    _computePreview() {
        if (this.displayExpr.length < 3) return '';

        try {
            const ans = this._safeEval(this.rawExpr);
            if (ans !== undefined && !isNaN(ans) && isFinite(ans)) {
                return '= ' + this._clean(ans);
            }
        } catch (_) {
            // Incomplete expression — silent
        }
        return '';
    }

    // ── Display Render ────────────────────────

    _updateDisplay(isAnswer = false) {
        const expr = this.displayExpr || '0';
        this.$expression.textContent = expr;

        // Dynamic font scaling
        const len = expr.length;
        if (len > 14) this.$expression.style.fontSize = '1.25rem';
        else if (len > 10) this.$expression.style.fontSize = '1.65rem';
        else if (len > 7) this.$expression.style.fontSize = '1.95rem';
        else this.$expression.style.fontSize = '2.2rem';

        // Live preview (not shown right after = press)
        if (!this.afterEquals) {
            this.$result.textContent = this._computePreview();
        }

        // Animate on answer
        if (isAnswer) {
            this.$expression.classList.remove('answer-in');
            void this.$expression.offsetWidth; // reflow
            this.$expression.classList.add('answer-in');
            setTimeout(() => this.$expression.classList.remove('answer-in'), 300);
        }
    }

    // ── Error State ───────────────────────────

    _showError(msg) {
        this.rawExpr = '';
        this.displayExpr = '';
        this.afterEquals = false;

        this.$expression.textContent = msg;
        this.$result.textContent = '';
        this.$expression.style.fontSize = '1.5rem';

        this.$display.classList.remove('error');
        void this.$display.offsetWidth;
        this.$display.classList.add('error');

        setTimeout(() => {
            this.$display.classList.remove('error');
            this._updateDisplay();
        }, 1600);
    }

    // ── History ───────────────────────────────

    _addHistory(expr, answer) {
        const entry = { expr, answer: this._clean(answer) };
        this.history.unshift(entry); // newest first
        if (this.history.length > 30) this.history.pop();
        this._renderHistory();
    }

    _renderHistory() {
        this.$historyEmpty.style.display = this.history.length ? 'none' : 'block';

        // Remove existing items (not the empty placeholder)
        this.$historyList.querySelectorAll('.history-item').forEach(el => el.remove());

        this.history.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.style.animationDelay = (idx * 0.04) + 's';
            li.innerHTML = `
        <div class="history-expr">${this._escapeHtml(item.expr)}</div>
        <div class="history-answer">${this._escapeHtml(item.answer)}</div>
      `;
            // Click to recall the answer
            li.addEventListener('click', () => {
                this.rawExpr = item.answer;
                this.displayExpr = item.answer;
                this.afterEquals = true;
                this._updateDisplay();
            });
            this.$historyList.appendChild(li);
        });
    }

    _clearHistory() {
        this.history = [];
        this._renderHistory();
    }

    _toggleHistory() {
        const isOpen = this.$historyPanel.classList.toggle('visible');
        this.$historyToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    // ── Active Operator Highlight ─────────────

    _highlightOpBtn(op) {
        this._clearActiveOp();
        const map = { '+': 'btn-add', '−': 'btn-sub', '×': 'btn-mul', '÷': 'btn-div' };
        const id = map[op];
        if (!id) return;
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('active-op');
            this.activeOp = el;
        }
    }

    _clearActiveOp() {
        if (this.activeOp) {
            this.activeOp.classList.remove('active-op');
            this.activeOp = null;
        }
    }

    // ── Ripple Effect ─────────────────────────

    _triggerRipple(btn, event) {
        const rect = btn.getBoundingClientRect();
        const rx = ((event.clientX - rect.left) / rect.width) * 100 + '%';
        const ry = ((event.clientY - rect.top) / rect.height) * 100 + '%';
        btn.style.setProperty('--rx', rx);
        btn.style.setProperty('--ry', ry);
        btn.classList.add('ripple');
        setTimeout(() => btn.classList.remove('ripple'), 320);
    }

    // ── Utilities ─────────────────────────────

    /** Map display symbol → raw math char */
    _toRaw(op) {
        return { '÷': '/', '×': '*', '−': '-' }[op] ?? op;
    }

    /** Remove floating-point noise */
    _clean(n) {
        if (typeof n !== 'number') return String(n);
        const str = n.toString();
        if (str.includes('.') && str.length > 12) {
            return parseFloat(n.toFixed(10)).toString();
        }
        return str;
    }

    /** Safe HTML escaping for history items */
    _escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}


// ── Bootstrap ─────────────────────────────────
const calc = new Calculator();
