import * as messaging from "messaging";
import * as lesMills from "./utils/les_mills";
import { me as companion } from "companion";
import { settingsStorage } from "settings";
import { outbox } from "file-transfer";


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

            // fetch timetable data.
            console.log("\n\n--- LesMills fetch request ---");
            lesMills.fetchLesMillsData(clubID)
            .then(function(data) {

                // sort timetable data.
                    let date = new Date();
                    let today = date.getDay();
                    let lmTimeTable = [];
                    for (var i = 0; i < data.Classes.length; i++) {
                        let clsInfo = data.Classes[i];
                        let clsDate = new Date(clsInfo.StartDateTime);
                        let clsDay = clsDate.getDay();
                        if (clsDay == today) {
                            let groupClass = {
                                start: clsInfo.StartDateTime,
                                instructor: clsInfo.MainInstructor.Name,
                                name: clsInfo.ClassName,
                                color: clsInfo.Color,
                                details: `${clsInfo.Site.SiteName} (${clsInfo.Duration})`,
                            };
                            lmTimeTable.push(groupClass);
                        }
                    }

                    // set delay for the fitbit simulator (seconds).
                    let delay = 1;

                    setTimeout(function () {
                        // console.log(lmTimeTable);
                        let data = {
                            key: "lm-timetable",
                            value: clubName,
                            timetable: lmTimeTable.length
                        };
                        sendValue(data);
                    }, 1000 * delay);

                })
                .catch((err) => {
                    console.log(err);
                });
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
