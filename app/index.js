import document from "document";
import { me as appbit } from "appbit";
import * as messaging from "messaging";
import { CLASS_CODES } from "./lm_classCodes"


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
        updateTimetableView(timetable);
        displayLoadingScreen(false);
        displayTimetable(true);
    }
};

// Message socket opens (send)
messaging.peerSocket.onopen = function() {
    console.log("App Socket Open");
    displayTimetable(false);
    displayLoadingScreen(true);
    let data = {key: "lm-fetch"};
    sendValue(data);
};

// Message socket closes
messaging.peerSocket.onclose = function() {
    console.log("App Socket Closed");
};

// Send data to Companion device using Messaging API
function sendValue(data) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        messaging.peerSocket.send(data);
    }
}

// ----------------------------------------------------------------------------

var TIMETABLE = [];
let TIMETABLE_LIST = document.getElementById("lm-class-list");
let LOADER_OVERLAY = document.getElementById("loading-screen");

TIMETABLE_LIST.delegate = {
    getTileInfo: function(index) {
        return {index: index, type: "lm-pool"};
    },
    configureTile: function(tile, info) {
        if (info.type == "lm-pool") {
            if (TIMETABLE.length > 1) {
                let item = TIMETABLE[info.index];
                let clsName = CLASS_CODES[item.code].toUpperCase();
                let time = new Date(item.date);

                tile.getElementById("text-title").text = clsName;
                tile.getElementById("text-subtitle").text = item.instructor;
                tile.getElementById("text-L").text = formatDateToAmPm(time);
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

// VTList.length must be set AFTER VTList.delegate
TIMETABLE_LIST.length = 10;

// METHODS
// ----------------------------------------------------------------------------

function formatDateToAmPm(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    let strTime = hours + ':' + minutes + ampm;
    return strTime;
}
// update timetable tile list with new data.
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

// toggle timetable list.
function displayTimetable(display=true) {
    if (display === true) {
        TIMETABLE_LIST.style.display = "inline";
    } else {
        TIMETABLE_LIST.style.display = "none";
    }
}

// toggle loading screen display.
function displayLoadingScreen(display=true) {
    if (display === true) {
        LOADER_OVERLAY.animate("enable");
        LOADER_OVERLAY.style.display = "inline";
    } else {
        LOADER_OVERLAY.animate("disable");
        LOADER_OVERLAY.style.display = "none";
    }
}