import clock from "clock";
import document from "document";
import * as messaging from "messaging";
import { me } from "appbit";
import { display } from "display";
import { inbox } from "file-transfer"
import { existsSync, listDirSync, readFileSync, statSync, unlinkSync } from "fs";
import { DAYS_SHORT, MONTHS_SHORT, MONTHS, formatTo12hrTime } from "../datelib"
import { debugLog } from "../utils"

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
            return {
                type: "workouts-pool",
                value: LM_CLASSES[index],
                index: index
            };
        },
        configureTile: function(tile, info) {
            if (info.type == "workouts-pool") {
                tile.getElementById("text").text = info.value.toUpperCase();
                let clickPad = tile.getElementById("click-pad");
                clickPad.onclick = evt => {
                    tile.getElementById("overlay").animate("enable");
                    // onTileClicked(info.value.toUpperCase());
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
    MenuScreen.getElementById("main-label").text = "Timetable Schedule";
    displayElement(MenuScreen.getElementById("sub-itm-label"), false);
    displayElement(MenuScreen.getElementById("sub-itm1"), false);
    displayElement(MenuScreen.getElementById("sub-itm2"), false);
    displayElement(MenuScreen.getElementById("sub-itm3"), false);

    OnFileRecievedUpdateGui = false;

    // initialize list.
    updateWorkoutsList();

    // connect up add the events.
    // ----------------------------------------------------------------------------
    clock.addEventListener("tick", onTickEvent);
    document.addEventListener("keypress", onKeyPressEvent);
    StatusBtnMenu.addEventListener("click", onStatusBtnMenuClicked);
    MenuBtnTimetable.addEventListener("activate", onMenuBtnTimetableClicked);

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
    clock.removeEventListener("tick", onTickEvent);
    inbox.removeEventListener("newfile", onDataRecieved);
    MenuScreen.style.display = "none";
    views.navigate("timetable");
}
function onTileClicked(workout) {
    debugLog(workout);
};

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
            debugLog(`File ${fileName} recieved!`);
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
            break;
        case "lm-clubChanged":
            if (evt.data.value) {
                display.poke();
                OnFileRecievedUpdateGui = true;
                let clubName = evt.data.value;
                debugLog(`Club changed to: ${clubName}`);
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
            break;
        default:
            return;
    }
}

// CLASSES LIST
// ----------------------------------------------------------------------------

// toggle element visibility.
function displayElement(element, display=true) {
    element.style.display = display ? "inline" : "none";
}
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