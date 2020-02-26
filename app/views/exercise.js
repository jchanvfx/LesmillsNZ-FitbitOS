import clock from "clock";
import exercise from "exercise";
import document from "document";
import { vibration } from "haptics";
import { BodyPresenceSensor } from "body-presence";
import { HeartRateSensor } from "heart-rate";
import { me } from "appbit";
import { display } from "display";
import { debugLog, displayElement, formatCalories, formatActiveTime, loadSettings } from "../utils";
import { formatTo12hrTime } from "../datelib"

const ICON_PLAY = "btn_combo_play_press_p.png";
const ICON_PAUSE = "btn_combo_pause_press_p.png";
let BODY_SENSOR;
let HRM_SENSOR;

let WorkoutName;
let LabelTime;
let LabelDuration;
let LabelDurationMsec;
let LabelHRM;
let LabelCALS;
let BottomText;
let BtnFinish;
let BtnToggle;
let DlgExercise;
let DlgBtnEnd;
let DlgBtnCancel;
let DlgPopup;
let DlgPopupBtn;

// screen initialize.
let views;
export function init(_views) {
  views = _views;
  debugLog("view-exercise init()");
  onMount();
}

// entry point when this view is mounted, setup elements and events.
function onMount() {
    clock.granularity = "minutes";

    if (me.permissions.granted("access_heart_rate") && me.permissions.granted("access_activity")) {
        BODY_SENSOR = new BodyPresenceSensor();
        HRM_SENSOR = new HeartRateSensor();
    } else {
        debugLog("Denied Heart Rate or User Profile permissions");
    }

    WorkoutName = loadSettings().workout;
    document.getElementById("workout-title").text = WorkoutName;

    LabelTime = document.getElementById("time");
    LabelTime.text = formatTo12hrTime(new Date());
    LabelDuration = document.getElementById("duration");
    LabelDurationMsec = document.getElementById("duration-msec");
    LabelHRM = document.getElementById("hrm-text");
    LabelCALS = document.getElementById("cals-text");
    BottomText = document.getElementById("bottom-text");
    BtnFinish = document.getElementById("btn-finish");
    BtnToggle = document.getElementById("btn-toggle");
    DlgPopup = document.getElementById("exe-popup");
    DlgPopupBtn = DlgPopup.getElementById("btn-done");
    DlgExercise = document.getElementById("exe-dialog");
    let mixedtext = DlgExercise.getElementById("mixedtext");
    let bodytext = mixedtext.getElementById("copy");
    mixedtext.text = WorkoutName;
    bodytext.text = "End this workout?";
    DlgBtnEnd = DlgExercise.getElementById("btn-right");
    DlgBtnEnd.text = "End";
    DlgBtnCancel = DlgExercise.getElementById("btn-left");

    displayElement(BtnFinish, false);

    // connect up add the events.
    // ----------------------------------------------------------------------------
    clock.addEventListener("tick", onTickEvent);
    display.addEventListener("change", onDisplayChangeEvent);
    document.addEventListener("keypress", onKeyPressEvent);
    BtnFinish.addEventListener("activate", onBtnFinishClicked);
    BtnToggle.addEventListener("activate", onBtnToggleClicked);
    DlgBtnEnd.addEventListener("activate", onDlgBtnEnd)
    DlgBtnCancel.addEventListener("activate", onDlgBtnCancel);
    DlgPopupBtn.addEventListener("activate", () => {me.exit();});

    // START THE EXERCISE TRACKING.
    // ----------------------------------------------------------------------------
    startWorkout(WorkoutName);
}
function onDisplayChangeEvent() {
    if (display.on) {
        clock.granularity = "minutes";
        BODY_SENSOR.start();
        HRM_SENSOR.start();
        msec = Math.floor(exercise.stats.activeTime / 100) % 10;
        LabelDuration.text = `${formatActiveTime(exercise.stats.activeTime)}.`;
        startMStimer();
    } else {
        clock.granularity = "off";
        stopMStimer();
        BODY_SENSOR.stop();
        HRM_SENSOR.stop();
        LabelHRM.text = "--";
        LabelCALS.text = "--";
    }
}
function onTickEvent(evt) {
    LabelTime.text = formatTo12hrTime(evt.date);
}
function onKeyPressEvent(evt) {
    if (evt.key === "back") {
        evt.preventDefault();
        if (DlgPopup.style.display === "inline") {me.exit();}
        if (exercise.state === "started") {pauseWorkout();}
        if (DlgExercise.style.display === "inline") {
            onDlgBtnCancel();}
        else {
            onBtnFinishClicked();}
    }
}
function onDlgBtnCancel() {
    debugLog("dlg cancel");
    displayElement(DlgExercise, false);
}
function onDlgBtnEnd() {
    debugLog("dlg end");
    exercise.stop();
    stopMStimer();

    clock.removeEventListener("tick", onTickEvent);
    display.removeEventListener("change", onDisplayChangeEvent);

    let workout = DlgPopup.getElementById("workout");
    let itm1 = DlgPopup.getElementById("itm1");
    let itm2 = DlgPopup.getElementById("itm2");
    let itm3 = DlgPopup.getElementById("itm3");
    let itm4 = DlgPopup.getElementById("itm4");
    workout.getElementById("text").text = WorkoutName;
    itm1.getElementById("text").text = `${formatActiveTime(exercise.stats.activeTime || 0)}`;
    itm2.getElementById("text").text = `${exercise.stats.heartRate.average || 0} bpm avg`;
    itm3.getElementById("text").text = `${exercise.stats.heartRate.max || 0} bpm max`;
    itm4.getElementById("text").text = `${formatCalories(exercise.stats.calories || 0)} cals`;
    displayElement(DlgPopup, true);
}
function onBtnFinishClicked() {
    debugLog("finished clicked");
    vibration.start("nudge");
    displayElement(DlgExercise, true);
}
function onBtnToggleClicked() {
    debugLog("toggle clicked");
    (exercise.state === "started") ? pauseWorkout() : resumeWorkout();
}

// ----------------------------------------------------------------------------

function setToggleBtnIcon(icon) {
    let iconPath = "./resources/images/" + icon;
    BtnToggle.getElementById("combo-button-icon").href = iconPath;
    BtnToggle.getElementById("combo-button-icon-press").href = iconPath;
}

function getBPM() {
    // off-wrist
    if (!BODY_SENSOR.present) {return "--";}
    return HRM_SENSOR.heartRate || "--";
}

//  ----------------------------------------------------------------------------

let msec = 0;
function msecTimer() {
    // msec trigger.
    LabelDurationMsec.text = `${msec}`;
    if (msec < 9) {msec+=1;}
    else {
        msec=0;
        // seconds trigger.
        LabelHRM.text = getBPM();
        LabelCALS.text = formatCalories(exercise.stats.calories);
        LabelDuration.text = `${formatActiveTime(exercise.stats.activeTime)}.`;
    };
}

let msState = false;
let msInterval;
function startMStimer() {
    debugLog("msec timer started");
    if (!msState) {
        msInterval = setInterval(msecTimer, 100); msState=true;
    }
}
function stopMStimer() {
    debugLog("msec timer stoped");
    clearInterval(msInterval); msState=false;
}

function startWorkout(workout) {
    BODY_SENSOR.start();
    HRM_SENSOR.start();
    setToggleBtnIcon(ICON_PAUSE);
    exercise.start(workout);
    msec = Math.floor(exercise.stats.activeTime / 100) % 10;

    LabelDuration.text = `${formatActiveTime(exercise.stats.activeTime)}.`;
    startMStimer();
    vibration.start("nudge");
}
function pauseWorkout() {
    debugLog("paused workout");
    BottomText.animate("enable");
    setToggleBtnIcon(ICON_PLAY);
    displayElement(BtnFinish, true);
    exercise.pause();
    stopMStimer();
    vibration.start("bump");
}
function resumeWorkout() {
    debugLog("resume workout");
    BottomText.animate("disable");
    setToggleBtnIcon(ICON_PAUSE);
    displayElement(BtnFinish, false);
    exercise.resume();
    msec = Math.floor(exercise.stats.activeTime / 100) % 10;
    LabelDuration.text = `${formatActiveTime(exercise.stats.activeTime)}.`;
    startMStimer();
    vibration.start("bump");
}
