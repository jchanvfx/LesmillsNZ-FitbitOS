import * as messaging from "messaging";
import * as lesMills from "./lm_utils";
import { encode } from "cbor";
import { outbox } from "file-transfer";
import { me as companion } from "companion";
import { settingsStorage } from "settings";

let TIMETABLE_FILE = "LM_TIMETABLE.cbor";

// Check internet permissions
if (!companion.permissions.granted("access_internet")) {
    console.log("We're not allowed to access the internet!");
}

// Check background permissions
if (!companion.permissions.granted("run_background")) {
  console.warn("We're not allowed to access to run in the background!");
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
            fetchTimetableData(clubID);
            sendValue({key: "lm-dataQueued", value: clubName});
        } else {
            sendValue({key: "lm-noClub"});
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
    sendValue({key: "lm-clubChanged", value:clubName})
    fetchTimetableData(clubID);
}

// ----------------------------------------------------------------------------

// Send data to Fitbit device using Messaging API
function sendValue(data) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        messaging.peerSocket.send(data);
    }
}

// Fetch timetable data and add to outbox queue.
function fetchTimetableData(clubID) {
    lesMills.fetchLesMillsData(clubID)
    .then(function(data) {
        // sort timetable data.
        let date = new Date();
        let today = date.getDay();
        let timetableData = [];
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
                timetableData.push(groupClass);
            }
        }
        // sort the list by class start time.
        timetableData.sort((a, b) => (a.date > b.date) ? 1 : -1);

        // Queue timetable data.
        outbox.enqueue(TIMETABLE_FILE, encode(timetableData))
        .then(function(ft) {
            // Queued successfully
            console.log(`Transfer of "${TIMETABLE_FILE}" successfully queued.`);
        })
        .catch(function(err) {
            // Failed to queue
            throw new Error(`Failed to queue ${TIMETABLE_FILE}  Error: ${err}`);
        });

    })
    .catch(function (err) {
        // Log the error
        console.log(`Failure: ${err}`);
    });
}
