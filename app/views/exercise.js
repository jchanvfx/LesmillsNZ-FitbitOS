import clock from "clock";
import exercise from "exercise";
import document from "document";
import { me } from "appbit";
import { debugLog } from "../utils";
import { formatTo12hrTime } from "../datelib"

const ICON_PLAY = "btn_combo_play_press_p.png";
const ICON_PAUSE = "btn_combo_pause_press_p.png";

let WorkoutName;
let LabelTime;
let LabelDuration;
let LabelHRM;
let LabelCALS;
let BtnFinished;
let BtnToggle;
let DlgExercise;
let DlgBtnCancel;
let DlgBtnStart;

// screen initialize.
let views;
export function init(_views) {
  views = _views;
  debugLog("view-tmpl init()");
  onMount();
}

// entry point when this view is mounted, setup elements and events.
function onMount() {
    clock.granularity = "seconds";

    // TODO: need to implement read/write settings logic.
    WorkoutName = "BODYPUMP";
    document.getElementById("workout-title").text = WorkoutName;

    LabelTime = document.getElementById("time");
    LabelDuration = document.getElementById("duration");
    LabelHRM = document.getElementById("hrm-text");
    LabelCALS = document.getElementById("cals-text");
    BtnFinished = document.getElementById("btn-finished");
    BtnToggle = document.getElementById("btn-toggle");
    DlgExercise = document.getElementById("exe-dialog");
    DlgBtnStart = DlgExercise.getElementById("btn-right");
    DlgBtnCancel = DlgExercise.getElementById("btn-left");

    let icon = (exercise.state === "started") ? ICON_PAUSE : ICON_PLAY;
    setToggleBtnIcon(icon);

    // connect up add the events.
    // ----------------------------------------------------------------------------
    clock.addEventListener("tick", onTickEvent);
    BtnFinished.addEventListener("click", onBtnFinishedClicked);
    BtnToggle.addEventListener("click", onBtnToggleClicked);


    // START THE EXERCISE TRACKING.
    // ----------------------------------------------------------------------------
    // exercise.start(WorkoutName);
}

function onBtnFinishedClicked() {
    debugLog("finished clicked");
    clock.removeEventListener("tick", onTickEvent);
    views.navigate("classes");
}
function onBtnToggleClicked() {
    debugLog("toggle clicked");
}

// ----------------------------------------------------------------------------

function onTickEvent(evt) {
    StatusBar.getElementById("time").text = formatTo12hrTime(evt.date);
}
function keyHandler(evt) {
    if (evt.key === "back") {
        evt.preventDefault();
        // views.navigate("");
        me.exit();
    }
}

function setToggleBtnIcon(icon) {
    let iconPath = "./resources/images/" + icon;
    BtnToggle.getElementById("combo-button-icon").href = iconPath;
    BtnToggle.getElementById("combo-button-icon-press").href = iconPath;
}

function pauseWorkout() {
    debugLog("paused workout");
}
function resumeWorkout() {
    debugLog("resume workout");
}
