import * as messaging from "messaging";
import * as lesMills from "./lmlib";
import { encode } from "cbor";
import { outbox } from "file-transfer";
import { me as companion } from "companion";
import { settingsStorage } from "settings";

const LM_FILE = "LM_TIMETABLE.cbor";

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
function sendData(key, data, filename) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        // queue data.
        outbox.enqueue(filename, encode(data))
        .then(function(ft) {
            messaging.peerSocket.send({key: key});
            console.log(`Transfer of "${filename}" successfully queued.`);
        })
        .catch(function(err) {
            throw new Error(`Failed to queue ${filename}  Error: ${err}`);
        });
    }
}
// fetch timetable callback send data to device
function timetableCallback(data) {
    sendData("lm-dataQueued", data, LM_FILE);
}

// ----------------------------------------------------------------------------

// settings changed callback
settingsStorage.onchange = function(evt) {
    let selectedClub = JSON.parse(evt.newValue).values[0];
    let clubID = selectedClub.value;
    let clubName = selectedClub.name;
    sendValue("lm-clubChanged", clubName);
    lesMills.fetchTimetableData(clubID, timetableCallback);
}
// message is received
messaging.peerSocket.onmessage = (evt) => {
    if (evt.data.key === "lm-fetch") {
        let clubSettings = settingsStorage.getItem("clubID")
        if (clubSettings != null) {
            let selectedClub = JSON.parse(clubSettings).values[0];
            let clubID = selectedClub.value;
            let clubName = selectedClub.name;
            lesMills.fetchTimetableData(clubID, timetableCallback);
            sendValue("lm-fetchReply", clubName);
        } else {
            sendValue("lm-noClub");
        }
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
