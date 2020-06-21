import * as messaging from "messaging";
import * as lesMills from "./lmlib";
import { encode } from "cbor";
import { outbox } from "file-transfer";
import { me as companion } from "companion";
import { settingsStorage } from "settings";
import { DATA_FILE_PREFIX, WORKOUTS_FILE } from "../common/config"
import { date, date1, date2, date3, date4 } from "../common/datelib"

// check permissions
if (!companion.permissions.granted("access_internet")) {
    console.log("We're not allowed to access the internet!");
}

// send data to device via Messaging API
function sendValue(key, data=null) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        if (data == null) {
            messaging.peerSocket.send({key: key});
        } else {
            messaging.peerSocket.send({key: key, value: data});
        }
    }
}
// send data to device via FileTransfer API
function sendData(key, data, filename, message=null) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        // queue data.
        outbox.enqueue(filename, encode(data))
        .then(function(ft) {
            if (message == null) {
                messaging.peerSocket.send({key: key});
            } else {
                messaging.peerSocket.send({key: key, value: message});
            }
            console.log(`Transfer of "${filename}" successfully queued.`);
        })
        .catch(function(err) {
            throw new Error(`Failed to queue ${filename}  Error: ${err}`);
        });
    }
}
// fetch timetable and send data to device
function timetableCallback(data) {
    let clubSettings = settingsStorage.getItem("clubID");
    let selectedClub = JSON.parse(clubSettings).values[0];
    let clubName = selectedClub.name;
    let dates = [date, date1, date2, date3, date4];
    for (let i = 0; i < dates.length; i++) {
        let dKey = `${dates[i].getDay()}` +
                   `${dates[i].getDate()}` +
                   `${dates[i].getMonth()}`;
        let fileName = `${DATA_FILE_PREFIX}${dKey}.cbor`;
        sendData("lm-dataQueued", data[dKey.toString()], fileName, clubName);
    }
}
// fetch fitness classes and send data to device.
function fitnessClassesCallback(data) {
    if (data.length !== 0) {
        sendData("lm-classesQueued", data, `${WORKOUTS_FILE}`);
    } else {
        sendValue("lm-noClasses");
    }
}


// ----------------------------------------------------------------------------

// settings changed callback
settingsStorage.onchange = (evt) => {
    switch (evt.key) {
        case "clubID":
            let selectedClub    = JSON.parse(evt.newValue).values[0];
            let clubID          = selectedClub.value;
            let clubName        = selectedClub.name;
            sendValue("lm-clubChanged", clubName);
            lesMills.fetchTimetableData(clubID, timetableCallback);
            lesMills.fetchClasses(clubID, fitnessClassesCallback);
            break;
        default:
            return;
    }
}
// message is received
messaging.peerSocket.onmessage = (evt) => {
    let clubSettings = settingsStorage.getItem("clubID");
    switch (evt.data.key) {
        case "lm-fetch":
            if (clubSettings != null) {
                let selectedClub    = JSON.parse(clubSettings).values[0];
                let clubID          = selectedClub.value;
                let clubName        = selectedClub.name;
                lesMills.fetchTimetableData(clubID, timetableCallback);
                sendValue("lm-fetchReply", clubName);
            } else {
                sendValue("lm-noClub");
            }
            break;
        case "lm-classes":
            if (clubSettings != null) {
                let selectedClub    = JSON.parse(clubSettings).values[0];
                let clubID          = selectedClub.value;
                let clubName        = selectedClub.name;
                lesMills.fetchClasses(clubID, fitnessClassesCallback);
                sendValue("lm-classesReply", clubName);
            } else {
                sendValue("lm-noClub");
            }
            break;
        case "lm-sync":
            if (clubSettings != null) {
                let selectedClub    = JSON.parse(clubSettings).values[0];
                let clubName        = selectedClub.name;
                sendValue("lm-syncReply", clubName);
            } else {
                sendValue("lm-noClub");
            }
            break;
        default:
            return;
    }
}
// message socket opens
messaging.peerSocket.onopen = () => {
    console.log("Companion Socket Open");
};
// message socket closes
messaging.peerSocket.onclose = () => {
    console.log("Companion Socket Closed");
}
// listen for the onerror event
messaging.peerSocket.onerror = (err) => {
    console.log(`Connection error: ${err.code} - ${err.message}`);
}
