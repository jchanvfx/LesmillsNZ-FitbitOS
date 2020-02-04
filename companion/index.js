import * as messaging from "messaging";
import * as lesMills from "./lm_utils";
import { encode } from "cbor";
import { outbox } from "file-transfer";
import { me as companion } from "companion";
import { settingsStorage } from "settings";

const TIMETABLE_FILE = "LM_TIMETABLE.cbor";


// Fetch timetable data and add to outbox queue.
function fetchTimetableData(clubID) {
    lesMills.fetchLesMillsData(clubID)
    .then(function(data) {
        let dateToday = new Date();
        let dateTomrr = new Date(dateToday);
        dateTomrr.setDate(dateToday.getDate() + 1);

        let today = dateToday.getDay();
        let tomrr = dateTomrr.getDay();

        let timetableData = {};
        timetableData[today.toString()] = [];
        timetableData[tomrr.toString()] = [];

        for (var i = 0; i < data.Classes.length; i++) {
            let clsInfo = data.Classes[i];
            let clsDate = new Date(clsInfo.StartDateTime);
            let clsDay = clsDate.getDay();

            // TODO: filtering current day for now.
            // if ([today, tomrr].includes(clsDay)) {
            if ([today].includes(clsDay)) {
                let groupClass = {
                    name: clsInfo.ClassName,
                    date: clsInfo.StartDateTime,
                    instructor: clsInfo.MainInstructor.Name,
                    color: clsInfo.Colour,
                    desc: `${clsInfo.Site.SiteName} (${clsInfo.Duration}mins)`,
                };
                timetableData[clsDay.toString()].push(groupClass);
            }
        }
        // Sort class start time.
        timetableData[today.toString()].sort((a, b) => (a.date > b.date) ? 1 : -1);
        timetableData[tomrr.toString()].sort((a, b) => (a.date > b.date) ? 1 : -1);

        // Queue timetable data.
        outbox.enqueue(TIMETABLE_FILE, encode(timetableData))
        .then(function(ft) {
            console.log(`Transfer of "${TIMETABLE_FILE}" successfully queued.`);
        })
        .catch(function(err) {
            throw new Error(`Failed to queue ${TIMETABLE_FILE}  Error: ${err}`);
        });

    })
    .catch(function (err) {
        console.log(`Failure: ${err}`);
    });
}

// Send data to Fitbit device using Messaging API
function sendValue(data) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        messaging.peerSocket.send(data);
    }
}

// ----------------------------------------------------------------------------

// Check internet permissions
if (!companion.permissions.granted("access_internet")) {
    console.log("We're not allowed to access the internet!");
}

// Listen for the onerror event
messaging.peerSocket.onerror = function(err) {
    console.log(`Connection error: ${err.code} - ${err.message}`);
}

// Message socket opens (send)
messaging.peerSocket.onopen = function() {
    console.log("Companion Socket Open");
};

// Message socket closes
messaging.peerSocket.onclose = function() {
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

// Settings changed callback
settingsStorage.onchange = function(evt) {
    let selectedClub = JSON.parse(evt.newValue).values[0];
    let clubID = selectedClub.value;
    let clubName = selectedClub.name;
    sendValue({key: "lm-clubChanged", value:clubName});
    fetchTimetableData(clubID);
}
