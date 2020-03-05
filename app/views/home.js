import document from "document";
import clock from "clock";
import * as messaging from "messaging";
import { me } from "appbit";
import { display } from "display";

import { SETTINGS_FILE } from "../config"
import { debugLog, toTitleCase, zeroPad } from "../utils"
import { MONTHS, date, formatTo12hrTime } from "../datelib"
import {
    show, hide, createMessageDialogHelper, createSettingsHelper
} from "../helpers"

let AppSettings;
let MessageDialog;
let PhoneIcon;
let DateLabel;
let TimeLabel;
let WorkoutsTile;
let TimetableTile;
let TimetableTopText;

// screen entry point.
let views;
export function init(_views) {
    views = _views;

    AppSettings      = createSettingsHelper(SETTINGS_FILE);
    MessageDialog    = createMessageDialogHelper(document.getElementById("message-dialog"));
    PhoneIcon        = document.getElementById("no-phone");
    DateLabel        = document.getElementById("date-text");
    TimeLabel        = document.getElementById("time-text");
    let tileList     = document.getElementById("home-list")
    WorkoutsTile     = tileList.getElementById("workouts-tile");
    TimetableTile    = tileList.getElementById("timetable-tile");
    TimetableTopText = TimetableTile.getElementById("text-top");

    debugLog("Home :: initialize!");
    onMount();
    return onUnMount;
}

function onMount() {

    // Configure Date & Time
    TimeLabel.text = formatTo12hrTime(date);
    DateLabel.text = `${zeroPad(date.getDate())} ${MONTHS[date.getMonth()]}`;

    // Configure Labels
    let clubName = AppSettings.getValue("club");
    TimetableTopText.text = clubName || "Club";

    // wire up events.
    clock.granularity = "minutes";
    clock.ontick = (evt) => {TimeLabel.text = formatTo12hrTime(evt.date);}

    messaging.peerSocket.onopen = () => {
        debugLog("App Socket Open"); hide(PhoneIcon);}
    messaging.peerSocket.onclose = () => {
        debugLog("App Socket Closed"); show(PhoneIcon);}
    messaging.peerSocket.onmessage = onMessageRecieved;

    document.addEventListener("keypress", onKeyPressEvent);

    TimetableTile.getElementById("click-pad").onclick = evt => {
        debugLog("TimetableTile clicked.");
        TimetableTile.getElementById("overlay").animate("enable");
        setTimeout(() => {views.navigate("timetable");}, 300);
    };
    WorkoutsTile.getElementById("click-pad").onclick = evt => {
        debugLog("WorkoutsTile clicked.");
        WorkoutsTile.getElementById("overlay").animate("enable");
        setTimeout(() => {views.navigate("workouts");}, 300);
    };

    // Validate Phone connection.
    (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) ?
        hide(PhoneIcon) : show(PhoneIcon);

    sendValue("lm-sync");
}

// Clean-up function executed before the view is unloaded.
// No need to unsubscribe from DOM events, it's done automatically.
function onUnMount() {
    clock.granularity               = "off";
    clock.ontick                    = undefined;
    messaging.peerSocket.onopen     = undefined;
    messaging.peerSocket.onclose    = undefined;
    messaging.peerSocket.onmessage  = undefined;
    debugLog(">>> unMounted - view-tmpl");
}

function onKeyPressEvent(evt) {
    if (evt.key === "back") {
        evt.preventDefault();
        me.exit();
    }
}

// send data to companion.
function sendValue(key, data=null) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        if (data == null) {
            messaging.peerSocket.send({key: key});
        } else {
            messaging.peerSocket.send({key: key, value: data});
        }
        hide(PhoneIcon);
    } else {
        show(PhoneIcon);
    }
}

// callback when a message is recieved.
function onMessageRecieved(evt) {
    display.poke();
    switch (evt.data.key) {
        case "lm-noClub":
            debugLog("Home :: no club selected.");
            MessageDialog.Header.text = "Club Not Set";
            MessageDialog.Message.text =
                "Please select a club location from the phone app settings.";
            display.poke();
            MessageDialog.show();
            break;
        case "lm-clubChanged":
            if (evt.data.value) {
                let clubName = toTitleCase(evt.data.value);
                AppSettings.setValue("club", clubName);
                TimetableTopText.text = clubName;
                MessageDialog.hide();
                display.poke();
                debugLog(`Home :: club changed: ${clubName}`);
            }
            break;
        case "lm-syncReply":
            if (evt.data.value) {
                let clubName = toTitleCase(evt.data.value);
                AppSettings.setValue("club", clubName);
                TimetableTopText.text = clubName;
                MessageDialog.hide();
                display.poke();
                debugLog(`Home :: club location recieved: ${clubName}`);
            }
            break;
        default:
            return;
    }
}
