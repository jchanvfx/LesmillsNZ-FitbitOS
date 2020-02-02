import document from "document";
import { me as appbit } from "appbit";
import * as messaging from "messaging";
import * as simpleClock from "./clock";


// Check internet permissions
if (!appbit.permissions.granted("access_internet")) {
    console.log("We're not allowed to access the internet!");
}

// Message is received
messaging.peerSocket.onmessage = function(evt) {
    // console.log(`App received: ${JSON.stringify(evt)}`);
    if (evt.data.key === "lm-noClub" && evt.data.value) {
        let value = evt.data.value
        console.log(value);
    } else if (evt.data.key === "lm-timetable" && evt.data.value) {
        let clubName = evt.data.value;
        let timetable = evt.data.timetable;
        displayTimetable(false);
        displayLoadingScreen(true, "Processing Data...");
        updateTimetableView(timetable);
        displayLoadingScreen(false);
        displayTimetable(true);
    }
};

// Message socket opens (send)
messaging.peerSocket.onopen = function() {
    console.log("App Socket Open");
    displayTimetable(false);
    displayLoadingScreen(true, "Retrieving Timetable...");
    let data = {key: "lm-fetch"};
    sendValue(data);
};

// Message socket closes
messaging.peerSocket.onclose = function() {
    console.log("App Socket Closed");
};

// ----------------------------------------------------------------------------

// Send data to Companion device using Messaging API
function sendValue(data) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        messaging.peerSocket.send(data);
    }
}

// Clock callback for updating date and time.
function clockCallback(data) {
    STATUS_BAR_DATE.text = data.date;
    STATUS_BAR_TIME.text = data.time;
}

// Update timetable tile list with new data.
function updateTimetableView(timetableData) {
    TIMETABLE.length = 0;
    for (var i = 0; i < timetableData.length; i++) {
        TIMETABLE.push(timetableData[i]);
    }
    // work around to refresh the virtual tile list.
    TIMETABLE_LIST.length = 0;
    TIMETABLE_LIST.redraw();
    TIMETABLE_LIST.length = TIMETABLE.length;
    TIMETABLE_LIST.redraw();
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
function displayLoadingScreen(display=true, text="loading...") {
    LOADER_OVERLAY.getElementById("text").text = text;
    if (display === true) {
        LOADER_OVERLAY.animate("enable");
        LOADER_OVERLAY.style.display = "inline";
    } else {
        LOADER_OVERLAY.animate("disable");
        LOADER_OVERLAY.style.display = "none";
    }
}

// ----------------------------------------------------------------------------

var TIMETABLE = [];
let TIMETABLE_LIST = document.getElementById("lm-class-list");
let LOADER_OVERLAY = document.getElementById("loading-screen");
let STATUS_BAR_TIME = document.getElementById("lm-status-time");
let STATUS_BAR_DATE = document.getElementById("lm-status-date");

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
                tile.getElementById("text-title").text = item.name;
                tile.getElementById("text-subtitle").text = item.instructor;
                tile.getElementById("text-L").text = simpleClock.formatDateToAmPm(time);
                tile.getElementById("text-R").text = item.desc;
                if (item.color !== null) {
                    tile.getElementById("color").style.fill = item.color;
                    tile.getElementById("colorIdx").style.fill = item.color;
                }
            }

            let touch = tile.getElementById("touch-me");
                touch.onclick = evt => {
                console.log(`touched: ${info.index}`);
            };
        }
    }
};

// TIMETABLE_LIST.length must be set AFTER TIMETABLE_LIST.delegate
TIMETABLE_LIST.length = 10;





