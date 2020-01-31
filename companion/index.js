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
            let selectedClub = JSON.parse(clubSettings).values[0];
            let clubID = selectedClub.value;
            let clubName = selectedClub.name;


            // send fetch data.............
            // console.log("\n\n--- LesMills fetch request ---");
            // console.log(lmData);
            // console.log("-".repeat(8));
            // let lmData = JSON.stringify({name: selectedClub.name});

            let data = {
                key: "lm-timetable",
                value: clubName,
                timetable: null
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

// Test Fetch Timetable Data from LesMills Web API
lesMills.fetchLesMillsData("04")
    .then(function(data) {

        // sort timetable data.
        let lmTimeTable = [];
        for (var i = 0; i < data.Classes.length; i++) {
            let clsInfo = data.Classes[i];
            let groupClass = {
                "time": clsInfo.StartDateTime,
                "instructor": clsInfo.MainInstructor.Name,
                "name": clsInfo.ClassName,
                "color": clsInfo.Color,
                "duration": clsInfo.Duration,
                "site": clsInfo.Site.SiteName
            };
            lmTimeTable.push(groupClass);
        }

        // timeout delay (seconds).
        let delay = 2;

        setTimeout(function () {
            console.log(lmTimeTable);
        }, 1000 * delay);

    })
    .catch((err) => {
        console.log(err);
    });

console.log("\n\n*****\n\n")
