import document from "document";
import * as dateTime from "../datelib"
import * as messaging from "messaging";
import { inbox } from "file-transfer"
import { readFileSync, listDirSync, unlinkSync } from "fs";

const LM_PREFIX = "LM_dat";
const TIMETABLE = [];

let TimetableList;
let LoaderOverlay;
let StatusBar;
let StatusBtnMenu;
let StatusBtnRefresh;
let StatusBarPhone;
let MessageOverlay;
let MenuScreen;
let MenuBtn1;
let MenuBtn2;
let MenuBtn3;

let OnFileRecievedUpdateGui;
let CurrentDayKey;

const date1 = new Date();
const date2 = new Date();
date1.setDate(date1.getDate() + 1);
date2.setDate(date2.getDate() + 2);

// screen initialize.
let views;
export function init(_views) {
    views = _views;
    console.log("view-1 init()");
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
    MenuBtn1 = MenuScreen.getElementById("btn1");
    MenuBtn2 = MenuScreen.getElementById("btn2");
    MenuBtn3 = MenuScreen.getElementById("btn3");

    MenuBtn1.text =
        `${dateTime.getDayShortName()} ` +
        `${dateTime.getDate()} ` +
        `${dateTime.getMonthShortName()}`;
    MenuBtn2.text =
        `${dateTime.DAYS_SHORT[date1.getDay()]} ` +
        `${date1.getDate()} ` +
        `${dateTime.MONTHS_SHORT[date1.getMonth()]} `;
    MenuBtn3.text =
        `${dateTime.DAYS_SHORT[date2.getDay()]} ` +
        `${date2.getDate()} ` +
        `${dateTime.MONTHS_SHORT[date2.getMonth()]}`;

    TIMETABLE.length = 0;

    StatusBar.getElementById("date1").text = `${dateTime.getDayShortName()} (Today)`;
    StatusBar.getElementById("date2").text = dateTime.getDate() + " " + dateTime.getMonthName();
    StatusBar.getElementById("time").text = dateTime.getTime12hr();

    let date = dateTime.getDateObj();
    CurrentDayKey = `${date.getDay()}${date.getDate()}${date.getMonth()}`;
    OnFileRecievedUpdateGui = false;

    // initialize here.
    buildTimetable();
    connectEvents();
    setTimetableDay(CurrentDayKey);
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        displayElement(StatusBarPhone, false);
    }
}
// connect up add the events.
function connectEvents() {
    // update the time.
    dateTime.registerCallback(onTimeUpdate);
    // message socket opens.
    messaging.peerSocket.onopen = onConnectionOpen;
    // message socket closes
    messaging.peerSocket.onclose = onConnectionClosed;
    // message recieved.
    messaging.peerSocket.onmessage = onMessageRecieved;
    // process incomming data transfers.
    inbox.addEventListener("newfile", onDataRecieved);
    // button events.
    StatusBtnMenu.addEventListener("click", onStatusBtnMenuClicked);
    StatusBtnRefresh.addEventListener("click", onStatusBtnRefreshClicked);
    MenuBtn1.addEventListener("activate", onMenuBtn1Clicked);
    MenuBtn2.addEventListener("activate", onMenuBtn2Clicked);
    MenuBtn3.addEventListener("activate", onMenuBtn3Clicked);
};

// Util Methods
//-----------------------------------------------------------------------------

// local file reader.
function readFile(fileName) {
    let data = {};
    let dirIter;
    let listDir = listDirSync("/private/data");
    while((dirIter = listDir.next()) && !dirIter.done) {
        if (dirIter.value == fileName) {
            data = readFileSync(fileName, "cbor");
            break;
        }
    }
    return data;
}

// TODO: node version doesn't support ecmascript6 features.
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

// NOT SURE WHY THE FUCK STARTS WITH IS NOT WORKING...............

// clean up old local data files.
function cleanUpFiles() {
    let date = dateTime.getDateObj();
    let keepList = [
        `${LM_PREFIX}${date.getDay()}${date.getDate()}${date.getMonth()}.cbor`,
        `${LM_PREFIX}${date1.getDay()}${date1.getDate()}${date1.getMonth()}.cbor`,
        `${LM_PREFIX}${date2.getDay()}${date2.getDate()}${date2.getMonth()}.cbor`,
    ];
    let dirIter;
    let listDir = listDirSync("/private/data");
    while((dirIter = listDir.next()) && !dirIter.done) {
        if (dirIter.value === undefined) {continue;}
        let startsWithPrefix = dirIter.value.startsWith(LM_PREFIX);
        console.log(`Remove: ${dirIter.value}`);
        // if (startsWithPrefix.toString() == "true") {
        //     if (!keepList.includes(dirIter.value)) {
        //         console.log('DEL');
        //         // unlinkSync(dirIter.value);
        //     }
        // }
    }
}

// Event Methods
//-----------------------------------------------------------------------------

// send data to companion via Messaging API
function sendValue(key, data=null) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        if (data == null) {
            messaging.peerSocket.send({key: key});
        } else {
            messaging.peerSocket.send({key: key, value: data});
        }
    } else if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
        displayElement(StatusBarPhone, true);
    }
}

// callback when file transfer has completed.
function onDataRecieved() {
    let filename;
    let CurrentDayKeyFile = `${LM_PREFIX}${CurrentDayKey}.cbor`;
    while (filename = inbox.nextFile()) {
        if (filename == CurrentDayKeyFile) {
            console.log(`File ${filename} recieved!`);
            // hide loader & message screen just incase.
            displayLoader(false);
            displayMessage(false);

            // update timetable if specified.
            if (OnFileRecievedUpdateGui) {
                OnFileRecievedUpdateGui = false;
                setTimetableDay(CurrentDayKey);
            }
        }
    }
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        displayElement(StatusBarPhone, false);
    } else {
        displayElement(StatusBarPhone, true);
    }
}
// callback when a message is recieved.
function onMessageRecieved(evt) {
    switch (evt.data.key) {
        case "lm-noClub":
            console.log("no club selected.");
            displayMessage(
                true,
                "Please set a LesMills club location from the phone app settings.",
                "Club Not Set"
            );
            break;
        case "lm-clubChanged":
            if (evt.data.value) {
                // TODO: poke display.
                OnFileRecievedUpdateGui = true;
                let clubName = evt.data.value;
                console.log(`Club changed to: ${clubName}`);
                displayLoader(true, "Changing Clubs...", clubName);
            }
            break;
        case "lm-fetchReply":
            if (OnFileRecievedUpdateGui) {
                // TODO: poke display.
                let clubName = evt.data.value;
                displayLoader(true, "Retrieving Timetable...", clubName);
            }
            break;
        case "lm-dataQueued":
            console.log('FileTransfer data has been queued');
            // TODO: propt loading screen. ("waiting for data")
            break;
        default:
            return;
    }
}
// callback message socket opens.
function onConnectionOpen() {
    console.log("App Socket Open");
}
// callback message socket closes.
function onConnectionClosed() {
    console.log("App Socket Closed");
}
// time update callback.
function onTimeUpdate(data) {
    StatusBar.getElementById("time").text = data.time;
};

// Button Methods
//-----------------------------------------------------------------------------

// callback for the status bar menu button.
function onStatusBtnMenuClicked() {
    if (MenuScreen.style.display == "inline") {
        MenuScreen.animate("disable");
        setTimeout(() => {MenuScreen.style.display = "none";}, 800);
        return;
    }
    MenuScreen.style.display = "inline";
    MenuScreen.animate("enable");
}
// callback for the status refresh button.
function onStatusBtnRefreshClicked() {
    console.log("Refresh Clicked");
    let currentIdx = 0;
    let date = dateTime.getDateObj();
    let time;
    for (let i = 0; i < TIMETABLE.length; i++) {
        time = new Date(TIMETABLE[i].date);
        if (time - date > 0) {currentIdx = i; break;}
    }
    TimetableList.value = currentIdx;
}
// callback menu buttons.
function onMenuBtn1Clicked() {
    StatusBar.getElementById("date1").text = `${dateTime.getDayShortName()} (Today)`;
    MenuScreen.animate("disable");
    setTimeout(() => {MenuScreen.style.display = "none";}, 800);
    let date = dateTime.getDateObj();
    CurrentDayKey = `${date.getDay()}${date.getDate()}${date.getMonth()}`;
    setTimetableDay(CurrentDayKey);
}
function onMenuBtn2Clicked() {
    StatusBar.getElementById("date1").text = `${dateTime.DAYS_SHORT[date1.getDay()]}`;
    MenuScreen.animate("disable");
    setTimeout(() => {MenuScreen.style.display = "none";}, 800);
    CurrentDayKey = `${date1.getDay()}${date1.getDate()}${date1.getMonth()}`;
    setTimetableDay(CurrentDayKey);
}
function onMenuBtn3Clicked() {
    StatusBar.getElementById("date1").text = `${dateTime.DAYS_SHORT[date2.getDay()]}`;
    MenuScreen.animate("disable");
    setTimeout(() => {MenuScreen.style.display = "none";}, 800);
    CurrentDayKey = `${date2.getDay()}${date2.getDate()}${date2.getMonth()}`;
    setTimetableDay(CurrentDayKey);
}

// Gui Methods
//-----------------------------------------------------------------------------

// toggle widget visibility.
function displayElement(element, display=true) {
    element.style.display = display ? "inline" : "none";
}
// toggle message overlay widget visibility.
function displayMessage(display=true, text="", title="") {
    let mixedText = MessageOverlay.getElementById("#mixedtext");
    let mixedTextBody = mixedText.getElementById("copy");
    mixedText.text = display ? title : "";
    mixedTextBody.text = display ? text : "";
    displayElement(MessageOverlay, display);
}
// toggle loading screen widget visibility.
function displayLoader(display=true, text="loading...", subText="") {
    LoaderOverlay.getElementById("text").text = text;
    LoaderOverlay.getElementById("sub-text").text = subText;
    LoaderOverlay.animate(display ? "enable" : "disable");
    displayElement(LoaderOverlay, display);
}

// initialize timetable list.
function buildTimetable() {
    TimetableList.delegate = {
        getTileInfo: index => {
            if (TIMETABLE.length != 0) {
                let tileInfo = TIMETABLE[index];
                return {
                    index: index,
                    type: "lm-pool",
                    name: tileInfo.name,
                    instructor: tileInfo.instructor,
                    date: tileInfo.date,
                    desc: tileInfo.desc,
                    color: (tileInfo.color !== null) ? tileInfo.color : "#545454",
                    finished: tileInfo.finished,
                };
            } else {
                // need this here or we'll get a "Error 22 Critical glue error"
                return {
                    index: index,
                    type: "lm-pool",
                    name: "{no data}",
                    instructor: "---",
                    date: dateTime.getDateObj(),
                    desc: "---",
                    color: "",
                    finished: true,
                };
            }
        },
        configureTile: (tile, info) => {
            if (info.type == "lm-pool") {
                let itmDate = new Date(info.date);
                tile.getElementById("text-title").text = info.name.toUpperCase();
                tile.getElementById("text-subtitle").text = info.instructor;
                tile.getElementById("text-L").text = dateTime.formatTo12hrTime(itmDate);
                tile.getElementById("text-R").text = info.desc;
                if (info.finished) {
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
    TimetableList.length = 10;
}

// set the timetable list with specified day.
function setTimetableDay(dKey, jumpToIndex=true) {
    // find data file eg. "LM_dat123.cbor"
    // return: "{fetched: <tstamp>, value: <array>}"
    let data = readFile(LM_PREFIX + dKey + ".cbor");

    if (data.fetched && data.value) {
        console.log("Found Data...");

        // find next class index.
        let currentIdx = 0;
        let date = dateTime.getDateObj();
        let time;
        for (let i = 0; i < data.value.length; i++) {
            time = new Date(data.value[i].date);
            if (time - date > 0) {currentIdx = i; break;}
        }

        // re-populate the timetable store array.
        TIMETABLE.length = 0;
        for (let i = 0; i < data.value.length; i++) {
            let itm = data.value[i];
            itm.finished = (i < currentIdx);
            TIMETABLE.push(itm);
        }

        // refresh to the list.
        TimetableList.length = TIMETABLE.length;
        TimetableList.redraw();

        // jump to latest tile.
        if (jumpToIndex) {
            TimetableList.value = currentIdx;
        }

        displayElement(TimetableList, true);

        // request background update if last sync is more than 48hrs ago
        // then fetch data in the background.
        let fetchedTime = new Date(data['fetched']);
        let timeDiff = Math.round(Math.abs(date - fetchedTime) / 36e5);
        if (timeDiff < 48) {
            OnFileRecievedUpdateGui = false;
            sendValue("lm-fetch");
        }

        cleanUpFiles();
        return;
    }

    console.log('Requesting Data...');
    OnFileRecievedUpdateGui = true;
    sendValue("lm-fetch");
    displayElement(TimetableList, false);
    cleanUpFiles();
}
