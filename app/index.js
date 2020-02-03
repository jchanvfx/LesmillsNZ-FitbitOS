import document from "document";
import { inbox } from "file-transfer"
import { readFileSync, listDirSync } from "fs";
import { me as appbit } from "appbit";
import * as messaging from "messaging";
import * as simpleClock from "./clock";


// Check internet permissions
if (!appbit.permissions.granted("access_internet")) {
    console.log("We're not allowed to access the internet!");
}

// Message is received
messaging.peerSocket.onmessage = function(evt) {
    if (evt.data.key === "lm-noClub") {
        displayLoadingScreen(false);
        displayMessageOverlay(true, MSG_NO_CLUB);
    } else if (evt.data.key === "lm-dataQueued" && evt.data.value) {
        let clubName = evt.data.value;
        displayMessageOverlay(false);
        displayTimetable(false);
        displayLoadingScreen(true, `Retrieving Timetable...`, clubName);
    } else if (evt.data.key === "lm-clubChanged" && evt.data.value) {
        let clubName = evt.data.value;
        displayMessageOverlay(false);
        displayTimetable(false);
        displayLoadingScreen(true, "Requesting Data...", clubName);
    }
};

// Message socket opens (send)
messaging.peerSocket.onopen = function() {
    displayTimetable(false);
    displayLoadingScreen(true);
    sendValue({key: "lm-fetch"});
};

// Message socket closes
messaging.peerSocket.onclose = function() {
    console.log("App Socket Closed");
};

// ----------------------------------------------------------------------------

// read file data and return JSON object.
function readFileData(fileName) {
    let parseData = {};
    let dirIter;
    let listDir = listDirSync("/private/data");
    while((dirIter = listDir.next()) && !dirIter.done) {
        if (dirIter.value == fileName) {
            parseData = readFileSync(fileName, "cbor");
            break;
        }
    }
    return parseData;
}

// Process files from the file transfer inbox.
function processAllFiles() {
    let fileName;
    while (fileName = inbox.nextFile()) {
        if (fileName == TIMETABLE_FILE) {
            let timetable = readFileSync(TIMETABLE_FILE, "cbor");
            updateTimetableView(timetable);
            displayMessageOverlay(false);
            displayLoadingScreen(false);
            displayTimetable(true);
        }
    }
}

// Send data to Companion device using Messaging API
function sendValue(data) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        messaging.peerSocket.send(data);
    }
}

// Clock callback for updating date and time.
function clockCallback(data) {
    STATUS_BAR_DATE.text = `Today (${data.date})`;
    STATUS_BAR_TIME.text = data.time;
}

// Update timetable tile list with new data.
function updateTimetableView(timetableData) {
    let dateToday = new Date();
    let today = dateToday.getDay();

    TIMETABLE.length = 0;
    for (var i = 0; i < timetableData[today.toString()].length; i++) {
        TIMETABLE.push(timetableData[today.toString()][i]);
    }
    // work around to refresh the virtual tile list.
    TIMETABLE_LIST.length = 0;
    TIMETABLE_LIST.redraw();
    TIMETABLE_LIST.length = TIMETABLE.length;
    TIMETABLE_LIST.redraw();
}

// Toggle message text display.
function displayMessageOverlay(display=true, text="") {
    MESSAGE_OVERLAY.getElementById("text").text = text;
    if (display === true) {
        MESSAGE_OVERLAY.style.display = "inline";
    } else {
        MESSAGE_OVERLAY.style.display = "none";
    }
}

// Toggle timetable list display.
function displayTimetable(display=true) {
    if (display === true) {
        TIMETABLE_LIST.style.display = "inline";
    } else {
        TIMETABLE_LIST.style.display = "none";
    }
}

// Toggle loading screen display.
function displayLoadingScreen(display=true, text="loading...", subText="") {
    LOADER_OVERLAY.getElementById("text").text = text;
    LOADER_OVERLAY.getElementById("sub-text").text = subText;
    if (display === true) {
        LOADER_OVERLAY.animate("enable");
        LOADER_OVERLAY.style.display = "inline";
    } else {
        LOADER_OVERLAY.animate("disable");
        LOADER_OVERLAY.style.display = "none";
    }
}

// ----------------------------------------------------------------------------
let TIMETABLE = [];
let TIMETABLE_FILE = "LM_TIMETABLE.cbor";
let TIMETABLE_LIST = document.getElementById("lm-class-list");
let LOADER_OVERLAY = document.getElementById("loading-screen");
let MESSAGE_OVERLAY = document.getElementById("message-screen");
let STATUS_BAR_TIME = document.getElementById("lm-status-time");
let STATUS_BAR_DATE = document.getElementById("lm-status-date");
let STATUS_BAR_REFRESH = document.getElementById("lm-status_refesh");
let MSG_NO_CLUB = "Please set a club location from the app's settings in the phone app to display timetable.";


// process file transfers.
processAllFiles();
inbox.addEventListener("newfile", processAllFiles);

// Initialize the clock.
simpleClock.initialize("seconds", "shortDate", clockCallback);

// Initialize timetable list.
TIMETABLE_LIST.delegate = {
    getTileInfo: function(index) {
        return {index: index, type: "lm-pool"};
    },
    configureTile: function(tile, info) {
        if (info.type == "lm-pool") {
            if (TIMETABLE.length > 1) {
                let item = TIMETABLE[info.index];
                let time = new Date(item.date);
                tile.getElementById("text-title").text = item.name.toUpperCase();
                tile.getElementById("text-subtitle").text = item.instructor;
                tile.getElementById("text-L").text = simpleClock.formatDateToAmPm(time);
                tile.getElementById("text-R").text = item.desc;
                if (item.color !== null) {
                    tile.getElementById("color").style.fill = item.color;
                    tile.getElementById("colorIdx").style.fill = item.color;
                }
            }

            // let touch = tile.getElementById("touch-me");
            //     touch.onclick = evt => {
            //     console.log(`touched: ${info.index}`);
            // };

        }
    }
};

// TIMETABLE_LIST.length must be set AFTER TIMETABLE_LIST.delegate
TIMETABLE_LIST.length = 10;

// Refresh list when user clicks on top left area.
STATUS_BAR_REFRESH.onclick = function(evt) {
    displayTimetable(false);
    displayLoadingScreen(true);
    sendValue({key: "lm-fetch"});
};