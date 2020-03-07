import clock from "clock";
import exercise from "exercise";
import document from "document";
import { vibration } from "haptics";
import { BodyPresenceSensor } from "body-presence";
import { HeartRateSensor } from "heart-rate";
import { me } from "appbit";
import { display } from "display";

import { SETTINGS_FILE } from "../config"
import { debugLog, zeroPad } from "../utils";
import { date, formatTo12hrTime } from "../datelib"
import {
    show, hide, isVisible,
    createSettingsHelper,
    createQuestionDialogHelper
} from "../helpers"

let Sensors;
let AppSettings;
let WorkoutName;
let EndDialog;
let ResultsDialog;
let TimeDisplay;
let ActiveTimeDisplay;
let BtnToggle;
let BtnFinish;
let LabelBottom;
let LabelHRM;
let LabelCALS;

// screen entry point.
let views;
export function init(_views) {
    views = _views;

    if (me.permissions.granted("access_heart_rate") &&
        me.permissions.granted("access_activity")) {
        Sensors = {
            Body    : new BodyPresenceSensor(),
            HRM     : new HeartRateSensor(),
            start() {this.Body.start(); this.HRM.start();},
            stop()  {this.Body.stop();  this.HRM.stop();},
            bpm() {
                // off-wrist
                if (!this.Body.present) {return "--";}
                return this.HRM.heartRate || "--";
            },
        };
    } else {
        debugLog("Denied Heart Rate or User Profile permissions");
        return;
    }

    AppSettings  = createSettingsHelper(SETTINGS_FILE);
    WorkoutName  = AppSettings.load().workout;
    EndDialog = createQuestionDialogHelper(
        document.getElementById("question-dialog")
    );
    ResultsDialog = {
        Element     : document.getElementById("exe-popup"),
        DoneButton  : document.getElementById("exe-popup").getElementById("btn-done"),
        isVisible() {return isVisible(this.Element);},
        setLabel(elemId, text) {
            let itm = this.Element.getElementById(elemId);
            itm.getElementById("text").text = text;
        },
    };
    TimeDisplay = document.getElementById("time");
    ActiveTimeDisplay = {
        DurationText : document.getElementById("duration"),
        MsecText     : document.getElementById("duration-msec"),
        setActiveTime(activeTime) {
            this.DurationText.text = `${formatActiveTime(activeTime)}.`;
        },
    };
    BtnToggle = {
        Element: document.getElementById("btn-toggle"),
        play() {
            let iconPath = "./resources/images/btn_combo_pause_press_p.png";
            this.Element.getElementById("combo-button-icon").href = iconPath;
            this.Element.getElementById("combo-button-icon-press").href = iconPath;
        },
        pause() {
            let iconPath = "./resources/images/btn_combo_play_press_p.png";
            this.Element.getElementById("combo-button-icon").href = iconPath;
            this.Element.getElementById("combo-button-icon-press").href = iconPath;
        },
    };
    BtnFinish   = document.getElementById("btn-finish");
    LabelHRM    = document.getElementById("hrm-text");
    LabelCALS   = document.getElementById("cals-text");
    LabelBottom = document.getElementById("bottom-text");

    onMount();
    debugLog("Exercise :: initialize!");
    return onUnMount;
}

// entry point when this view is mounted, setup elements and events.
function onMount() {

    document.getElementById("workout-title").text = WorkoutName;

    // Configure Finish Dialog.
    EndDialog.setHeader(WorkoutName);
    EndDialog.Message.text     = "End this workout?";
    EndDialog.YesButton.text   = "Yes";
    EndDialog.NoButton.text    = "No";
    EndDialog.hide();

    // Configure Results Dialog.
    ResultsDialog.setLabel("workout", WorkoutName);
    hide(ResultsDialog.Element);

    TimeDisplay.text = formatTo12hrTime(date);
    hide(BtnFinish);

    // wire up events.
    clock.granularity = "minutes";
    clock.ontick = (evt) => {TimeDisplay.text = formatTo12hrTime(evt.date);};
    display.addEventListener("change", onDisplayChangeEvent);
    document.addEventListener("keypress", onKeyPressEvent);

    BtnFinish.addEventListener("activate", onBtnFinishClicked);
    BtnToggle.Element.addEventListener("activate", () => {
        (exercise.state === "started") ? pauseWorkout() : resumeWorkout();
    });
    EndDialog.YesButton.addEventListener("activate", endWorkout);
    EndDialog.NoButton.addEventListener("activate", () => {
        EndDialog.hide();
    });
    ResultsDialog.DoneButton.addEventListener("activate", () => {
        me.exit();
    });

    // Start exercise tracking.
    startWorkout(WorkoutName);
}

// Clean-up function executed before the view is unloaded.
// No need to unsubscribe from DOM events, it's done automatically.
function onUnMount() {
    debugLog(">>> unMounted - Exercise");
    clock.granularity = "off";
    clock.ontick = undefined;
}

function onDisplayChangeEvent() {
    if (display.on) {
        clock.granularity = "minutes";
        Sensors.start();
        msec = Math.floor(exercise.stats.activeTime / 100) % 10;
        ActiveTimeDisplay.setActiveTime(exercise.stats.activeTime);
        if (exercise.state === "started") {startMStimer();}
    } else {
        clock.granularity = "off";
        stopMStimer();
        Sensors.stop();
    }
}
function onKeyPressEvent(evt) {
    if (evt.key === "back") {
        evt.preventDefault();
        if (ResultsDialog.isVisible()) {me.exit();}
        if (exercise.state === "started") {pauseWorkout();}
        if (EndDialog.isVisible()) {
            EndDialog.hide();}
        else {
            onBtnFinishClicked();}
    }
}
function onBtnFinishClicked() {
    debugLog("finished clicked");
    vibration.start("nudge");
    EndDialog.show();
}

// ----------------------------------------------------------------------------

function formatCalories(calories) {
    return calories.toLocaleString();
}
function formatActiveTime(activeTime) {
    let seconds = (activeTime / 1000).toFixed(0);
    let minutes = Math.floor(seconds / 60);
    let hours;
    if (minutes > 59) {
        hours = Math.floor(minutes / 60);
        hours = zeroPad(hours);
        minutes = minutes - hours * 60;
        minutes = zeroPad(minutes);
    }
    seconds = Math.floor(seconds % 60);
    seconds = zeroPad(seconds);
    if (hours) {
        return `${hours}:${minutes}:${seconds}`;
    }
    return `${minutes}:${seconds}`;
}

//  ----------------------------------------------------------------------------

let msec = 0;
let msState = false;
let msInterval;
function msecTimer() {
    // msec trigger.
    ActiveTimeDisplay.MsecText.text = `${msec}`;
    if (msec < 9) {msec+=1;}
    else {
        msec=0;
        // seconds trigger.
        LabelHRM.text = Sensors.bpm();
        LabelCALS.text = formatCalories(exercise.stats.calories);
        ActiveTimeDisplay.setActiveTime(exercise.stats.activeTime);
    };
}
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

//  ----------------------------------------------------------------------------

function startWorkout(workout) {
    debugLog("started workout");
    Sensors.start();
    BtnToggle.play();
    exercise.start(workout);
    msec = Math.floor(exercise.stats.activeTime / 100) % 10;
    ActiveTimeDisplay.setActiveTime(exercise.stats.activeTime);
    startMStimer();
    vibration.start("nudge");
}
function pauseWorkout() {
    debugLog("paused workout");
    LabelBottom.animate("enable");
    BtnToggle.pause();
    show(BtnFinish);
    exercise.pause();
    stopMStimer();
    vibration.start("bump");
}
function resumeWorkout() {
    debugLog("resume workout");
    LabelBottom.animate("disable");
    BtnToggle.play();
    hide(BtnFinish);
    exercise.resume();

    msec = Math.floor(exercise.stats.activeTime / 100) % 10;
    ActiveTimeDisplay.setActiveTime(exercise.stats.activeTime);
    startMStimer();
    vibration.start("bump");
}
function endWorkout() {
    debugLog("dlg end");
    display.removeEventListener("change", onDisplayChangeEvent);
    exercise.stop();
    stopMStimer();
    ResultsDialog.setLabel("itm1", `${formatActiveTime(exercise.stats.activeTime || 0)}`);
    ResultsDialog.setLabel("itm2", `${exercise.stats.heartRate.average || 0} bpm avg`);
    ResultsDialog.setLabel("itm3", `${exercise.stats.heartRate.max || 0} bpm max`);
    ResultsDialog.setLabel("itm4", `${formatCalories(exercise.stats.calories || 0)} cals`);
    show(ResultsDialog.Element);
}
