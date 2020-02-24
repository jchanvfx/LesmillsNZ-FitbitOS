import clock from "clock";
import exercise from "exercise";
import document from "document";
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
let LabelHRM;
let LabelCALS;
let BottomText;
let BtnFinish;
let BtnToggle;
let DlgExercise;
let DlgBtnEnd;
let DlgBtnCancel;

// screen initialize.
let views;
export function init(_views) {
  views = _views;
  debugLog("view-exercise init()");
  onMount();
}

// entry point when this view is mounted, setup elements and events.
function onMount() {
    clock.granularity = "seconds";

    if (me.permissions.granted("access_heart_rate") && me.permissions.granted("access_activity")) {
        BODY_SENSOR = new BodyPresenceSensor();
        HRM_SENSOR = new HeartRateSensor();
    } else {
        debugLog("Denied Heart Rate or User Profile permissions");
    }

    WorkoutName = loadSettings().workout;
    document.getElementById("workout-title").text = WorkoutName;

    LabelTime = document.getElementById("time");
    LabelDuration = document.getElementById("duration");
    LabelHRM = document.getElementById("hrm-text");
    LabelCALS = document.getElementById("cals-text");
    BottomText = document.getElementById("bottom-text");
    BtnFinish = document.getElementById("btn-finish");
    BtnToggle = document.getElementById("btn-toggle");
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
    display.addEventListener("change", onChangeEvent);
    document.addEventListener("keypress", onKeyPressEvent);
    BtnFinish.addEventListener("activate", onBtnFinishClicked);
    BtnToggle.addEventListener("activate", onBtnToggleClicked);
    DlgBtnEnd.addEventListener("activate", onDlgBtnEnd)
    DlgBtnCancel.addEventListener("activate", onDlgBtnCancel);

    // START THE EXERCISE TRACKING.
    // ----------------------------------------------------------------------------
    setToggleBtnIcon(ICON_PAUSE);
    exercise.start(WorkoutName);
    onDisplayChangeEvent();
}
function onDisplayChangeEvent() {
    if (display.on) {
        BODY_SENSOR.start();
        HRM_SENSOR.start();
        refresh();
        LabelTime.text = formatTo12hrTime(new Date());
        clock.granularity = "seconds";
    } else {
        BODY_SENSOR.stop();
        HRM_SENSOR.stop();
        LabelHRM.text = "--";
        LabelCALS.text = "--";
        clock.granularity = "off";
    }
}
function onTickEvent(evt) {
    LabelTime.text = formatTo12hrTime(evt.date);
    if (display.on) {refresh();}
}
function onKeyPressEvent(evt) {
    if (evt.key === "back") {
        evt.preventDefault();
        onBtnFinishClicked()
    }
}
function onDlgBtnCancel() {
    debugLog("dlg cancel");
    displayElement(DlgExercise, false);
}
function onDlgBtnEnd() {
    debugLog("dlg end");
    exercise.stop();
    clock.removeEventListener("tick", onTickEvent);
    display.removeEventListener("change", onDisplayChangeEvent);
    // TODO prompt results dlg.
    me.exit();
}
function onBtnFinishClicked() {
    debugLog("finished clicked");
    displayElement(DlgExercise, true);
}
function onBtnToggleClicked() {
    debugLog("toggle clicked");
    if (exercise.state === "started") {
        displayElement(BtnFinish, true);
        pauseWorkout();
    } else {
        displayElement(BtnFinish, false);
        resumeWorkout();
    }
}

// ----------------------------------------------------------------------------

function setToggleBtnIcon(icon) {
    let iconPath = "./resources/images/" + icon;
    BtnToggle.getElementById("combo-button-icon").href = iconPath;
    BtnToggle.getElementById("combo-button-icon-press").href = iconPath;
}
function pauseWorkout() {
    debugLog("paused workout");
    // BottomText.getElementById("anim").repeatCount = "indefinite";
    BottomText.animate("enable");
    setToggleBtnIcon(ICON_PLAY);
    exercise.pause();
}
function resumeWorkout() {
    debugLog("resume workout");
    // BottomText.getElementById("anim").repeatCount = 1;
    BottomText.animate("disable");
    setToggleBtnIcon(ICON_PAUSE);
    exercise.resume();
}
function getBPM() {
    if (!BODY_SENSOR.present) {
        return "--"; // off-wrist
    }
    return HRM_SENSOR.heartRate;
}
function refresh() {
    if (exercise && exercise.stats) {
        LabelDuration.text = formatActiveTime(exercise.stats.activeTime);
        LabelHRM.text = getBPM();
        LabelCALS.text = formatCalories(exercise.stats.calories);
    }
}
