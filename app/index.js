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
            displayMessageOverlay(false);
            displayLoadingScreen(false);
            displayTimetable(true);
            displayStatusBarIcon(false);

            let timetable = readFileSync(TIMETABLE_FILE, "cbor");
            updateTimetableView(timetable);
            updateTimetableIndex(timetable);
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
function updateTimetableView(timetableData) {
    let today = DATE_TODAY.getDay();

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

// Update selected timetable tile.
function updateTimetableIndex(timetableData) {
    let day = DATE_TODAY.getDay();
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
    } else if (evt.data.key === "lm-dataQueued" && evt.data.value) {
        let clubName = evt.data.value;
        displayMessageOverlay(false);
        displayTimetable(false);
        displayLoadingScreen(true, `Retrieving Timetable...`, clubName);

        // wait 5 sec check if then load previous data if it exists.
        let day = DATE_TODAY.getDay();
        let timetable = readFileData(TIMETABLE_FILE);
        if (day.toString() in timetable) {
            updateTimetableView(timetable);
            updateTimetableIndex(timetable);
        }
        setTimeout(function () {
            if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
                displayStatusBarIcon(true, "no-phone");
            }
            if (day.toString() in timetable) {
                displayTimetable(true);
                displayLoadingScreen(false);
            }
        }, 5000);

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
    displayTimetable(false);
    displayLoadingScreen(true);
    sendValue({key: "lm-fetch"});

    // wait 5 sec check if connection is lost then load previous data if it exists.
    let day = DATE_TODAY.getDay();
    let timetable = readFileData(TIMETABLE_FILE);
    setTimeout(function () {
        if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
            if (day.toString() in timetable) {
                displayLoadingScreen(false);
                displayTimetable(true);
                updateTimetableView(timetable);
                updateTimetableIndex(timetable);
            }
        }
    }, 5000);
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
                }

                // SOME THING IS NOT RIGHT HERE DATA IS NOT IN SORTED.
                // if (time - DATE_TODAY > 0) {
                //     tile.getElementById("text-title").style.fill = "#4f4f4f";
                //     tile.getElementById("text-subtitle").style.fill = "#4f4f4f";
                //     tile.getElementById("text-L").style.fill = "#4f4f4f";
                //     tile.getElementById("text-R").style.fill = "#4f4f4f";
                //     tile.getElementById("color").style.fill = "#4f4f4f";
                //     tile.getElementById("disable1").style.display = "inline";
                //     tile.getElementById("disable2").style.display = "inline";
                // }
            }
        }
    }
};

// TIMETABLE_LIST.length must be set AFTER TIMETABLE_LIST.delegate
TIMETABLE_LIST.length = 10;

// Slide to the Days menu screen. (not yet implemented)
STATUS_BAR_MENU.onclick = function(evt) {
    // TEMPORARY logic code to refresh timetable update this once days menu is implemented.
    if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
        displayStatusBarIcon(true, 'no-phone');
    } else {
        displayStatusBarIcon(true, "loading");
        sendValue({key: "lm-fetch"});
    }
}

// Jump to the next avaliable class.
STATUS_BAR_INFO.onclick = function(evt) {
    let timetable = readFileData(TIMETABLE_FILE);
    if (timetable) {
        updateTimetableIndex(timetable);
    }
}

// Process incomming file transfers.
inbox.addEventListener("newfile", inboxFileTransferCallback);

// Initialize the clock.
simpleClock.initialize("seconds", "shortDate", clockCallback);


// Initial UI setup.
// ============================================================================
function initUI () {
    let day = DATE_TODAY.getDay();
    let timetable = readFileData(TIMETABLE_FILE);
    if (day.toString() in timetable) {
        displayLoadingScreen(false);
        displayTimetable(true);
        updateTimetableView(timetable);
        updateTimetableIndex(timetable);
    }
    if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
        displayStatusBarIcon(true, "no-phone");
    }
}
initUI();