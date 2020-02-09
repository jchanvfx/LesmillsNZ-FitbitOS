import document from "document";
import * as dateTime from "../datelib"
import * as messaging from "messaging";
import { inbox } from "file-transfer"
import { readFileSync, listDirSync } from "fs";

const LM_FILE = "LM_TIMETABLE.cbor";
const TIMETABLE = [];
let TimetableList;
let views;

export function init(_views) {
    views = _views;
    console.log("view-1 init()");
    onMount();
}

// when this view is mounted, setup elements and events.
function onMount() {
    setupTimetable();
    initTimetable();
    connectEvents();
}

// connect up add the events.
function connectEvents() {
    // message socket opens.
    messaging.peerSocket.onopen = onConnectionOpen;
    // message socket closes
    messaging.peerSocket.onclose = onConnectionClosed;
    // message recieved.
    messaging.peerSocket.onmessage = onMessageRecieved;
    // process incomming data transfers.
    inbox.addEventListener("newfile", onDataRecieved);
    // update the time.
    dateTime.registerCallback(onTimeUpdate);
};

// sample button click with navigation.
function clickHandler(_evt) {
    console.log("view-1 Button Clicked!");
    /* Navigate to another screen */
    views.navigate("view-2");
}

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
        // TODO: display phone discpnnected icon.
    }
}

// callback when file transfer has completed.
function onDataRecieved() {
    let filename;
    while (filename = inbox.nextFile()) {
        if (filename == LM_FILE) {
            console.log(`File ${LM_FILE} recieved!`);

            let data = readFileSync(LM_FILE, "cbor");
            updateTimetable(data);

            // TODO update ui elements

        }
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
            console.log('fetch recieved');
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
    // console.log(`time: ${data.time}`);
};

// load timetable data and intialize the list UI
function initTimetable() {
    let data = readFile(LM_FILE);
    let date = dateTime.getDateObj();
    let dKey = `${date.getDay()}${date.getDate()}${date.getMonth()}`;

    console.log(JSON.stringify(data));

    if (dKey in data) {
        updateTimetable(data);
        return;
    }

    console.log('EMPTY DATA');
    sendValue("lm-fetch");
    //  TODO: show loading screen or
    //        display phone connection lost screen.
}

// UI METHODS
//-----------------------------------------------------------------------------

// initialize timetable list.
function setupTimetable() {
    TimetableList = document.getElementById("lm-class-list");
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
                    finished: "y",
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
