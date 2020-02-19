import clock from "clock";
import document from "document";
import * as messaging from "messaging";
import { me } from "appbit";
import { display } from "display";
import { inbox } from "file-transfer"
import { existsSync, listDirSync, readFileSync, statSync, unlinkSync } from "fs";
import { DAYS_SHORT, MONTHS_SHORT, MONTHS, formatTo12hrTime } from "../datelib"
import { debugLog } from "../utils"

const LM_CLASSES_FILE = "LM_classes.cbor";
let LM_CLASSES = [];

let StatusBar;
let StatusBtnMenu;
let StatusBarPhone;
let MenuScreen;
let MenuBtnTimetable;

const date = new Date();

let OnFileRecievedUpdateGui;

// screen initialize.
let views;
export function init(_views) {
  views = _views;
  debugLog("classes init()");
  onMount();
}

// entry point when this view is mounted, setup elements and events.
function onMount() {
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

    // initialize.
    // updateFitnessClassesList();
  
    let foo = document.getElementById("main-btn");
    foo.addEventListener("activate", () => {
        sendValue("lm-classes");
    });


    // connect up add the events.
    // ----------------------------------------------------------------------------

    // register time callback.
    clock.granularity = "minutes";
    clock.addEventListener("tick", tickHandler);
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
    // button events.
    document.addEventListener("keypress", onKeyPressEvent);
    StatusBtnMenu.addEventListener("click", onStatusBtnMenuClicked);
    MenuBtnTimetable.addEventListener("activate", onMenuBtnTimetableClicked);
}

// BUTTON
// ----------------------------------------------------------------------------

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
function onMenuBtnTimetableClicked () {
    clock.removeEventListener("tick", tickHandler);
    MenuScreen.style.display = "none";
    views.navigate("timetable");
}

// EVENTS
// ----------------------------------------------------------------------------

// clock update.
function tickHandler(evt) {
    StatusBar.getElementById("time").text = formatTo12hrTime(evt.date);
}

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
        case "lm-classesReply":
            if (evt.data.value) {
                let clubName = evt.data.value;
                debugLog(`${clubName} classes queued.`);
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

// Gui
// ----------------------------------------------------------------------------

// toggle element visibility.
function displayElement(element, display=true) {
    element.style.display = display ? "inline" : "none";
}
