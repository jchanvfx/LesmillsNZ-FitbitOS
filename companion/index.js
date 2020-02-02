import * as messaging from "messaging";
import * as lesMills from "./lm_utils";
import { me as companion } from "companion";
import { settingsStorage } from "settings";
// import { outbox } from "file-transfer";


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
    if (evt.data.key === "lm-fetch") {
        let clubSettings = settingsStorage.getItem("clubID")
        if (clubSettings != null) {
            let selectedClub = JSON.parse(clubSettings).values[0];
            let clubID = selectedClub.value;
            let clubName = selectedClub.name;
            fetchTimtableData(clubID, clubName);
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
    let selectedClub = JSON.parse(evt.newValue).values[0];
    let clubID = selectedClub.value;
    let clubName = selectedClub.name;
    console.log(`Changed club location: ${clubID}|${clubName}`);
    fetchTimtableData(clubID, clubName);
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

// fetch the timetable data and send to device.
function fetchTimtableData(clubID, clubName) {
    lesMills.fetchLesMillsData(clubID)
        .then(function(data) {
            // sort timetable data.
            let date = new Date();
            let today = date.getDay();
            let lmTimeTable = [];

            for (var i = 0; i < data.Classes.length; i++) {
                let clsInfo = data.Classes[i];
                let clsDate = new Date(clsInfo.StartDateTime);
                // filter current day for now.
                let clsDay = clsDate.getDay();
                if (clsDay == today) {
                    let groupClass = {
                        name: clsInfo.ClassName,
                        date: clsInfo.StartDateTime,
                        instructor: clsInfo.MainInstructor.Name,
                        color: clsInfo.Colour,
                        desc: `${clsInfo.Site.SiteName} (${clsInfo.Duration}mins)`,
                    };
                    lmTimeTable.push(groupClass);
                }
            }

            // sort the list by class start time.
            lmTimeTable.sort((a, b) => (a.date > b.date) ? 1 : -1);

            // set simulator delay.
            let delay = 0.1;
            setTimeout(function () {
                let data = {
                    key: "lm-timetable",
                    value: clubName,

                    // LIMITATION ISSUE: RangeError: Encoded data too large: 3256 bytes
                    // timetable: lmTimeTable

                    timetable: lmTimeTable.splice(0, 6)
                };
                sendValue(data);
            }, 1000 * delay);
        })
        .catch((err) => {
            console.log(err);
        });
}
