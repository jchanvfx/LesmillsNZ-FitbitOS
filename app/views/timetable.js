import clock from "clock";
import document from "document";
import * as messaging from "messaging";
import { me } from "appbit";
import { display } from "display";
import { inbox } from "file-transfer"
import { existsSync, listDirSync, readFileSync, statSync, unlinkSync } from "fs";
import { DAYS_SHORT, MONTHS_SHORT, MONTHS, formatTo12hrTime } from "../datelib"
import { debugLog } from "../utils"

const LM_PREFIX = "LM_dat";
let LM_TIMETABLE = [];

let TimetableList;
let LoaderOverlay;
let StatusBar;
let StatusBtnMenu;
let StatusBtnRefresh;
let StatusBarPhone;
let MessageOverlay;
let MenuScreen;
let MenuBtnWorkout;
let MenuBtn1;
let MenuBtn2;
let MenuBtn3;

let OnFileRecievedUpdateGui;
let CurrentDayKey;

const date = new Date();
const date1 = new Date();
const date2 = new Date();
date1.setDate(date1.getDate() + 1);
date2.setDate(date2.getDate() + 2);

// screen initialize.
let views;
export function init(_views) {
    views = _views;
    debugLog("timetable init()");
    onMount();
}

// entry point when this view is mounted, setup elements and events.
function onMount() {
    TimetableList = document.getElementById("lm-class-list");
    LoaderOverlay = document.getElementById("loading-screen");
    StatusBar = document.getElementById("status-bar");
    StatusBtnMenu = StatusBar.getElementById("click-l");
    StatusBtnRefresh = StatusBar.getElementById("click-r");
    StatusBarPhone = StatusBar.getElementById("no-phone");
    MessageOverlay = document.getElementById("message-screen");
    MenuScreen = document.getElementById("menu-screen");
    MenuBtnWorkout = MenuScreen.getElementById("btn_classes");
    MenuBtn1 = MenuScreen.getElementById("btn1");
    MenuBtn2 = MenuScreen.getElementById("btn2");
    MenuBtn3 = MenuScreen.getElementById("btn3");

    MenuBtn1.text =
        `${DAYS_SHORT[date.getDay()]} ` +
        `${date.getDate()} ` +
        `${MONTHS_SHORT[date.getMonth()]}`;
    MenuBtn2.text =
        `${DAYS_SHORT[date1.getDay()]} ` +
        `${date1.getDate()} ` +
        `${MONTHS_SHORT[date1.getMonth()]} `;
    MenuBtn3.text =
        `${DAYS_SHORT[date2.getDay()]} ` +
        `${date2.getDate()} ` +
        `${MONTHS_SHORT[date2.getMonth()]}`;

    StatusBar.getElementById("date1").text = `${DAYS_SHORT[date.getDay()]} (Today)`;
    StatusBar.getElementById("date2").text = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    StatusBar.getElementById("time").text = formatTo12hrTime(date);

    CurrentDayKey = `${date.getDay()}${date.getDate()}${date.getMonth()}`;
    OnFileRecievedUpdateGui = false;

    // initialize here.
    buildTimetable();
    setTimetableDay(CurrentDayKey);

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
    document.addEventListener("keypress", evt => {
        if (evt.key === "back") {
            evt.preventDefault();
            if (MenuScreen.style.display === "inline") {
                MenuScreen.animate("disable");
                setTimeout(() => {MenuScreen.style.display = "none";}, 300);
            } else {
                me.exit();
            }
        }
    });
    StatusBtnMenu.addEventListener("click", () => {
        if (MenuScreen.style.display === "none") {
            MenuScreen.style.display = "inline";
            MenuScreen.animate("enable");
        } else {
            MenuScreen.animate("disable");
            setTimeout(() => {MenuScreen.style.display = "none";}, 300);
        }
    });
    StatusBtnRefresh.addEventListener("click", () => {
        debugLog("Refresh Clicked");
        let currentIdx = 0;
        let time;
        let i = LM_TIMETABLE.length, x = -1;
        while (i--) {
            x++;
            time = new Date(LM_TIMETABLE[x].date);
            if (time - date > 0) {currentIdx = x; break;}
        }
        TimetableList.value = currentIdx;
    });
    MenuBtnWorkout.addEventListener("activate", onMenuBtnWorkoutClicked);
    MenuBtn1.addEventListener("activate", onMenuBtn1Clicked);
    MenuBtn2.addEventListener("activate", onMenuBtn2Clicked);
    MenuBtn3.addEventListener("activate", onMenuBtn3Clicked);
}

// Utils
// ----------------------------------------------------------------------------

// clock update.
function tickHandler(evt) {
    StatusBar.getElementById("time").text = formatTo12hrTime(evt.date);
}

// clean up old local data files.
function cleanUpFiles() {
    let keepList = [
        `${LM_PREFIX}${date.getDay()}${date.getDate()}${date.getMonth()}.cbor`,
        `${LM_PREFIX}${date1.getDay()}${date1.getDate()}${date1.getMonth()}.cbor`,
        `${LM_PREFIX}${date2.getDay()}${date2.getDate()}${date2.getMonth()}.cbor`,
    ];
    let dirIter;
    let listDir = listDirSync("/private/data");
    while((dirIter = listDir.next()) && !dirIter.done) {
        if (dirIter.value === undefined) {continue;}

        // ECMAScript 5.1 doesn't support "String.startsWith()" and "Array.includes()"
        if (dirIter.value.indexOf(LM_PREFIX) === 0) {
            if (keepList.indexOf(dirIter.value) < 0) {
                unlinkSync(dirIter.value);
                debugLog(`Deleted: ${dirIter.value}`);
            }
        }
    }
}

// Messaging
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
    let CurrentDayKeyFile = `${LM_PREFIX}${CurrentDayKey}.cbor`;
    while (fileName = inbox.nextFile()) {
        if (fileName === CurrentDayKeyFile) {
            debugLog(`File ${fileName} recieved!`);
            // hide loader & message screen just incase.
            displayLoader(false);
            displayMessage(false);

            // update timetable if specified.
            if (OnFileRecievedUpdateGui) {
                OnFileRecievedUpdateGui = false;
                setTimetableDay(CurrentDayKey);
                display.poke();
            }
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
                "Please set a club location from the phone app settings.",
                "Club Not Set"
            );
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
        case "lm-fetchReply":
            if (OnFileRecievedUpdateGui) {
                display.poke();
                let clubName = evt.data.value;
                displayLoader(true, "Retrieving Timetable...", clubName);
            }
            break;
        case "lm-dataQueued":
            let clubName = evt.data.value;
            debugLog(`FileTransfer data has been queued: ${clubName}`);
            if (LoaderOverlay.style.display === 'inline') {
                displayLoader(true, "Waiting for Data...", clubName);
            }
            break;
        default:
            return;
    }
}

// Buttons
// ----------------------------------------------------------------------------

// Menu Screen.
function onMenuBtnWorkoutClicked () {
    clock.removeEventListener("tick", tickHandler);
    MenuScreen.style.display = "none";
    views.navigate("classes");
}
function onMenuBtn1Clicked() {
    MenuScreen.style.display = "none";
    StatusBar.getElementById("date1").text = `${DAYS_SHORT[date.getDay()]} (Today)`;
    StatusBar.getElementById("date2").text = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    CurrentDayKey = `${date.getDay()}${date.getDate()}${date.getMonth()}`;
    setTimetableDay(CurrentDayKey);
}
function onMenuBtn2Clicked() {
    MenuScreen.style.display = "none";
    StatusBar.getElementById("date1").text = `${DAYS_SHORT[date1.getDay()]}`;
    StatusBar.getElementById("date2").text = `${date1.getDate()} ${MONTHS[date1.getMonth()]}`;
    CurrentDayKey = `${date1.getDay()}${date1.getDate()}${date1.getMonth()}`;
    setTimetableDay(CurrentDayKey);
}
function onMenuBtn3Clicked() {
    MenuScreen.style.display = "none";
    StatusBar.getElementById("date1").text = `${DAYS_SHORT[date2.getDay()]}`;
    StatusBar.getElementById("date2").text = `${date2.getDate()} ${MONTHS[date2.getMonth()]}`;
    CurrentDayKey = `${date2.getDay()}${date2.getDate()}${date2.getMonth()}`;
    setTimetableDay(CurrentDayKey);
}

// Gui
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

// initialize timetable list.
function buildTimetable() {
    TimetableList.delegate = {
        getTileInfo: index => {
            let tileInfo = LM_TIMETABLE[index];
            return {
                index: index,
                type: "lm-pool",
                name: tileInfo.name,
                instructor: tileInfo.instructor,
                date: tileInfo.date,
                desc: tileInfo.desc,
                color: (tileInfo.color !== null) ? tileInfo.color : "#545454",
            };
        },
        configureTile: (tile, info) => {
            if (info.type == "lm-pool") {
                let itmDate = new Date(info.date);
                tile.getElementById("text-title").text = info.name.toUpperCase();
                tile.getElementById("text-subtitle").text = info.instructor;
                tile.getElementById("text-L").text = formatTo12hrTime(itmDate);
                tile.getElementById("text-R").text = info.desc;
                if (itmDate - date < 0) {
                    tile.getElementById("text-title").style.fill = "#6e6e6e";
                    tile.getElementById("text-subtitle").style.fill = "#4f4f4f";
                    tile.getElementById("text-L").style.fill = "#6e6e6e";
                    tile.getElementById("text-R").style.fill = "#6e6e6e";
                    tile.getElementById("color").style.fill = "#4f4f4f";
                } else {
                    tile.getElementById("text-title").style.fill = "white";
                    tile.getElementById("text-subtitle").style.fill = "white";
                    tile.getElementById("text-L").style.fill = "white";
                    tile.getElementById("text-R").style.fill = "white";
                    tile.getElementById("color").style.fill = info.color;
                }
            }
        }
    }
    // TimetableList.length must be set AFTER TimetableList.delegate
    TimetableList.length = 0;
}

// populate timetable list with specified day.
function setTimetableDay(dKey, jumpToIndex=true) {
    displayElement(TimetableList, false);
    displayLoader(true, "Loading Timetable...");

    let fileName = `${LM_PREFIX}${dKey}.cbor`

    // load locally fetched data file locally eg. "LM_dat123.cbor"
    LM_TIMETABLE.length = 0;
    if (existsSync("/private/data/" + fileName)) {
        LM_TIMETABLE = readFileSync(fileName, "cbor");
    }

    if (LM_TIMETABLE.length != 0) {
        debugLog(`Loading data file: ${fileName}`);

        setTimeout(() => {

            // find next class index.
            let currentIdx = 0;
            let time;
            let i = LM_TIMETABLE.length, x = -1;
            while (i--) {
                x++;
                time = new Date(LM_TIMETABLE[x].date);
                if (time - date > 0) {currentIdx = x; break;}
            }

            // refresh to the list.
            TimetableList.length = LM_TIMETABLE.length;
            TimetableList.redraw();

            // jump to latest tile.
            if (jumpToIndex) {
                TimetableList.value = currentIdx;
            }

            displayElement(TimetableList, true);
            displayLoader(false);

            // request background update if the file modified is more than 48hrs old.
            // then fetch data in the background.
            let mTime = statSync(fileName).mtime;
            let timeDiff = Math.round(Math.abs(date - mTime) / 36e5);
            if (timeDiff > 48) {
                debugLog(`File ${fileName} outdated by ${timeDiff}hrs`);
                OnFileRecievedUpdateGui = false;
                sendValue("lm-fetch");
            } else {
                displayElement(
                    StatusBarPhone,
                    messaging.peerSocket.readyState === messaging.peerSocket.CLOSED
                );
            }

        }, 500);

        display.poke()
        cleanUpFiles();
        return;
    }

    debugLog('Fetching Database...');
    OnFileRecievedUpdateGui = true;
    displayLoader(true, "Requesting Timetable...", "www.lesmills.co.nz");
    sendValue("lm-fetch");
    cleanUpFiles();

    // Give 6 second period before displaying connection lost or retry.
    setTimeout(() => {
        if (LoaderOverlay.style.display === 'inline') {
            if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
                displayLoader(false);
                displayMessage(
                    true,
                    "Failed to retrive data from phone.",
                    "Connection Lost"
                );
            } else {
                displayLoader(true, "Reconnecting...", "www.lesmills.co.nz");
                sendValue("lm-fetch");
            }
        }
        display.poke()
    }, 6000);
}