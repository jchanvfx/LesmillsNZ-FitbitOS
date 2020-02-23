import clock from "clock";
import document from "document";
import * as messaging from "messaging";
import { me } from "appbit";
import { display } from "display";
import { inbox } from "file-transfer"
import { existsSync, listDirSync, readFileSync, statSync, unlinkSync } from "fs";
import { DAYS_SHORT, MONTHS, formatTo12hrTime } from "../datelib"
import { debugLog, displayElement } from "../utils"

const date = new Date();

const LM_CLASSES_FILE = "LM_classes.cbor";
let LM_CLASSES = [];

let WorkoutsList;
let LoaderOverlay;
let MessageOverlay;
let StatusBar;
let StatusBtnMenu;
let StatusBarPhone;
let MenuScreen;
let MenuBtnTimetable;
let DlgExercise;
let DlgBtnCancel;
let DlgBtnStart;

let OnFileRecievedUpdateGui;

// screen initialize.
let views;
export function init(_views) {
  views = _views;
  debugLog("workouts - init()");
  onMount();
}

// entry point when this view is mounted, setup elements and events.
function onMount() {
    clock.granularity = "minutes";

    WorkoutsList = document.getElementById("workouts-list");
    WorkoutsList.delegate = {
        getTileInfo: function(index) {
            let clsData = LM_CLASSES[index];
            return {
                index: index,
                type: "workouts-pool",
                value: clsData.name,
                color: clsData.color
            };
        },
        configureTile: function(tile, info) {
            if (info.type == "workouts-pool") {
                tile.getElementById("text").text = info.value.toUpperCase();
                tile.getElementById("ring").style.fill = info.color;
                let clickPad = tile.getElementById("click-pad");
                clickPad.onclick = evt => {
                    onTileClicked(tile);
                }
            }
        }
    };
    // WorkoutsList.length must be set AFTER WorkoutsList.delegate
    WorkoutsList.length = LM_CLASSES.length;

    LoaderOverlay = document.getElementById("loading-screen");
    MessageOverlay = document.getElementById("message-screen");
    StatusBar = document.getElementById("status-bar");
    StatusBtnMenu = StatusBar.getElementById("click-l");
    StatusBarPhone = StatusBar.getElementById("no-phone");
    displayElement(StatusBar.getElementById("click-r"), false);
    displayElement(StatusBar.getElementById("jump-to"), false);
    displayElement(
        StatusBarPhone,
        messaging.peerSocket.readyState === messaging.peerSocket.CLOSED
    );
    StatusBar.getElementById("date1").text = `${DAYS_SHORT[date.getDay()]} (Today)`;
    StatusBar.getElementById("date2").text = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    StatusBar.getElementById("time").text = formatTo12hrTime(date);

    MenuScreen = document.getElementById("menu-screen");
    MenuBtnTimetable = MenuScreen.getElementById("main-btn1");
    MenuBtnTimetable.text = "Timetable";
    MenuScreen.getElementById("main-label").text = "Switch Views >>";
    MenuScreen.getElementById("sub-label").text = "Shortcuts";
    displayElement(MenuScreen.getElementById("sub-itm1"), false);
    displayElement(MenuScreen.getElementById("sub-itm2"), false);
    displayElement(MenuScreen.getElementById("sub-itm3"), false);

    DlgExercise = document.getElementById("exe-dialog");
    DlgBtnStart = DlgExercise.getElementById("btn-right");
    DlgBtnCancel = DlgExercise.getElementById("btn-left");

    OnFileRecievedUpdateGui = false;

    // initialize list.
    updateWorkoutsList();

    // connect up add the events.
    // ----------------------------------------------------------------------------
    clock.addEventListener("tick", onTickEvent);
    document.addEventListener("keypress", onKeyPressEvent);
    StatusBtnMenu.addEventListener("click", onStatusBtnMenuClicked);
    MenuBtnTimetable.addEventListener("activate", onMenuBtnTimetableClicked);
    DlgBtnStart.addEventListener("activate", onDlgStartClicked);
    DlgBtnCancel.addEventListener("activate", onDlgCancelClicked);

    // message socket opens.
    messaging.peerSocket.onopen = () => {
        debugLog("App Socket Open");
        displayElement(StatusBarPhone, false);
    };
    // message socket closes
    messaging.peerSocket.onclose = () => {
        debugLog("App Socket Closed");
        displayElement(StatusBarPhone, true);
    };
    // message recieved.
    messaging.peerSocket.onmessage = onMessageRecieved;
    // process incomming data transfers.
    inbox.addEventListener("newfile", onDataRecieved);
}

// ----------------------------------------------------------------------------

function onTickEvent(evt) {
    StatusBar.getElementById("time").text = formatTo12hrTime(evt.date);
}
function onKeyPressEvent(evt) {
    if (evt.key === "back") {
        evt.preventDefault();
        if (MenuScreen.style.display === "inline") {
            MenuScreen.animate("disable");
            setTimeout(() => {MenuScreen.style.display = "none";}, 300);
        } else if (DlgExercise.style.display === "inline") {
            onDlgCancelClicked();
        } else {me.exit();}
    }
}
function onStatusBtnMenuClicked() {
    if (MenuScreen.style.display === "none") {
        MenuScreen.style.display = "inline";
        MenuScreen.animate("enable");
    } else {
        MenuScreen.animate("disable");
        setTimeout(() => {MenuScreen.style.display = "none";}, 300);
    }
}
function onMenuBtnTimetableClicked() {
    LM_CLASSES.length = 0;
    clock.removeEventListener("tick", onTickEvent);
    inbox.removeEventListener("newfile", onDataRecieved);
    MenuScreen.style.display = "none";
    views.navigate("timetable");
}
function onTileClicked(tile) {
    let workout = tile.getElementById("text").text;
    DlgExercise.getElementById("mixedtext").text = workout;
    tile.animate("enable");
    setTimeout(() => {DlgExercise.style.display = "inline";}, 300);
    debugLog(`${workout} tile clicked`);
};
function onDlgStartClicked() {
    debugLog("start dialog");
    let workout = DlgExercise.getElementById("mixedtext").text;
    // TODO: serialize setting to file.
    // views.navigate("exercise");
}
function onDlgCancelClicked() {
    debugLog("cancel dialog");
    DlgExercise.getElementById("mixedtext").text = "Workout";
    displayElement(DlgExercise, false);
}

// ----------------------------------------------------------------------------

// send data to companion via Messaging API
function sendValue(key, data=null) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        if (data == null) {
            messaging.peerSocket.send({key: key});
        } else {
            messaging.peerSocket.send({key: key, value: data});
        }
    }
    displayElement(
        StatusBarPhone,
        messaging.peerSocket.readyState === messaging.peerSocket.CLOSED
    );
}
// callback when file transfer has completed.
function onDataRecieved() {
    let fileName;
    while (fileName = inbox.nextFile()) {
        if (fileName === LM_CLASSES_FILE) {
            debugLog(`file ${fileName} recieved!`);
            // hide loader & message screen just incase.
            displayLoader(false);
            displayMessage(false);

            if (OnFileRecievedUpdateGui) {
                OnFileRecievedUpdateGui = false;
                updateWorkoutsList();
                display.poke();
            }
            break;
        }
    }
    displayElement(
        StatusBarPhone,
        messaging.peerSocket.readyState === messaging.peerSocket.CLOSED
    );
}
// callback when a message is recieved.
function onMessageRecieved(evt) {
    switch (evt.data.key) {
        case "lm-noClub":
            debugLog("no club selected.");
            displayLoader(false);
            displayMessage(
                true,
                "Please select a club location from the phone app settings.",
                "Club Not Set"
            );
            break;
        case "lm-clubChanged":
            if (evt.data.value) {
                display.poke();
                OnFileRecievedUpdateGui = true;
                let clubName = evt.data.value;
                debugLog(`club changed to: ${clubName}`);
                displayLoader(true, "Changing Clubs...", clubName);
            }
            break;
        case "lm-classesReply":
            if (evt.data.value) {
                debugLog(`${clubName} classes queued.`);
                if (OnFileRecievedUpdateGui) {
                    let clubName = evt.data.value;
                    displayLoader('Loading Classes...', clubName);
                }
            } else {
                debugLog("classes reply");
            }
            break;
        case "lm-noClasses":
            debugLog("no classes.");
            displayLoader(false);
            displayMessage(
                true,
                "Failed to retrive group fitness workouts from database.",
                "No Classes"
            );
            break;
        default:
            return;
    }
}

// CLASSES LIST
// ----------------------------------------------------------------------------

// toggle message screen widget visibility.
function displayMessage(display=true, text="", title="") {
    let mixedText = MessageOverlay.getElementById("#mixedtext");
    let mixedTextBody = mixedText.getElementById("copy");
    mixedText.text = display ? title : "";
    mixedTextBody.text = display ? text : "";
    displayElement(MessageOverlay, display);
}
// toggle loading screen widget visibility.
function displayLoader(display=true, text="", subText="") {
    LoaderOverlay.getElementById("text").text = text;
    LoaderOverlay.getElementById("sub-text").text = subText;
    LoaderOverlay.animate(display ? "enable" : "disable");
    displayElement(LoaderOverlay, display);
}
// update list with avaliable workout classes.
function updateWorkoutsList() {
    displayElement(WorkoutsList, false);
    displayLoader(true, "Loading Classes...", "www.lesmills.co.nz");

    LM_CLASSES.length = 0;
    if (existsSync("/private/data/" + LM_CLASSES_FILE)) {
        LM_CLASSES = readFileSync(LM_CLASSES_FILE, "cbor");
    }
    debugLog(`numer of classes ${LM_CLASSES.length}`);

    if (LM_CLASSES.length != 0) {
        debugLog(`Loading data file: ${LM_CLASSES_FILE}`);

        // refresh to the list.
        WorkoutsList.length = LM_CLASSES.length;
        WorkoutsList.redraw();

        displayElement(WorkoutsList, true);
        displayLoader(false);

        // request background update if the file modified is more than 5 days old.
        let mTime = statSync(LM_CLASSES_FILE).mtime;
        let timeDiff = Math.round(Math.abs(date - mTime) / 36e5);
        if (timeDiff > 120) {
            debugLog(`File ${LM_CLASSES_FILE} outdated by ${timeDiff}hrs`);
            OnFileRecievedUpdateGui = false;
            sendValue("lm-classes");
        } else {
            displayElement(
                StatusBarPhone,
                messaging.peerSocket.readyState === messaging.peerSocket.CLOSED
            );
        }

        return;
    }

    debugLog('Fetching Database...');
    OnFileRecievedUpdateGui = true;
    sendValue("lm-classes");
    display.poke();
}