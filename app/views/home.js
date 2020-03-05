import document from "document";
import clock from "clock";
import * as messaging from "messaging";
import { me } from "appbit";
import { display } from "display";

import { debugLog } from "../utils"
import { SETTINGS_FILE, BUILD_VER } from "../config"
import { MONTHS_SHORT, date, formatTo12hrTime } from "../datelib"
import {
    show, hide,
    createLoadingScreenHelper,
    createMessageDialogHelper,
    createSettingsHelper
} from "../helpers"

let AppSettings;
let MessageDialog;
let LoadingScreen;
let PhoneIcon;
let DateLabel;
let TimeLabel;
let BottomLabel;
let WorkoutsTile;
let TimetableTile;
let TimetableTileTopText;

// screen entry point.
let views;
export function init(_views) {
    views = _views;

    AppSettings     = createSettingsHelper(SETTINGS_FILE);
    MessageDialog   = createMessageDialogHelper(document.getElementById("message-dialog"));
    LoadingScreen   = createLoadingScreenHelper(document.getElementById("loading-screen"));
    PhoneIcon       = document.getElementById("no-phone");
    DateLabel       = document.getElementById("date-text");
    TimeLabel       = document.getElementById("time-text");
    BottomLabel     = document.getElementById("bottom-text");
    let tileList    = document.getElementById("home-list")
    WorkoutsTile    = tileList.getElementById("workouts-tile");
    TimetableTile   = tileList.getElementById("timetable-tile");
    // TimetableTileTopText = TimetableTile.getByElementById("text-top");

    debugLog("view-tmpl :: initialize!");
    onMount();
    return onUnMount;
}

function onMount() {

    // Configure Date & Time
    TimeLabel.text = formatTo12hrTime(date);
    DateLabel.text = `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} (Today)`;

    BottomLabel.text = `Build: v${BUILD_VER}`;

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
        // setTimeout(() => {views.navigate("timetable");}, 300);
    };
    WorkoutsTile.getElementById("click-pad").onclick = evt => {
        debugLog("WorkoutsTile clicked.");
        WorkoutsTile.getElementById("overlay").animate("enable");
        // setTimeout(() => {views.navigate("workouts");}, 300);
    };

    // Validate Phone connection.
    (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) ?
        hide(PhoneIcon) : show(PhoneIcon);

    // TimetableTileTopText.text = "Club:";
    // sendValue("lm-sync");
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
            debugLog("no club selected.");
            LoadingScreen.hide();
            MessageDialog.Header.text = "Club Not Set";
            MessageDialog.Message.text =
                "Please select a club location from the phone app settings.";
            MessageDialog.show();
            break;
        case "lm-clubChanged":
            if (evt.data.value) {
                let clubName = evt.data.value;
                AppSettings.setValue("club", clubName);
                TimetableTileTopText.text = `Club: (${clubName})`;
                LoadingScreen.hide();
                debugLog(`Club changed to: ${clubName}`);
            }
            break;
        case "lm-syncReply":
            if (evt.data.value) {
                let clubName = evt.data.value;
                AppSettings.setValue("club", clubName);
                TimetableTileTopText.text = `Club: (${clubName})`;
                LoadingScreen.hide();
                debugLog(`Club changed to: ${clubName}`);
            }
            break;
        default:
            return;
    }
}
