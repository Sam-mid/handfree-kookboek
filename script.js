
// Imports

import { HandLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";
import { startTimer, stopTimer } from "./js/timer.js";




// Inlaaden nn model
ml5.setBackend("webgl");
const nn = ml5.neuralNetwork({ task: 'classification', debug: true });
const modelDetails = {
    model: 'model.json',
    metadata: 'model_meta.json',
    weights: 'model.weights.bin'
};



// DOM-elementen

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const image = document.querySelector("#myimage");
const enableWebcamButton = document.getElementById("webcamButton");
const logButton = document.getElementById("logButton");
const drawUtils = new DrawingUtils(canvasCtx);



// Statusvariabelen

let handLandmarker;
let webcamRunning = false;
let results;
let lastGesture = null;
let gestureCooldown = false;



// model inladen

nn.load(modelDetails, () => {
    console.log("Het model is geladen!");
});



// Recept-stappen

let currentStep = 1;
const totalSteps = 6;

function showStep(step) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
}
showStep(currentStep);

function goNext() {
    console.log("Naar de volgende stap");
    currentStep = Math.min(currentStep + 1, totalSteps);
    showStep(currentStep);
}

function goBack() {
    console.log("Terug naar de vorige stap");
    currentStep = Math.max(currentStep - 1, 1);
    showStep(currentStep);
}



// HandLandmarker Initialisatie

const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
    });

    console.log("HandLandmarker geladen");
    enableWebcamButton.addEventListener("click", enableCam);
};



// Webcam

async function enableCam() {
    webcamRunning = true;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = stream;

        video.addEventListener("loadeddata", () => {
            canvasElement.width = video.videoWidth;
            canvasElement.height = video.videoHeight;
            canvasElement.style.width = `${video.videoWidth}px`;
            canvasElement.style.height = `${video.videoHeight}px`;
            document.querySelector(".videoView").style.height = `${video.videoHeight}px`;

            predictWebcam();
        });
    } catch (error) {
        console.error("Webcam toegang mislukt:", error);
    }
}

function stopWebcam() {
    webcamRunning = false;
    console.log("Webcam gestopt");
    const stream = video.srcObject;
    stream?.getTracks().forEach(track => track.stop());
}



// voorspellingen & Detectie

async function predictWebcam() {
    if (!webcamRunning) return;

    results = await handLandmarker.detectForVideo(video, performance.now());

    const hand = results.landmarks[0];
    if (hand) {
        const pose = hand.flatMap(point => [point.x, point.y, point.z]);

        nn.classify(pose, (error, predictions) => {
            const actualPredictions = Array.isArray(error) ? error : predictions;

            if (!actualPredictions?.length) {
                console.warn("Geen geldige voorspellingen:", error || predictions);
                return;
            }

            actualPredictions.sort((a, b) => b.confidence - a.confidence);
            const top = actualPredictions[0];

            if (top.confidence > 0.5) {
                console.log(`Gebaar: ${top.label} (${top.confidence.toFixed(2)})`);
                handleGesture(top.label);
            } else {
                console.log("Te lage confidence");
            }
        });

        const thumb = hand[4];
        image.style.transform = `translate(${video.videoWidth - thumb.x * video.videoWidth}px, ${thumb.y * video.videoHeight}px)`;
    }

    drawHands(results);
    requestAnimationFrame(predictWebcam);
}

function drawHands(results) {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    results.landmarks.forEach(hand => {
        drawUtils.drawConnectors(hand, HandLandmarker.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 5 });
        drawUtils.drawLandmarks(hand, { radius: 4, color: "#FF0000", lineWidth: 2 });
    });
}



// Gesture handling
function handleGesture(gesture) {
    if (gestureCooldown || gesture === lastGesture) return;

    lastGesture = gesture;
    gestureCooldown = true;

    switch (gesture) {
        case 'back': goBack(); break;
        case 'forward': goNext(); break;
        case 'timer': startTimer(); break;
        default: console.log(`Onbekend gebaar: ${gesture}`);
    }

    setTimeout(() => {
        gestureCooldown = false;
        lastGesture = null;
    }, 1500);
}



// Start de app

if (navigator.mediaDevices?.getUserMedia) {
    createHandLandmarker();
}

