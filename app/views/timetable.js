import document from "document";
import clock from "clock";
import * as messaging from "messaging";

import { me } from "appbit";
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
    createClassDialogHelper,
    createStatusBarHelper,
    createSideMenuHelper,
    createSettingsHelper,
} from "../helpers"

let TimetableList;
let LoadingScreen;
let MessageDialog;
let QuestionDialog;
let ClassDialog;
let StatusBar;
let SideMenu;
let SyncText;
let AppSettings;

let CurrentTimetableFile;
let OnFileRecievedUpdateGui;
let ConectionRetryCount;

let LM_TIMETABLE = [];

// screen entry point.
let views;
let options;
export function init(_views, _options) {
    views   = _views;
    options = _options || {};

    TimetableList   = document.getElementById("lm-class-list");
    LoadingScreen   = createLoadingScreenHelper(document.getElementById("loading-screen"));
    MessageDialog   = createMessageDialogHelper(document.getElementById("message-dialog"));
    ClassDialog     = createClassDialogHelper(document.getElementById("class-dialog"));
    QuestionDialog  = createQuestionDialogHelper(document.getElementById("question-dialog"));
    StatusBar       = createStatusBarHelper(document.getElementById("status-bar"));
    SideMenu        = createSideMenuHelper(document.getElementById("menu-screen"));
    SyncText        = SideMenu.Element.getElementById("sync-message");
    AppSettings     = createSettingsHelper(SETTINGS_FILE);

    onMount();
    debugLog("Timetable :: initialize!");
    return onUnMount;
}

function onMount() {
    OnFileRecievedUpdateGui = false;
    ConectionRetryCount = -1;
    SyncText.text = "Last Synced: N/A";

    (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) ?
        hide(StatusBar.PhoneIcon) : show(StatusBar.PhoneIcon);

    // Configure TimetableList.
    TimetableList.delegate = {
        getTileInfo: index => {
            let tileInfo = LM_TIMETABLE[index];
            return {
                index: index,
                type: "lm-pool",
                name: tileInfo.name,
                instructor1: tileInfo.instructor1,
                instructor2: tileInfo.instructor2,
                date: tileInfo.date,
                duration: tileInfo.duration,
                color: tileInfo.color,
                location: tileInfo.location
            };
        },
        configureTile: (tile, info) => {
            if (info.type == "lm-pool") {
                let itmDate = new Date(info.date);
                let startTime = formatTo12hrTime(itmDate);
                let tileTitle = (info.name.length > 24) ?
                    truncateString(info.name, 21) : info.name;
                tile.getElementById("text-title").text    = tileTitle.toUpperCase();
                tile.getElementById("text-subtitle").text = info.location;
                tile.getElementById("text-L").text        = startTime;
                tile.getElementById("text-R").text        = `${info.duration} mins`;
                let clickPad = tile.getElementById("click-pad");
                let diffMsecs = itmDate - date;
                if (Math.floor((diffMsecs / 1000) / 60) < -6) {
                    tile.getElementById("text-title").style.fill    = "#6e6e6e";
                    tile.getElementById("text-subtitle").style.fill = "#4f4f4f";
                    tile.getElementById("text-L").style.fill        = "#6e6e6e";
                    tile.getElementById("text-R").style.fill        = "#6e6e6e";
                    tile.getElementById("color").style.fill         = "#4f4f4f";
                    clickPad.onclick = undefined;
                } else {
                    tile.getElementById("text-title").style.fill    = "white";
                    tile.getElementById("text-subtitle").style.fill = "white";
                    tile.getElementById("text-L").style.fill        = "white";
                    tile.getElementById("text-R").style.fill        = "white";
                    tile.getElementById("color").style.fill         = info.color;
                    clickPad.onclick = (evt) => {
                        let overlay = tile.getElementById("overlay");
                        overlay.animate("enable");
                        setTimeout(() => {
                            debugLog("lm-tile: clicked!");
                            let title = info.name;
                            title = (title.length > 25) ? truncateString(title, 22) : title;
                            let names = info.instructor1;
                            names = (info.instructor2 !== undefined) ?
                                    `${names} & ${info.instructor2}`: names;
                            names = (names.length > 36) ? truncateString(names, 33) : names;
                            let black = ["black", "#000000"];

                            ClassDialog.Color.style.fill    =
                                (black.indexOf(info.color) >= 0) ? "grey" : info.color;
                            ClassDialog.Title.text          = title.toUpperCase();
                            ClassDialog.Name.text           = names;
                            ClassDialog.Label1.text         = startTime;
                            ClassDialog.Label2.text         = info.location;
                            ClassDialog.Label4.text         = info.duration;
                            ClassDialog.show();
                        }, 300);
                    }
                }
            }
        }
    }
    // TimetableList.length must be set AFTER TimetableList.delegate
    TimetableList.length = LM_TIMETABLE.length;

    // Configure SideMenu button labels.
    let clubName = AppSettings.getValue("club") || "Club Not Set!";
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

    // key press
    document.onkeypress = (evt) => {
        if (evt.key === "back") {
            evt.preventDefault();
            if (ClassDialog.isVisible()) {
                ClassDialog.hide();
            }
            else if (SideMenu.isVisible()) {
                show(StatusBar.JumpToButton);
                show(StatusBar.JumpToIcon);
                SideMenu.hide();
            }
            else if (QuestionDialog.isVisible()) {
                QuestionDialog.setHeader("");
                QuestionDialog.hide();
            }
            else {me.exit();}
        }
    }
    // data inbox
    inbox.onnewfile = onDataRecieved;
    // messaging
    messaging.peerSocket.onmessage  = onMessageRecieved;
    messaging.peerSocket.onopen     = () => {
        debugLog("App Socket Open"); hide(StatusBar.PhoneIcon);}
    messaging.peerSocket.onclose    = () => {
        debugLog("App Socket Closed"); show(StatusBar.PhoneIcon);}
    // status bar buttons.
    StatusBar.JumpToButton.onclick  = () => {jumpToLatestClass();}
    StatusBar.MenuButton.onclick    = () => {
        if (SideMenu.isVisible()) {
            show(StatusBar.JumpToButton);
            show(StatusBar.JumpToIcon);
            SideMenu.hide();
        } else {
            hide(StatusBar.JumpToButton);
            hide(StatusBar.JumpToIcon);
            SideMenu.show();
        }
    }
    // timetable schedule buttons.
    SideMenu.SubButton1.onactivate = () => {loadTimetableByDate(date);}
    SideMenu.SubButton2.onactivate = () => {loadTimetableByDate(date1);}
    SideMenu.SubButton3.onactivate = () => {loadTimetableByDate(date2);}
    // sync button.
    SideMenu.SyncButton.onactivate = () => {
        SideMenu.hide();
        if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
            MessageDialog.Header.text = "Connection Lost";
            MessageDialog.Message.text =
                "Phone connection required for internet access.";
            MessageDialog.show(true);
            return;
        }
        show(StatusBar.JumpToButton);
        show(StatusBar.JumpToIcon);
        OnFileRecievedUpdateGui = true;
        LoadingScreen.Label.text = "Requesting Data...";
        LoadingScreen.SubLabel.text = "www.lesmills.co.nz";
        LoadingScreen.show();
        sendValue("lm-fetch");
    }
    // message dialog button.
    MessageDialog.OkButton.onactivate    = MessageDialog.hide;
    // class dialog button.
    ClassDialog.CloseButton.onactivate   = ClassDialog.hide;
    // question dialog buttons. (not used)
    QuestionDialog.YesButton.onactivate  = () => {
        debugLog("Question Dialog: YES Clicked!");
    }
    QuestionDialog.NoButton.onactivate   = () => {
        debugLog("Question Dialog: NO Clicked!");
        QuestionDialog.hide();
    }

    // Update current date.
    let dateStr     = options.currentDate;
    let currentDate = (dateStr == undefined) ? date : new Date(dateStr);

    // Display the loader non animated.
    LoadingScreen.Label.text = "Loading...";
    LoadingScreen.SubLabel.text = clubName.toUpperCase();
    show(LoadingScreen.Element);

    // Load current timetable after transition.
    setTimeout(() => {loadTimetableByDate(currentDate);}, 400);
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
    inbox.onnewfile                 = undefined;
}

// ----------------------------------------------------------------------------

// callback when a message is recieved.
function onMessageRecieved(evt) {
    display.poke();
    switch (evt.data.key) {
        case "lm-noClub":
            debugLog("Timetable :: no club selected.");
            LoadingScreen.hide();
            SideMenu.SubLabel.text   = "Club Not Set";
            MessageDialog.Header.text = "Club Not Set";
            MessageDialog.Message.text =
                "Select a club location from the phone app settings.";
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
            MessageDialog.hide();
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
                LoadingScreen.Label.text = "Retrieving Data...";
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

function jumpToLatestClass() {
    if (LM_TIMETABLE.length === 0) {return;}
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

function loadTimetableFile(fileName, jumpToIndex=true) {
    LoadingScreen.Label.text = "Loading Timetable...";
    LoadingScreen.SubLabel.text = AppSettings.getValue("club");
    LoadingScreen.show();

    hide(TimetableList);

    // load locally fetched data file locally eg. "LM_dat123.cbor"
    LM_TIMETABLE.length = 0;
    if (existsSync(`/private/data/${fileName}`)) {
        LM_TIMETABLE = readFileSync(fileName, "cbor");
    }

    TimetableList.length = LM_TIMETABLE.length;

    if (LM_TIMETABLE.length !== 0) {
        debugLog(`Loading data file: ${fileName}`);
        setTimeout(() => {
            // refresh the list.
            TimetableList.redraw();
            // jump to latest tile.
            if (jumpToIndex) {jumpToLatestClass();}

            show(TimetableList);
            LoadingScreen.hide();

            let lastModified = statSync(fileName).mtime;

            // update last sync label.
            SyncText.text = `Last Synced: ` +
                            `${lastModified.getDate()} ` +
                            `${MONTHS_SHORT[lastModified.getMonth()]} - ` +
                            `${formatTo12hrTime(lastModified)}`;

            // request background update if the file modified time is more than 36hrs old.
            // then fetch data in the background.
            let timeDiff = Math.round(Math.abs(date - lastModified) / 36e5);
            debugLog(`--->> File last updated ${timeDiff} hrs ago.`);
            if (timeDiff > 36) {
                debugLog(`File ${fileName} outdated by ${timeDiff}hrs`);
                OnFileRecievedUpdateGui = true;
                sendValue("lm-fetch");
            } else {
                (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) ?
                    hide(StatusBar.PhoneIcon) : show(StatusBar.PhoneIcon);
            }

            display.poke();
            cleanUpFiles();
        }, 200);

        ConectionRetryCount = -1;
        return;
    }

    debugLog('Fetching Database...');

    ConectionRetryCount += 1;
    if (ConectionRetryCount === 0) {
        LoadingScreen.Label.text = "Retrieving Timetable...";
        LoadingScreen.SubLabel.text = "www.lesmills.co.nz";
    } else {
        LoadingScreen.Label.text = "No Classes Found!";
        LoadingScreen.SubLabel.text = `Reconnecting: ${ConectionRetryCount} of 3`;
    }

    cleanUpFiles();

    if (ConectionRetryCount > 3) {
        ConectionRetryCount = -1;
        if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
            LoadingScreen.hide();
            MessageDialog.Header.text = "Connection Lost";
            MessageDialog.Message.text = "Phone connection required for internet access.";
            MessageDialog.show(true);
            return;
        }
        if (LoadingScreen.isVisible()) {
            LoadingScreen.hide();
            MessageDialog.Header.text = "No Classes";
            MessageDialog.Message.text = "Couldn't retrive any classes for this date.";
            MessageDialog.show(true);
            return;
        }
    }

    OnFileRecievedUpdateGui = true;
    if (ConectionRetryCount === 0) {
        sendValue("lm-fetch");
        return;
    }
    setTimeout(() => {sendValue("lm-fetch");}, 2000);
}

function loadTimetableByDate(date) {
    StatusBar.setDate(date);
    ClassDialog.Label3.text = `${DAYS_SHORT[date.getDay()]} ` +
                              `${date.getDate()} ` +
                              `${MONTHS_SHORT[date.getMonth()]}`;
    show(StatusBar.JumpToButton);
    show(StatusBar.JumpToIcon);
    SideMenu.hide();
    CurrentTimetableFile = `${DATA_FILE_PREFIX}` +
                            `${date.getDay()}` +
                            `${date.getDate()}` +
                            `${date.getMonth()}.cbor`;
    loadTimetableFile(CurrentTimetableFile);
}