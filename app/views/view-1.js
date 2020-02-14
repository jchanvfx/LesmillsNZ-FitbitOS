import clock from "clock";
import document from "document";
import * as dateTime from "../datelib"
import * as messaging from "messaging";
import { inbox } from "file-transfer"
import { existsSync, listDirSync, readFileSync, statSync, unlinkSync } from "fs";

const LM_PREFIX = "LM_dat";
const LM_TIMETABLE = [];

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

const date = new Date();
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
        `${dateTime.DAYS_SHORT[date.getDay()]} ` +
        `${date.getDate()} ` +
        `${dateTime.MONTHS_SHORT[date.getMonth()]}`;
    MenuBtn2.text =
        `${dateTime.DAYS_SHORT[date1.getDay()]} ` +
        `${date1.getDate()} ` +
        `${dateTime.MONTHS_SHORT[date1.getMonth()]} `;
    MenuBtn3.text =
        `${dateTime.DAYS_SHORT[date2.getDay()]} ` +
        `${date2.getDate()} ` +
        `${dateTime.MONTHS_SHORT[date2.getMonth()]}`;

    StatusBar.getElementById("date1").text = `${dateTime.DAYS_SHORT[date.getDay()]} (Today)`;
    StatusBar.getElementById("date2").text = `${date.getDate()} ${dateTime.MONTHS[date.getMonth()]}`;
    StatusBar.getElementById("time").text = dateTime.formatTo12hrTime(date);

    CurrentDayKey = `${date.getDay()}${date.getDate()}${date.getMonth()}`;
    OnFileRecievedUpdateGui = false;

    // initialize here.
    buildTimetable();
    setTimetableDay(CurrentDayKey);

    // connect up add the events.
    // ========================================================================

    // register time callback.
    clock.granularity = "minutes";
    clock.addEventListener("tick", evt => {
        StatusBar.getElementById("time").text = dateTime.formatTo12hrTime(evt.date);
    });
    // message socket opens.
    messaging.peerSocket.onopen = () => {
        console.log("App Socket Open");
        displayElement(StatusBarPhone, false);
    };
    // message socket closes
    messaging.peerSocket.onclose = () => {
        console.log("App Socket Closed");
        displayElement(StatusBarPhone, true);
    };
    // message recieved.
    messaging.peerSocket.onmessage = onMessageRecieved;
    // process incomming data transfers.
    inbox.addEventListener("newfile", onDataRecieved);
    // button events.
    StatusBtnMenu.addEventListener("click", () => {
        if (MenuScreen.style.display == "none") {
            MenuScreen.style.display = "inline";
        } else {
            MenuScreen.style.display = "none";
        }
    });
    StatusBtnRefresh.addEventListener("click", onStatusBtnRefreshClicked);
    MenuBtn1.addEventListener("activate", onMenuBtn1Clicked);
    MenuBtn2.addEventListener("activate", onMenuBtn2Clicked);
    MenuBtn3.addEventListener("activate", onMenuBtn3Clicked);
}

// Util Methods
//-----------------------------------------------------------------------------

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
                console.log(`Deleted: ${dirIter.value}`);
            }
        }
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
        if (fileName == CurrentDayKeyFile) {
            console.log(`File ${fileName} recieved!`);
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
    displayElement(
        StatusBarPhone,
        messaging.peerSocket.readyState === messaging.peerSocket.CLOSED
    );
}
// callback when a message is recieved.
function onMessageRecieved(evt) {
    switch (evt.data.key) {
        case "lm-noClub":
            console.log("no club selected.");
            displayLoader(false);
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

// Button Methods
//-----------------------------------------------------------------------------

// callback for the status refresh button.
function onStatusBtnRefreshClicked() {
    console.log("Refresh Clicked");
    let currentIdx = 0;
    let time;
    let i = LM_TIMETABLE.length, x = 0;
    while (i--) {
        x++;
        time = new Date(LM_TIMETABLE[x].date);
        if (time - date > 0) {currentIdx = x; break;}
    }
    TimetableList.value = currentIdx;
}
// callback menu buttons.
function onMenuBtn1Clicked() {
    MenuScreen.style.display = "none";
    StatusBar.getElementById("date1").text = `${dateTime.DAYS_SHORT[date.getDay()]} (Today)`;
    StatusBar.getElementById("date2").text = `${date.getDate()} ${dateTime.MONTHS[date.getMonth()]}`;
    CurrentDayKey = `${date.getDay()}${date.getDate()}${date.getMonth()}`;
    setTimetableDay(CurrentDayKey);
}
function onMenuBtn2Clicked() {
    MenuScreen.style.display = "none";
    StatusBar.getElementById("date1").text = `${dateTime.DAYS_SHORT[date1.getDay()]}`;
    StatusBar.getElementById("date2").text = `${date1.getDate()} ${dateTime.MONTHS[date1.getMonth()]}`;
    CurrentDayKey = `${date1.getDay()}${date1.getDate()}${date1.getMonth()}`;
    setTimetableDay(CurrentDayKey);
}
function onMenuBtn3Clicked() {
    MenuScreen.style.display = "none";
    StatusBar.getElementById("date1").text = `${dateTime.DAYS_SHORT[date2.getDay()]}`;
    StatusBar.getElementById("date2").text = `${date2.getDate()} ${dateTime.MONTHS[date2.getMonth()]}`;
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
            if (LM_TIMETABLE.length != 0) {
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
            }
            // need this here or we'll get a "Error 22 Critical glue error"
            return {
                index: index,
                type: "lm-pool",
                name: "",
                instructor: "",
                date: date,
                desc: "",
                color: "#545454",
            };
        },
        configureTile: (tile, info) => {
            if (info.type == "lm-pool") {
                let itmDate = new Date(info.date);
                tile.getElementById("text-title").text = info.name.toUpperCase();
                tile.getElementById("text-subtitle").text = info.instructor;
                tile.getElementById("text-L").text = dateTime.formatTo12hrTime(itmDate);
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
    TimetableList.length = 10;
}

// set the timetable list with specified day.
function setTimetableDay(dKey, jumpToIndex=true) {
    displayElement(TimetableList, false);
    displayLoader(true, "Loading Data...");

    let fileName = `${LM_PREFIX}${dKey}.cbor`

    // find data file eg. "LM_dat123.cbor"
    // return: "{fetched: <tstamp>, value: <array>}"
    LM_TIMETABLE.length = 0;
    if (existsSync("/private/data/" + fileName)) {
        LM_TIMETABLE = readFileSync(fileName, "cbor");
    }

    if (LM_TIMETABLE.length != 0) {
        console.log("Found Data...");

        // find next class index.
        let currentIdx = 0;
        let time;
        let i = LM_TIMETABLE.length, x = 0;
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
        console.log(`TIME DIFFERENCE:: ${timeDiff}hrs`);
        if (timeDiff > 48) {
            OnFileRecievedUpdateGui = false;
            sendValue("lm-fetch");
        }

        cleanUpFiles();
        return;
    }

    console.log('Fetching Database...');
    OnFileRecievedUpdateGui = true;
    displayLoader(true, "Fetching Database...");
    sendValue("lm-fetch");
    cleanUpFiles();

    // 5 second grace period before displing message.
    setTimeout(() => {
        if (LoaderOverlay.style.display == 'inline') {
            displayLoader(false);
            displayMessage(true, "Can't Connection to Phone", "Connection Lost");
        }
    }, 5000);
}
