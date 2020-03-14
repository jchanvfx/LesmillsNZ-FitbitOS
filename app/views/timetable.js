import document from "document";
import clock from "clock";
import * as messaging from "messaging";
// import { me } from "appbit";
import { display } from "display";
import { inbox } from "file-transfer"
import { existsSync, listDirSync, readFileSync, statSync, unlinkSync } from "fs";

import { DATA_FILE_PREFIX, SETTINGS_FILE, BUILD_VER } from "../../common/config"
import { debugLog, toTitleCase, truncateString } from "../utils"
import {
    DAYS_SHORT, MONTHS_SHORT,
    date, date1, date2, formatTo12hrTime
} from "../datelib"
import {
    show, hide,
    createLoadingScreenHelper,
    createMessageDialogHelper,
    createQuestionDialogHelper,
    createStatusBarHelper,
    createSideMenuHelper,
    createSettingsHelper
} from "../helpers"

let TimetableList;
let LoadingScreen;
let MessageDialog;
let QuestionDialog;
let StatusBar;
let SideMenu;
let AppSettings;

let CurrentTimetableFile;
let OnFileRecievedUpdateGui;

let LM_TIMETABLE = [];

// screen entry point.
let views;
let options;
export function init(_views, _options) {
    views   = _views;
    options = _options;

    TimetableList   = document.getElementById("lm-class-list");
    LoadingScreen   = createLoadingScreenHelper(document.getElementById("loading-screen"));
    MessageDialog   = createMessageDialogHelper(document.getElementById("message-dialog"));
    QuestionDialog  = createQuestionDialogHelper(document.getElementById("question-dialog"));
    StatusBar       = createStatusBarHelper(document.getElementById("status-bar"));
    SideMenu        = createSideMenuHelper(document.getElementById("menu-screen"));
    AppSettings     = createSettingsHelper(SETTINGS_FILE);

    onMount();
    debugLog("Timetable :: initialize!");
    return onUnMount;
}

function onMount() {
    OnFileRecievedUpdateGui = false;

    // Configure TimetableList.
    TimetableList.delegate = {
        getTileInfo: index => {
            let tileInfo = LM_TIMETABLE[index];
            return {
                index: index,
                type: "lm-pool",
                name: tileInfo.name,
                instructor: tileInfo.instructor,
                date: tileInfo.date,
                desc: tileInfo.desc,
                color: tileInfo.color,
            };
        },
        configureTile: (tile, info) => {
            if (info.type == "lm-pool") {
                let itmDate = new Date(info.date);
                tile.getElementById("text-title").text = info.name.toUpperCase();
                tile.getElementById("text-subtitle").text = info.instructor;
                tile.getElementById("text-L").text = formatTo12hrTime(itmDate);
                tile.getElementById("text-R").text = info.desc;
                let diffMsecs = itmDate - date;
                if (Math.floor((diffMsecs / 1000) / 60) < -6) {
                    tile.getElementById("text-title").style.fill = "#6e6e6e";
                    tile.getElementById("text-subtitle").style.fill = "#4f4f4f";
                    tile.getElementById("text-L").style.fill = "#6e6e6e";
                    tile.getElementById("text-R").style.fill = "#6e6e6e";
                    tile.getElementById("color").style.fill = "#4f4f4f";
                    let clickPad = tile.getElementById("click-pad");
                    clickPad.onclick = undefined;
                } else {
                    tile.getElementById("text-title").style.fill = "white";
                    tile.getElementById("text-subtitle").style.fill = "white";
                    tile.getElementById("text-L").style.fill = "white";
                    tile.getElementById("text-R").style.fill = "white";
                    tile.getElementById("color").style.fill = info.color;

                    let clickPad = tile.getElementById("click-pad");
                    clickPad.onclick = evt => {onTileClicked(tile, info);}
                }
            }
        }
    }
    // TimetableList.length must be set AFTER TimetableList.delegate
    TimetableList.length = LM_TIMETABLE.length;

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

    // Wire up events.
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
    // status bar buttons.
    StatusBar.JumpToButton.addEventListener("click", jumpToTile)
    StatusBar.MenuButton.addEventListener("click", () => {
        if (SideMenu.isVisible()) {
            show(StatusBar.JumpToButton);
            show(StatusBar.JumpToIcon);
            SideMenu.hide();
        } else {
            hide(StatusBar.JumpToButton);
            hide(StatusBar.JumpToIcon);
            SideMenu.show();
        }
    });
    // workout button.
    SideMenu.MainButton.addEventListener("activate", () => {
        views.navigate("workouts");
    });
    // timetable schedule buttons.
    SideMenu.SubButton1.addEventListener("activate", () => {
        StatusBar.setDate(date);
        show(StatusBar.JumpToButton);
        show(StatusBar.JumpToIcon);
        SideMenu.hide();
        CurrentTimetableFile = `${DATA_FILE_PREFIX}` +
                               `${date.getDay()}` +
                               `${date.getDate()}` +
                               `${date.getMonth()}.cbor`
        loadTimetableFile(CurrentTimetableFile);
    });
    SideMenu.SubButton2.addEventListener("activate", () => {
        StatusBar.setDate(date1);
        show(StatusBar.JumpToButton);
        show(StatusBar.JumpToIcon);
        SideMenu.hide();
        CurrentTimetableFile = `${DATA_FILE_PREFIX}` +
                               `${date1.getDay()}` +
                               `${date1.getDate()}` +
                               `${date1.getMonth()}.cbor`;
        loadTimetableFile(CurrentTimetableFile);
    });
    SideMenu.SubButton3.addEventListener("activate", () => {
        StatusBar.setDate(date2);
        show(StatusBar.JumpToButton);
        show(StatusBar.JumpToIcon);
        SideMenu.hide();
        CurrentTimetableFile = `${DATA_FILE_PREFIX}` +
                               `${date2.getDay()}` +
                               `${date2.getDate()}` +
                               `${date2.getMonth()}.cbor`;
        loadTimetableFile(CurrentTimetableFile);
    });
    // question dialog buttons.
    QuestionDialog.YesButton.addEventListener("activate", () => {
        LM_TIMETABLE.length = 0;
        views.navigate("exercise", {workout: `${QuestionDialog.getHeader()}`});
    });
    QuestionDialog.NoButton.addEventListener("activate", () => {
        QuestionDialog.setHeader("");
        QuestionDialog.hide();
    });

    // Update StatusBar date.
    let dateStr     = options.currentDate;
    let currentDate = (dateStr == undefined) ? date : new Date(dateStr);
    StatusBar.setDate(currentDate);

    // Update timetable
    CurrentTimetableFile = `${DATA_FILE_PREFIX}` +
                           `${currentDate.getDay()}` +
                           `${currentDate.getDate()}` +
                           `${currentDate.getMonth()}.cbor`;
    loadTimetableFile(CurrentTimetableFile);
}

// Clean-up function executed before the view is unloaded.
// No need to unsubscribe from DOM events, it's done automatically.
function onUnMount() {
    debugLog(">>> unMounted - Timetable");
    LM_TIMETABLE.length             = 0;
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
            debugLog("Timetable :: no club selected.");
            LoadingScreen.hide();
            SideMenu.SubLabel.text   = "Timetable";
            MessageDialog.Header.text = "Club Not Set";
            MessageDialog.Message.text =
                "Please select a club location from the phone app settings.";
            MessageDialog.show();
            break;
        case "lm-clubChanged":
            if (evt.data.value) {
                OnFileRecievedUpdateGui = true;
                let clubName = evt.data.value;
                debugLog(`Timetable :: club changed to: ${clubName}`);
                LoadingScreen.Label.text    = "Changing Clubs...";
                LoadingScreen.SubLabel.text = clubName;
                LoadingScreen.show();
                clubName = toTitleCase(clubName);
                AppSettings.setValue("club", clubName);
                SideMenu.SubLabel.text = truncateString(clubName, 26);
            }
            break;
        case "lm-fetchReply":
            if (OnFileRecievedUpdateGui) {
                let clubName = evt.data.value;
                LoadingScreen.Label.text    = "Retrieving Timetable...";
                LoadingScreen.SubLabel.text = clubName;
                LoadingScreen.show();
                clubName = toTitleCase(clubName);
                AppSettings.setValue("club", clubName);
                SideMenu.SubLabel.text = truncateString(clubName, 26);
            }
            break;
        case "lm-dataQueued":
            let clubName = evt.data.value;
            debugLog(`Timetable :: Data has been queued: ${clubName}`);
            if (LoadingScreen.isVisible()) {
                LoadingScreen.Label.text = "Waiting for Data...";
                LoadingScreen.SubLabel.text = clubName;
            }
            break;
        default:
            return;
    }
}

// callback when file transfer has completed.
function onDataRecieved() {
    let fileName;
    while (fileName = inbox.nextFile()) {
        if (fileName === CurrentTimetableFile) {
            debugLog(`File ${fileName} recieved!`);
            // hide loading screen & message dialog just incase.
            LoadingScreen.hide();
            MessageDialog.hide();
            // update timetable if specified.
            if (OnFileRecievedUpdateGui) {
                OnFileRecievedUpdateGui = false;
                loadTimetableFile(fileName);
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

// clean up old local files.
function cleanUpFiles() {
    let keepList = [
        `${DATA_FILE_PREFIX}${date.getDay()}${date.getDate()}${date.getMonth()}.cbor`,
        `${DATA_FILE_PREFIX}${date1.getDay()}${date1.getDate()}${date1.getMonth()}.cbor`,
        `${DATA_FILE_PREFIX}${date2.getDay()}${date2.getDate()}${date2.getMonth()}.cbor`,
    ];
    if (keepList.indexOf(CurrentTimetableFile) < 0) {
        keepList.push(CurrentTimetableFile);
    }
    let dirIter;
    let listDir = listDirSync("/private/data");
    while((dirIter = listDir.next()) && !dirIter.done) {
        if (dirIter.value === undefined) {continue;}
        // ECMAScript 5.1 doesn't support "String.startsWith()" and "Array.includes()"
        if (dirIter.value.indexOf(DATA_FILE_PREFIX) === 0) {
            if (keepList.indexOf(dirIter.value) < 0) {
                unlinkSync(dirIter.value);
                debugLog(`Deleted: ${dirIter.value}`);
            }
        }
    }
}

function loadTimetableFile(fileName, jumpToIndex=true) {
    LoadingScreen.Label.text = "Loading Timetable...";
    LoadingScreen.SubLabel.text = "";
    LoadingScreen.show();

    hide(TimetableList);

    // load locally fetched data file locally eg. "LM_dat123.cbor"
    LM_TIMETABLE.length = 0;
    if (existsSync(`/private/data/${fileName}`)) {
        LM_TIMETABLE = readFileSync(fileName, "cbor");
    }
    if (LM_TIMETABLE.length !== 0) {
        debugLog(`Loading data file: ${fileName}`);
        setTimeout(() => {
            // refresh to the list.
            TimetableList.length = LM_TIMETABLE.length;
            TimetableList.redraw();
            // jump to latest tile.
            if (jumpToIndex) {jumpToTile();}

            show(TimetableList);
            LoadingScreen.hide();

            // request background update if the file modified is more than 48hrs old.
            // then fetch data in the background.
            let mTime = statSync(fileName).mtime;
            let timeDiff = Math.round(Math.abs(date - mTime) / 36e5);
            if (timeDiff > 48) {
                debugLog(`File ${fileName} outdated by ${timeDiff}hrs`);
                OnFileRecievedUpdateGui = false;
                sendValue("lm-fetch");
            } else {
                (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) ?
                    hide(StatusBar.PhoneIcon) : show(StatusBar.PhoneIcon);
            }
        }, 200);

        display.poke();
        cleanUpFiles();
        return;
    }

    debugLog('Fetching Database...');
    OnFileRecievedUpdateGui = true;
    LoadingScreen.Label.text = "Requesting Timetable...";
    LoadingScreen.SubLabel.text = "www.lesmills.co.nz";
    LoadingScreen.show();
    sendValue("lm-fetch");
    cleanUpFiles();

    // Give 6 second period before displaying connection lost or retry.
    setTimeout(() => {
        if (LoadingScreen.isVisible()) {
            if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
                LoadingScreen.hide();
                MessageDialog.Header.text = "Connection Lost";
                MessageDialog.Message.text = "Failed to retrive data from phone.";
                MessageDialog.show();
            } else {
                LoadingScreen.Label.text = "Reconnecting...";
                LoadingScreen.SubLabel.text = "www.lesmills.co.nz";
                LoadingScreen.show();
                sendValue("lm-fetch");
            }
        }
        display.poke();
    }, 6000);
}

function jumpToTile() {
    let currentIdx = 0;
    let time;
    let i = LM_TIMETABLE.length, x = -1;
    while (i--) {
        x++;
        time = new Date(LM_TIMETABLE[x].date);
        if (time - date > 0) {currentIdx = x; break;}
    }
    TimetableList.value = currentIdx;
}

function onTileClicked(tile, info) {
    let workout = info.name.toUpperCase();;
    workout = workout.replace(/VIRTUAL|30|45/g, "");
    workout = workout.replace(/^\s+|\s+$/g, "");

    // ECMAScript 5.1 doesn't support "String.endsWith()"
    let excl = " INTRO";
    if (workout.slice(-excl.length) === excl) {
        workout = workout.slice(0, -excl.length);
    }

    QuestionDialog.setHeader(workout);
    QuestionDialog.Message.text = "Start Workout?"
    tile.getElementById("overlay").animate("enable");
    setTimeout(() => {QuestionDialog.show();}, 300);
    debugLog(`${workout} tile clicked`);
}

function onKeyPressEvent(evt) {
    if (evt.key === "back") {
        evt.preventDefault();
        if (SideMenu.isVisible()) {
            show(StatusBar.JumpToButton);
            show(StatusBar.JumpToIcon);
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
