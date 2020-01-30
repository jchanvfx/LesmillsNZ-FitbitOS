import * as messaging from "messaging";
import * as lesMills from "./utils/les_mills";
import { me as companion } from "companion";
import { settingsStorage } from "settings";


// Check internet permissions
if (!companion.permissions.granted("access_internet")) {
    console.log("We're not allowed to access the internet!");
}

// Message socket opens (send)
messaging.peerSocket.onopen = function() {
    console.log("Companion Socket Open");
    // restoreSettings();
  };

// Message socket closes
messaging.peerSocket.onclose = () => {
    console.log("Companion Socket Closed");
}

// Message is received
messaging.peerSocket.onmessage = function(evt) {
    if (evt.data.key === "lm-refresh") {
        let clubSettings = settingsStorage.getItem("clubID")
        if (clubSettings != null) {
            let selectedClub = JSON.parse(clubSettings).values;
            let clubID = selectedClub.value;
            let clubName = selectedClub.name;

            // send fetch data here.............
            console.log('--- LesMills fetch request ---');
            // let data = lesMills.fetchLesMillsData(clubID);

            let data = {
                key: "lm-timetable",
                value: {cid: clubID, name: clubName, data: null}
            };
            sendValue(data);
        } else {
            console.log('Club location not set.')
            let data = {
                key: "lm-noClub",
                value: "Club location not set in app settings."
            };
            sendValue(data);
        }

    }
}

// Listen for the onerror event
messaging.peerSocket.onerror = function(err) {
    // Handle any errors
    console.log("Connection error: " + err.code + " - " + err.message);
}

// Settings changed callback
settingsStorage.onchange = function(evt) {
    let data = {key: evt.key, newValue: evt.newValue};
    sendValue(data);
}

// Send data to Fitbit device using Messaging API
function sendValue(data) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        messaging.peerSocket.send(data);
    }
}

// ----------------------------------------------------------------------------


// Restore any previously saved settings and send to the device
function restoreSettings() {
    for (let index = 0; index < settingsStorage.length; index++) {
        let key = settingsStorage.key(index);
        if (key) {
            let data = {key: key, newValue: settingsStorage.getItem(key)};
            sendValue(data);
        }
    }
}

// Fetch Timetable Data from LesMills Web API
// let url = "https://www.lesmills.co.nz/api/timetable/get-timetable-epi"
// fetch(url, {
//     method: 'POST',
//     headers: new Headers({'Content-type': 'application/json'}),
//     body: JSON.stringify({Club: "04"})
// })
// .then(response => response.json())
// .then(data => console.log(data));