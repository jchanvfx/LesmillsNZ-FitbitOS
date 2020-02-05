import document from "document";
import { inbox } from "file-transfer"
import { readFileSync, listDirSync } from "fs";
import { me as appbit } from "appbit";
import * as messaging from "messaging";
import * as simpleClock from "./clock";

const DATE_TODAY = new Date();
const TIMETABLE = [];
const TIMETABLE_FILE = "LM_TIMETABLE.cbor";
const TIMETABLE_LIST = document.getElementById("lm-class-list");
const LOADER_OVERLAY = document.getElementById("loading-screen");
const MESSAGE_OVERLAY = document.getElementById("message-screen");
const STATUS_BAR_DATE = document.getElementById("lm-status-date");
const STATUS_BAR_TIME = document.getElementById("lm-status-time");
const STATUS_BAR_MENU = document.getElementById("lm-status-menu");
const STATUS_BAR_INFO = document.getElementById("lm-status-info");
const STATUS_BAR_NO_PHONE = document.getElementById("no-phone");
const STATUS_BAR_LOADING = document.getElementById("bg-loading");

const MSG_NO_CLUB = "Please set a club location from the app's settings in the phone app to display timetable.";

let TIMETABLE_RECIEVED = false;

// ----------------------------------------------------------------------------

// Clock callback for updating date and time.
function clockCallback(data) {
    STATUS_BAR_DATE.text = `Today ${data.date}`;
    STATUS_BAR_TIME.text = data.time;
}

// File recieved transfer callback.
function inboxFileTransferCallback() {
    let fileName;
    while (fileName = inbox.nextFile()) {
        if (fileName == TIMETABLE_FILE) {
            console.log(`File ${TIMETABLE_FILE} recieved!`);
            displayMessageOverlay(false);
            displayLoadingScreen(false);
            displayStatusBarIcon(false);

            TIMETABLE_RECIEVED = true;
            let timetable = readFileSync(TIMETABLE_FILE, "cbor");
            updateTimetableView(timetable);
            displayTimetable(true);
        }
    }
}

// Send data to Companion device using Messaging API
function sendValue(data) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        messaging.peerSocket.send(data);
    } else if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
        displayStatusBarIcon(true, "no-phone");
    }
}

// Local file data reader.
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


// ----------------------------------------------------------------------------

// Toggle status bar icons.
function displayStatusBarIcon(display=false, icon="") {
    STATUS_BAR_NO_PHONE.style.display = "none";
    STATUS_BAR_LOADING.style.display = "none";
    STATUS_BAR_LOADING.animate("disable");
    if (display) {
        if (icon == "no-phone") {
            STATUS_BAR_NO_PHONE.style.display = "inline";
        } else if (icon == "loading") {
            STATUS_BAR_LOADING.style.display = "inline";
            STATUS_BAR_LOADING.animate("enable");
        }
    }
}

// Toggle message text display.
function displayMessageOverlay(display=true, text="") {
    MESSAGE_OVERLAY.getElementById("text").text = text;
    MESSAGE_OVERLAY.style.display = display ? "inline" : "none";
}

// Toggle timetable list display.
function displayTimetable(display=true) {
    TIMETABLE_LIST.style.display = display ? "inline" : "none";
}

// Toggle loading screen display.
function displayLoadingScreen(display=true, text="loading...", subText="") {
    LOADER_OVERLAY.getElementById("text").text = text;
    LOADER_OVERLAY.getElementById("sub-text").text = subText;
    LOADER_OVERLAY.animate(display ? "enable" : "disable");
    LOADER_OVERLAY.style.display = display ? "inline" : "none";;
}

// Update timetable tile list with new data.
function updateTimetableView(timetableData, jumpToIndex=true) {
    let current_idx = 0;
    let today = DATE_TODAY.getDay();

    if (today.toString() in timetableData) {
        let timetable = timetableData[today.toString()];
        let i;
        let time;
        for (i = 0; i < timetable.length; i++) {
            time = new Date(timetable[i].date);
            if (time - DATE_TODAY > 0) {
                current_idx = i;
                break;
            }
        }
    }

    TIMETABLE.length = 0;
    for (var i = 0; i < timetableData[today.toString()].length; i++) {
        let itm = timetableData[today.toString()][i];
        itm.finished = (i < current_idx) ? "y" : "n";
        TIMETABLE.push(itm);
    }
    // work around to refresh the virtual tile list.
    TIMETABLE_LIST.length = 0;
    TIMETABLE_LIST.redraw();
    TIMETABLE_LIST.length = TIMETABLE.length;
    TIMETABLE_LIST.redraw();

    if (jumpToIndex) {
        TIMETABLE_LIST.value = current_idx;
    }
}

// ----------------------------------------------------------------------------

// Check internet permissions
if (!appbit.permissions.granted("access_internet")) {
    console.log("We're not allowed to access the internet!");
}

// Message is received
messaging.peerSocket.onmessage = function(evt) {
    displayStatusBarIcon(false);
    if (evt.data.key === "lm-noClub") {
        displayLoadingScreen(false);
        displayMessageOverlay(true, MSG_NO_CLUB);
    } else if (evt.data.key === "lm-fetchReply" && evt.data.value) {
        // update existing data first.
        let day = DATE_TODAY.getDay();
        let timetable = readFileData(TIMETABLE_FILE);
        if (TIMETABLE_RECIEVED === false) {
            if (day.toString() in timetable) {
                updateTimetableView(timetable, false);
            }
        }

        // show loder screen
        let clubName = evt.data.value;
        displayMessageOverlay(false);
        displayTimetable(false);
        displayLoadingScreen(true, `Retrieving Timetable...`, clubName);

        // wait 3.5 sec update screen.
        setTimeout(function () {
            if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
                displayStatusBarIcon(true, "no-phone");
            }
            if (day.toString() in timetable) {
                displayStatusBarIcon(true, "loading");
                displayTimetable(true);
                displayLoadingScreen(false);
            }
        }, 3500);

    } else if (evt.data.key === "lm-clubChanged" && evt.data.value) {
        let clubName = evt.data.value;
        displayMessageOverlay(false);
        displayTimetable(false);
        displayLoadingScreen(true, "Requesting Data...", clubName);
    }
};

// Message socket opens.
messaging.peerSocket.onopen = function() {
    console.log("App Socket Open");
    TIMETABLE_RECIEVED = false;
    displayTimetable(false);
    displayLoadingScreen(true);
    sendValue({key: "lm-fetch"});
};

// Message socket closes
messaging.peerSocket.onclose = function() {
    displayStatusBarIcon(true, "no-phone");
    console.log("App Socket Closed");

};

// ----------------------------------------------------------------------------

// Initialize timetable list.
TIMETABLE_LIST.delegate = {
    getTileInfo: function(index) {
        let item = TIMETABLE[index];
        if (TIMETABLE.length > 0) {
            return {
                index: index,
                type: "lm-pool",
                name: item.name,
                instructor: item.instructor,
                date: item.date,
                desc: item.desc,
                color: (item.color !== null) ? item.color : "#545454",
                finished: item.finished,
            };
        } else {
            // need this here or we'll get a "Error 22 Critical glue error"
            return {
                index: index,
                type: "lm-pool",
                name: "{no data}",
                instructor: "",
                date: "",
                desc: "",
                color: "",
                finished: "y",
            };
        }
    },
    configureTile: function(tile, info) {
        if (info.type == "lm-pool") {
            let itmDate = new Date(info.date);
            tile.getElementById("text-title").text = info.name.toUpperCase();
            tile.getElementById("text-subtitle").text = info.instructor;
            tile.getElementById("text-L").text = simpleClock.formatDateToAmPm(itmDate);
            tile.getElementById("text-R").text = info.desc;

            if (info.finished == "y") {
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
                tile.getElementById("color").style.fill = "white";
                tile.getElementById("color").style.fill = info.color;
            }
        }
    }
};

// TIMETABLE_LIST.length must be set AFTER TIMETABLE_LIST.delegate
TIMETABLE_LIST.length = 10;

// Slide to the date selection menu screen. (not yet implemented)
STATUS_BAR_MENU.onclick = function(evt) {

    TIMETABLE_RECIEVED = false;

    let day = DATE_TODAY.getDay();
    let timetable = readFileData(TIMETABLE_FILE);
    if (day.toString() in timetable) {
        updateTimetableView(timetable);
    }

    // TEMPORARY logic code to refresh timetable update this once date menu is implemented.
    if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
        displayStatusBarIcon(true, 'no-phone');
    } else {
        displayStatusBarIcon(true, "loading");
        sendValue({key: "lm-fetch"});
    }

    // wait 3.5 sec update the screen.
    setTimeout(function () {
        displayLoadingScreen(false);
        displayTimetable(true);
    }, 3500);

}

// Jump to the next avaliable class.
STATUS_BAR_INFO.onclick = function(evt) {
    let day = DATE_TODAY.getDay();
    let timetableData = readFileData(TIMETABLE_FILE);
    if (day.toString() in timetableData) {
        let timetable = timetableData[day.toString()];
        let i;
        let time;
        for (i = 0; i < timetable.length; i++) {
            time = new Date(timetable[i].date);
            if (time - DATE_TODAY > 0) {
                TIMETABLE_LIST.value = i;
                break;
            }
        }
    }
}

// Process incomming file transfers.
inbox.addEventListener("newfile", inboxFileTransferCallback);

// Initialize the clock.
simpleClock.initialize("seconds", "shortDate", clockCallback);


// Initial UI setup.
// ============================================================================
function initUI () {
    displayMessageOverlay(true, "Phone Not Connected\n\nSync device in Fitbit mobile app.");
    let day = DATE_TODAY.getDay();
    let timetable = readFileData(TIMETABLE_FILE);
    if (day.toString() in timetable) {
        updateTimetableView(timetable);
        displayLoadingScreen(false);
        displayTimetable(true);
    }
    if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
        displayStatusBarIcon(true, "no-phone");
    }
}
initUI();