import clock from "clock";
import document from "document";
import * as messaging from "messaging";
// import { me } from "appbit";
import { display } from "display";
import { inbox } from "file-transfer"
import { existsSync, readFileSync, statSync } from "fs";

import { WORKOUTS_FILE, SETTINGS_FILE, BUILD_VER } from "../../common/config"
import { debugLog, toTitleCase, truncateString } from "../utils"
import { DAYS_SHORT, MONTHS_SHORT, date, date1, date2 } from "../datelib"
import {
    show, hide,
    createLoadingScreenHelper,
    createMessageDialogHelper,
    createQuestionDialogHelper,
    createStatusBarHelper,
    createSideMenuHelper,
    createSettingsHelper
} from "../helpers"

let WorkoutsList;
let LoadingScreen;
let MessageDialog;
let QuestionDialog;
let StatusBar;
let SideMenu;
let AppSettings;

let OnFileRecievedUpdateGui;

let LM_CLASSES = [];


// screen entry point.
let views;
let options;
export function init(_views, _options) {
    views   = _views;
    options = _options;

    WorkoutsList    = document.getElementById("workouts-list");
    LoadingScreen   = createLoadingScreenHelper(document.getElementById("loading-screen"));
    MessageDialog   = createMessageDialogHelper(document.getElementById("message-dialog"));
    QuestionDialog  = createQuestionDialogHelper(document.getElementById("question-dialog"));
    StatusBar       = createStatusBarHelper(document.getElementById("status-bar"));
    SideMenu        = createSideMenuHelper(document.getElementById("menu-screen"));
    AppSettings     = createSettingsHelper(SETTINGS_FILE);

    onMount();
    debugLog("Workouts :: initialize!");
    return onUnMount;
}

// entry point when this view is mounted, setup elements and events.
function onMount() {

    OnFileRecievedUpdateGui = false;

    // Configure WorkoutsList.
    WorkoutsList.delegate = {
        getTileInfo: function(index) {
            let clsData = LM_CLASSES[index];
            return {
                index : index,
                type  : "workouts-pool",
                value : clsData.name,
                color : clsData.color,
                icon  : clsData.iconName
            };
        },
        configureTile: function(tile, info) {
            if (info.type == "workouts-pool") {
                let iconPath = `./resources/icons/${info.icon}.png`;
                tile.getElementById("icon").href = iconPath;

                let workout = info.value;
                let mixedtext = tile.getElementById("mixedtext");
                if (workout.length > 13) {
                    mixedtext.getElementById("copy").text = workout;
                    show(mixedtext);
                    tile.getElementById("text").text = "";
                    hide(tile.getElementById("text"));
                }
                else {
                    tile.getElementById("text").text = workout;
                    show(tile.getElementById("text"));
                    mixedtext.getElementById("copy").text = "";
                    hide(mixedtext);
                }
                tile.getElementById("ring").style.fill = info.color;
                let clickPad = tile.getElementById("click-pad");
                clickPad.onclick = evt => {onTileClicked(tile, info);}
            }
        }
    };
    // WorkoutsList.length must be set AFTER WorkoutsList.delegate
    WorkoutsList.length = LM_CLASSES.length;

    // Configure SideMenu button labels.
    SideMenu.MainLabel.text  = "Group Fitness";
    SideMenu.MainButton.text = "Workouts";
    let clubName = AppSettings.getValue("club");
    SideMenu.SubLabel.text   = truncateString(clubName, 26);
    SideMenu.SubButton1.text = `${DAYS_SHORT[date.getDay()]} ` +
                               `${date.getDate()} ` +
                               `${MONTHS_SHORT[date.getMonth()]}`;
    SideMenu.SubButton2.text = `${DAYS_SHORT[date1.getDay()]} ` +
                               `${date1.getDate()} ` +
                               `${MONTHS_SHORT[date1.getMonth()]}`;
    SideMenu.SubButton3.text = `${DAYS_SHORT[date2.getDay()]} ` +
                               `${date2.getDate()} ` +
                               `${MONTHS_SHORT[date2.getMonth()]}`;
    SideMenu.Footer.text     = "v" + BUILD_VER;
    hide(SideMenu.Element);

    // disable jumpTo button.
    hide(StatusBar.JumpToButton);
    hide(StatusBar.JumpToIcon);

    // Configure StatusBar date.
    StatusBar.setDate(date);

    // Update Workouts list.
    loadWorkoutClasses();

    // wire up events.
    clock.granularity = "minutes";
    clock.ontick = (evt) => {StatusBar.setTime(evt.date);}

    messaging.peerSocket.onopen = () => {
        debugLog("App Socket Open"); hide(StatusBar.PhoneIcon);}
    messaging.peerSocket.onclose = () => {
        debugLog("App Socket Closed"); show(StatusBar.PhoneIcon);}
    messaging.peerSocket.onmessage = onMessageRecieved;
    inbox.addEventListener("newfile", onDataRecieved);
    // key press.
    document.addEventListener("keypress", onKeyPressEvent);
    // status bar menu button.
    StatusBar.MenuButton.addEventListener("click", () => {
        SideMenu.isVisible() ? SideMenu.hide() : SideMenu.show();
    });
    // workout button.
    SideMenu.MainButton.addEventListener("activate", () => {
        views.navigate("workouts");
    });
    // timetable schedule buttons.
    SideMenu.SubButton1.addEventListener("activate", () => {
        loadTimetable(date);
    });
    SideMenu.SubButton2.addEventListener("activate", () => {
        loadTimetable(date1);
    });
    SideMenu.SubButton3.addEventListener("activate", () => {
        loadTimetable(date2);
    });
    // sync button.
    SideMenu.SyncButton.addEventListener("activate", () => {
        SideMenu.hide();
        OnFileRecievedUpdateGui = true;
        LoadingScreen.Label.text = "Updating Timetable...";
        LoadingScreen.SubLabel.text = "www.lesmills.co.nz";
        LoadingScreen.show();
        setTimeout(() => {sendValue("lm-fetch");}, 500);
    });

    // question dialog buttons.
    QuestionDialog.YesButton.addEventListener("activate", () => {
        LM_CLASSES.length = 0;
        views.navigate("exercise", {workout: `${QuestionDialog.getHeader()}`});
    });
    QuestionDialog.NoButton.addEventListener("activate", () => {
        QuestionDialog.setHeader("");
        QuestionDialog.hide();
    });

    // Hide FadeIn element.
    setTimeout(() => {hide(document.getElementById("black-fade"));}, 400);
}

// Clean-up function executed before the view is unloaded.
// No need to unsubscribe from DOM events, it's done automatically.
function onUnMount() {
    debugLog(">>> unMounted - Workouts");
    LM_CLASSES.length               = 0;
    clock.granularity               = "off";
    clock.ontick                    = undefined;
    messaging.peerSocket.onopen     = undefined;
    messaging.peerSocket.onclose    = undefined;
    messaging.peerSocket.onmessage  = undefined;
    inbox.removeEventListener("newfile", onDataRecieved);
}

// ----------------------------------------------------------------------------

// callback when a message is recieved.
function onMessageRecieved(evt) {
    display.poke();
    switch (evt.data.key) {
        case "lm-noClub":
            debugLog("Workouts :: no club selected.");
            LoadingScreen.hide();
            MessageDialog.Header.text = "Club Not Set";
            MessageDialog.Message.text =
                "Please select a club location from the phone app settings.";
            MessageDialog.show();
            break;
        case "lm-clubChanged":
            if (evt.data.value) {
                OnFileRecievedUpdateGui = true;
                let clubName = evt.data.value;
                debugLog(`Workouts :: club changed to: ${clubName}`);
                LoadingScreen.Label.text    = "Changing Clubs...";
                LoadingScreen.SubLabel.text = clubName;
                LoadingScreen.show();
                clubName = toTitleCase(clubName);
                AppSettings.setValue("club", clubName);
                SideMenu.SubLabel.text = truncateString(clubName, 26);
            }
            break;
        case "lm-classesReply":
            if (evt.data.value) {
                let clubName = evt.data.value;
                debugLog(`Workouts :: ${clubName} classes queued.`);
                if (OnFileRecievedUpdateGui) {
                    LoadingScreen.Label.text    = "Loading Workouts...";
                    LoadingScreen.SubLabel.text = clubName;
                    LoadingScreen.show();
                }
                clubName = toTitleCase(clubName);
                AppSettings.setValue("club", clubName);
                SideMenu.SubLabel.text = truncateString(clubName, 26);
            } else {
                debugLog("classes reply");
            }
            break;
        case "lm-noClasses":
            debugLog("Workouts :: no classes.");
            LoadingScreen.hide();
            SideMenu.SubLabel.text     = "Timetable";
            MessageDialog.Header.text  = "No Classes";
            MessageDialog.Message.text =
                "Failed to retrive group fitness workouts from database.";
            MessageDialog.show();
            break;
        case "lm-fetchReply":
            LoadingScreen.hide();
            let clubName = evt.data.value;
            clubName = toTitleCase(clubName);
            AppSettings.setValue("club", clubName);
            SideMenu.SubLabel.text = truncateString(clubName, 26);
        default:
            return;
    }
}

// callback when file transfer has completed.
function onDataRecieved() {
    let fileName;
    while (fileName = inbox.nextFile()) {
        if (fileName === WORKOUTS_FILE) {
            debugLog(`file ${fileName} recieved!`);
            // hide loading screen & message dialog just incase.
            LoadingScreen.hide();
            MessageDialog.hide();
            // update timetable if specified.
            if (OnFileRecievedUpdateGui) {
                OnFileRecievedUpdateGui = false;
                loadWorkoutClasses();
                display.poke();
            }
            break;
        }
    }
    (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) ?
        hide(StatusBar.PhoneIcon) : show(StatusBar.PhoneIcon);
}

// send data to companion.
function sendValue(key, data=null) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        if (data == null) {
            messaging.peerSocket.send({key: key});
        } else {
            messaging.peerSocket.send({key: key, value: data});
        }
        hide(StatusBar.PhoneIcon);
    } else {
        show(StatusBar.PhoneIcon);
    }
}

// ----------------------------------------------------------------------------

function loadTimetable(date) {
    LM_CLASSES.length = 0;
    views.navigate("timetable", {currentDate: date.toISOString()});
}

function loadWorkoutClasses() {
    hide(WorkoutsList);
    LoadingScreen.Label.text = "Loading Workouts...";
    LoadingScreen.SubLabel.text = "www.lesmills.co.nz";
    LoadingScreen.show();

    LM_CLASSES.length = 0;
    if (existsSync(`/private/data/${WORKOUTS_FILE}`)) {
        LM_CLASSES = readFileSync(WORKOUTS_FILE, "cbor");
    }
    debugLog(`number of classes ${LM_CLASSES.length}`);

    if (LM_CLASSES.length != 0) {
        debugLog(`Loading data file: ${WORKOUTS_FILE}`);

        // refresh to the list.
        WorkoutsList.length = LM_CLASSES.length;
        WorkoutsList.redraw();

        show(WorkoutsList, true);
        LoadingScreen.hide();

        // request background update if the file modified is more than 5 days old.
        let mTime = statSync(WORKOUTS_FILE).mtime;
        let timeDiff = Math.round(Math.abs(date - mTime) / 36e5);
        if (timeDiff > 120) {
            debugLog(`File ${WORKOUTS_FILE} outdated by ${timeDiff}hrs`);
            OnFileRecievedUpdateGui = false;
            sendValue("lm-classes");
        } else {
            (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) ?
                hide(StatusBar.PhoneIcon) : show(StatusBar.PhoneIcon);
        }
        return;
    }

    debugLog('Fetching Database...');
    OnFileRecievedUpdateGui = true;
    sendValue("lm-classes");
    display.poke();
}

function onTileClicked(tile, info) {
    let workout = info.value;
    QuestionDialog.setHeader(workout);
    QuestionDialog.Message.text = "Start Workout?"
    tile.getElementById("overlay").animate("enable");
    setTimeout(() => {QuestionDialog.show();}, 300);
    debugLog(`${workout} tile clicked`);
};

function onKeyPressEvent(evt) {
    if (evt.key === "back") {
        evt.preventDefault();
        if (SideMenu.isVisible()) {
            SideMenu.hide();
        }
        else if (QuestionDialog.isVisible()) {
            QuestionDialog.setHeader("");
            QuestionDialog.hide();
        }
        else {
            views.navigate("home");
            // me.exit();
        }
    }
}
