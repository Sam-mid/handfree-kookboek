let timerInterval;
let seconds = 0;
let isRunning = false;

export function startTimer() {
    const timerDisplay = document.getElementById("timer");

    if (!timerDisplay) {
        console.error("Timer niet gevonden");
        return;
    }

    if (!isRunning) {
        console.log("Timer gestart!");
        isRunning = true;

        timerInterval = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        }, 1000);

    } else {
        console.log("⏸ Timer gepauzeerd!");
        clearInterval(timerInterval);
        isRunning = false;
    }
}

export function stopTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    console.log("Timer gestopt");
}
