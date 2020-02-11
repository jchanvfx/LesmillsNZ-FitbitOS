import document from "document";
import * as dateTime from "../datelib"
import * as messaging from "messaging";
import { inbox } from "file-transfer"
import { readFileSync, listDirSync } from "fs";

const LM_FILE = "LM_TIMETABLE.cbor";
const TIMETABLE = [];
let TimetableList;
let LoaderOverlay;
let StatusBar;
let StatusBtnMenu;
let StatusBtnRefresh;
let StatusBarPhone;
let MenuScreen;
let MenuBtn1;
let MenuBtn2;
let MenuBtn3;
let OnFileRecievedUpdateGui;

let views;

export function init(_views) {
    views = _views;
    console.log("view-1 init()");
    onMount();
}

// when this view is mounted, setup elements and events.
function onMount() {
    TIMETABLE.length = 0;
    TimetableList = document.getElementById("lm-class-list");
    LoaderOverlay = document.getElementById("loading-screen");
    StatusBar = document.getElementById("status-bar");
    StatusBar.getElementById("date1").text = `${dateTime.getDayShortName()} (Today)`;
    StatusBar.getElementById("date2").text = dateTime.getDate() + " " + dateTime.getMonthName();
    StatusBar.getElementById("time").text = dateTime.getTime12hr();
    StatusBtnMenu = StatusBar.getElementById("click-l");
    StatusBtnRefresh = StatusBar.getElementById("click-r");
    StatusBarPhone = StatusBar.getElementById("no-phone");
    MenuScreen = document.getElementById("menu-screen");
    MenuBtn1 = MenuScreen.getElementById("btn1");
    MenuBtn2 = MenuScreen.getElementById("btn2");
    MenuBtn3 = MenuScreen.getElementById("btn3");
    OnFileRecievedUpdateGui = false;

    buildTimetable();
    initTimetable();
    connectEvents();

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
// callback for the status bar menu button.
function onStatusBtnMenuClicked() {
    let date1 = new Date();
    let date2 = new Date();
    date1.setDate(date1.getDate() + 1);
    date2.setDate(date2.getDate() + 2);
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
    MenuScreen.style.display = "inline";
    MenuScreen.animate("enable");
}
// callback for the status refresh button.
function onStatusBtnRefreshClicked() {
    console.log("Refresh Clicked");
}
// callback menu buttons.
function onMenuBtn1Clicked() {
    StatusBar.getElementById("date1").text = `${dateTime.getDayShortName()} (Today)`;
    MenuScreen.animate("disable");
    setTimeout(() => {MenuScreen.style.display = "none";}, 800);
}
function onMenuBtn2Clicked() {
    let date = new Date();
    date.setDate(date.getDate() + 1);
    StatusBar.getElementById("date1").text = `${dateTime.DAYS_SHORT[date.getDay()]}`;
    MenuScreen.animate("disable");
    setTimeout(() => {MenuScreen.style.display = "none";}, 800);
}
function onMenuBtn3Clicked() {
    let date = new Date();
    date.setDate(date.getDate() + 2);
    StatusBar.getElementById("date1").text = `${dateTime.DAYS_SHORT[date.getDay()]}`;
    MenuScreen.animate("disable");
    setTimeout(() => {MenuScreen.style.display = "none";}, 800);
}

// callback when file transfer has completed.
function onDataRecieved() {
    let filename;
    while (filename = inbox.nextFile()) {
        if (filename == LM_FILE) {
            console.log(`File ${LM_FILE} recieved!`);

            // update timetable if specified.
            if (OnFileRecievedUpdateGui) {
                OnFileRecievedUpdateGui = false;
                let data = readFileSync(LM_FILE, "cbor");
                updateTimetable(data);
                displayElement(TimetableList, true);
                displayLoader(false);
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
            // TODO: prompt no club selected warning.
            break;
        case "lm-clubChanged":
            if (evt.data.value) {
                let clubName = evt.data.value;
                console.log(`Club changed to: ${clubName}`);
                // TODO: propt loading screen with club name.
            }
            break;
        case "lm-fetchReply":
            if (OnFileRecievedUpdateGui) {
                let clubName = evt.data.value;
                displayLoader(true, "Retrieving Timetable...", clubName);
            }
            break;
        case "lm-dataQueued":
            console.log('FileTransfer data has been queued');
            // TODO: propt loading screen.
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
// load timetable data and intialize the list UI
function initTimetable() {
    let data = readFile(LM_FILE);
    let date = dateTime.getDateObj();
    let dKey = `${date.getDay()}${date.getDate()}${date.getMonth()}`;
    if (dKey in data) {
        updateTimetable(data);
        displayElement(TimetableList, true);
        // request background update if last sync is more than 48hrs ago
        // then fetch data in the background.
        let fetchedTime = new Date(data['fetched']);
        let timeDiff = Math.round(Math.abs(date - fetchedTime) / 36e5);
        if (timeDiff < 48) {
            OnFileRecievedUpdateGui = false;
            sendValue("lm-fetch");
        }
        return;
    }

    console.log('Requesting Data...');
    OnFileRecievedUpdateGui = true;
    sendValue("lm-fetch");
    displayElement(TimetableList, false);

    // TODO: display phone connection lost screen if socket closed.
}

// Gui Methods
//-----------------------------------------------------------------------------

// toggle widget visibility.
function displayElement(element, display=true) {
    element.style.display = display ? "inline" : "none";
}

// toggle loading screen widget visibility.
function displayLoader(display=true, text="loading...", subText="") {
    LoaderOverlay.getElementById("text").text = text;
    LoaderOverlay.getElementById("sub-text").text = subText;
    LoaderOverlay.animate(display ? "enable" : "disable");
    LoaderOverlay.style.display = display ? "inline" : "none";
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

// update the timetable list
function updateTimetable(data, jumpToIndex=true) {
    // find nearest class index.
    let currentIdx = 0;
    let date = dateTime.getDateObj();
    let dKey = `${date.getDay()}${date.getDate()}${date.getMonth()}`;
    if (dKey in data) {
        let timetable = data[dKey.toString()];
        let time;
        for (var i = 0; i < timetable.length; i++) {
            time = new Date(timetable[i].date);
            if (time - date > 0) {currentIdx = i; break;}
        }
    }
    // repopulate the timetable array.
    TIMETABLE.length = 0;
    if (dKey in data) {
        for (var i = 0; i < data[dKey.toString()].length; i++) {
            let itm = data[dKey.toString()][i];
            itm.finished = (i < currentIdx);
            TIMETABLE.push(itm);
        }
    }
    // workaround to refresh to the list.
    TimetableList.length = 0;
    TimetableList.redraw();
    TimetableList.length = TIMETABLE.length;
    TimetableList.redraw();
    // jump to latest tile.
    if (jumpToIndex) {
        TimetableList.value = currentIdx;
    }
}
