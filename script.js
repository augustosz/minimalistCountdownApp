class CountdownApp {
    constructor() {
        this.displayEl = document.getElementById('time-display');
        this.displayH = document.getElementById('display-h');
        this.displayM = document.getElementById('display-m');
        this.displayS = document.getElementById('display-s');

        this.inputEl = document.getElementById('time-input');
        this.btnToggle = document.getElementById('btn-toggle');
        this.btnReset = document.getElementById('btn-reset');
        this.btnSave = document.getElementById('btn-save');
        this.btnHistory = document.getElementById('btn-history');
        this.btnClose = document.getElementById('btn-close');

        this.historyOverlay = document.getElementById('history-overlay');
        this.historyList = document.getElementById('history-list');
        this.btnCloseHistory = document.getElementById('btn-close-history');

        this.totalMilliseconds = 0;
        this.remainingMilliseconds = 0;
        this.intervalId = null;
        this.isRunning = false;
        this.lastTimestamp = 0;

        this.init();
    }

    init() {
        this.addEventListeners();
        this.updateDisplay(0);
        this.loadHistory(); // Ensure history is loaded but not necessarily shown
    }

    addEventListeners() {
        // Granular Edit Mode
        this.displayH.addEventListener('click', (e) => { e.stopPropagation(); this.enableEditMode('h'); });
        this.displayM.addEventListener('click', (e) => { e.stopPropagation(); this.enableEditMode('m'); });
        this.displayS.addEventListener('click', (e) => { e.stopPropagation(); this.enableEditMode('s'); });
        this.displayEl.addEventListener('click', () => this.enableEditMode('all'));

        // Input Handling
        this.inputEl.addEventListener('blur', () => {
            // Small delay to allow clicking history items without closing immediately
            setTimeout(() => this.disableEditMode(), 100);
        });
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.disableEditMode();
            } else if (e.key === 'Escape') {
                this.inputEl.value = ''; // Cancel edit
                this.inputEl.blur();
            }
        });

        // Controls
        this.btnToggle.addEventListener('click', () => this.toggleTimer());
        this.btnReset.addEventListener('click', () => this.resetTimer());
        if (this.btnSave) {
            this.btnSave.addEventListener('click', () => this.saveCurrentToHistory());
        }
        this.btnHistory.addEventListener('click', () => this.toggleHistory());
        this.btnCloseHistory.addEventListener('click', () => this.toggleHistory());

        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => window.close());
        }

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.inputEl.classList.contains('active')) return; // Ignore if editing

            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling
                this.toggleTimer();
            } else if (e.code === 'KeyR') {
                this.resetTimer();
            } else if (e.code === 'KeyH') {
                this.toggleHistory();
            }
        });
    }

    enableEditMode(part = 'all') {
        if (this.isRunning) this.pauseTimer();

        this.displayEl.classList.add('hidden');
        this.inputEl.classList.add('active');

        // Always pre-fill with current value (even 00:00:00) so selection logic works
        this.inputEl.value = this.formatTime(this.remainingMilliseconds);

        this.inputEl.focus();

        // Smart selection based on part clicked
        // Using requestAnimationFrame to ensure DOM update and focus are complete
        requestAnimationFrame(() => {
            if (part === 'h') {
                // Select first part (Hours)
                const colonIndex = this.inputEl.value.indexOf(':');
                if (colonIndex > -1) {
                    this.inputEl.setSelectionRange(0, colonIndex);
                }
            } else if (part === 'm') {
                // Select middle part (Minutes)
                const firstColon = this.inputEl.value.indexOf(':');
                const lastColon = this.inputEl.value.lastIndexOf(':');
                if (firstColon > -1 && lastColon > firstColon) {
                    this.inputEl.setSelectionRange(firstColon + 1, lastColon);
                } else if (firstColon > -1) {
                    // MM:SS format?
                    this.inputEl.setSelectionRange(0, firstColon);
                }
            } else if (part === 's') {
                const lastColon = this.inputEl.value.lastIndexOf(':');
                if (lastColon > -1) {
                    this.inputEl.setSelectionRange(lastColon + 1, this.inputEl.value.length);
                }
            } else {
                // Select all if generic click
                this.inputEl.select();
            }
        });
    }

    disableEditMode() {
        const inputVal = this.inputEl.value.trim();

        if (inputVal) {
            const ms = this.parseTimeInput(inputVal);
            if (ms > 0) {
                this.totalMilliseconds = ms;
                this.remainingMilliseconds = ms;
                this.updateDisplay(ms);
                // Removed auto-save
            }
        }

        this.displayEl.classList.remove('hidden');
        this.inputEl.classList.remove('active');
    }

    saveCurrentToHistory() {
        if (this.totalMilliseconds > 0) {
            this.saveToHistory(this.totalMilliseconds);
            // Visual feedback
            if (this.btnSave) {
                const originalText = this.btnSave.textContent;
                this.btnSave.textContent = "Saved!";
                setTimeout(() => {
                    this.btnSave.textContent = originalText;
                }, 1000);
            }
        }
    }

    parseTimeInput(input) {
        input = input.toLowerCase();
        let totalMs = 0;

        if (input.includes(':')) {
            const parts = input.split(':').map(Number);
            if (parts.length === 3) {
                // HH:MM:SS
                totalMs += parts[0] * 3600000;
                totalMs += parts[1] * 60000;
                totalMs += parts[2] * 1000;
            } else if (parts.length === 2) {
                // MM:SS
                totalMs += parts[0] * 60000;
                totalMs += parts[1] * 1000;
            }
        } else {
            const hours = input.match(/(\d+)\s*h/);
            const minutes = input.match(/(\d+)\s*m/);
            const seconds = input.match(/(\d+)\s*s/);

            if (hours) totalMs += parseInt(hours[1]) * 3600000;
            if (minutes) totalMs += parseInt(minutes[1]) * 60000;
            if (seconds) totalMs += parseInt(seconds[1]) * 1000;

            if (!hours && !minutes && !seconds && /^\d+$/.test(input)) {
                totalMs += parseInt(input) * 60000;
            }
        }

        return totalMs;
    }

    formatTime(ms) {
        if (ms <= 0) return "00:00:00";

        const totalSeconds = Math.ceil(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        const hStr = h.toString().padStart(2, '0');
        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');

        return `${hStr}:${mStr}:${sStr}`;
    }

    updateDisplay(ms) {
        const timeStr = this.formatTime(ms);
        const parts = timeStr.split(':');

        if (parts.length === 3) {
            this.displayH.textContent = parts[0];
            this.displayM.textContent = parts[1];
            this.displayS.textContent = parts[2];
        } else {
            // Fallback if format changes
            this.displayH.textContent = "00";
            this.displayM.textContent = parts[0];
            this.displayS.textContent = parts[1];
        }

        document.title = timeStr + " - Timer";
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        if (this.remainingMilliseconds <= 0 && this.totalMilliseconds > 0) {
            this.remainingMilliseconds = this.totalMilliseconds;
        } else if (this.remainingMilliseconds <= 0) {
            return;
        }

        this.isRunning = true;
        this.lastTimestamp = Date.now();
        this.btnToggle.textContent = "Pause";

        this.intervalId = requestAnimationFrame(this.loop.bind(this));
    }

    pauseTimer() {
        this.isRunning = false;
        this.btnToggle.textContent = "Start";
        cancelAnimationFrame(this.intervalId);
    }

    resetTimer() {
        this.pauseTimer();
        this.remainingMilliseconds = this.totalMilliseconds;
        this.updateDisplay(this.remainingMilliseconds);
    }

    loop() {
        if (!this.isRunning) return;

        const now = Date.now();
        const delta = now - this.lastTimestamp;
        this.lastTimestamp = now;

        this.remainingMilliseconds -= delta;

        if (this.remainingMilliseconds <= 0) {
            this.remainingMilliseconds = 0;
            this.pauseTimer();
            this.playAlarm();
        }

        this.updateDisplay(this.remainingMilliseconds);

        if (this.isRunning) {
            this.intervalId = requestAnimationFrame(this.loop.bind(this));
        }
    }

    playAlarm() {
        document.body.style.backgroundColor = '#330000';
        setTimeout(() => { document.body.style.backgroundColor = ''; }, 500);
        setTimeout(() => { document.body.style.backgroundColor = '#330000'; }, 1000);
        setTimeout(() => { document.body.style.backgroundColor = ''; }, 1500);
    }

    // History Management
    toggleHistory() {
        if (this.historyOverlay.style.display === 'block') {
            this.historyOverlay.style.display = 'none';
        } else {
            this.loadHistory();
            this.historyOverlay.style.display = 'block';
        }
    }

    saveToHistory(ms) {
        let history = JSON.parse(localStorage.getItem('timerHistory') || '[]');
        // Remove duplicate if exists
        history = history.filter(h => h !== ms);
        // Add to top
        history.unshift(ms);
        // Keep last 10
        if (history.length > 10) history.pop();

        localStorage.setItem('timerHistory', JSON.stringify(history));
    }

    deleteFromHistory(index) {
        let history = JSON.parse(localStorage.getItem('timerHistory') || '[]');
        history.splice(index, 1);
        localStorage.setItem('timerHistory', JSON.stringify(history));
        this.loadHistory();
    }

    loadHistory() {
        const history = JSON.parse(localStorage.getItem('timerHistory') || '[]');
        this.historyList.innerHTML = '';

        if (history.length === 0) {
            this.historyList.innerHTML = '<div style="text-align:center; color:#666; padding:10px;">No recent times</div>';
            return;
        }

        history.forEach((ms, index) => {
            const div = document.createElement('div');
            div.className = 'history-item';

            const timeSpan = document.createElement('span');
            timeSpan.className = 'history-time';
            timeSpan.textContent = this.formatTime(ms);

            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'history-delete';
            deleteBtn.textContent = 'X';
            deleteBtn.title = 'Delete';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteFromHistory(index);
            };

            div.appendChild(timeSpan);
            div.appendChild(deleteBtn);

            div.onclick = () => {
                this.totalMilliseconds = ms;
                this.remainingMilliseconds = ms;
                this.updateDisplay(ms);
                this.toggleHistory();
            };
            this.historyList.appendChild(div);
        });
    }
}

const app = new CountdownApp();
