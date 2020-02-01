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
    }
};

// Message socket opens (send)
messaging.peerSocket.onopen = function() {
    console.log("App Socket Open");
    let data = {key: "lm-refresh"};
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

let VTList = document.getElementById("my-list");
let NUM_ELEMS = 100;
var TIMETABLE = [];

VTList.delegate = {
    getTileInfo: function(index) {
        return {
            index: index,
            type: "my-pool",
        };
    },
    configureTile: function(tile, info) {
        if (info.type == "my-pool") {
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
VTList.length = NUM_ELEMS;

function formatDateToAmPm(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = hours + ':' + minutes + ampm;
    return strTime;
}

function updateTimetableView(timetableData) {
    TIMETABLE.length = 0;
    for (var i = 0; i < timetableData.length; i++) {
        TIMETABLE.push(timetableData[i]);
    }

    // work around to refresh the virtual tile list.
    VTList.length = 0;
    VTList.redraw();
    VTList.length = TIMETABLE.length;
    VTList.redraw();
}