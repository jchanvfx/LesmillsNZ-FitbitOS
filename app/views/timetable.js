import document from "document";
import clock from "clock";
import * as messaging from "messaging";

import { me } from "appbit";
import { display } from "display";
import { inbox } from "file-transfer"
import {
    existsSync, listDirSync, readFileSync, statSync, unlinkSync
} from "fs";

import { DATA_FILE_PREFIX, SETTINGS_FILE, BUILD_VER } from "../../common/config"
import { debugLog, toTitleCase, truncateString, zeroPad } from "../utils"
import {
    DAYS_SHORT, MONTHS_SHORT,
    date, date1, date2, date3, date4, date5, date6,
    formatTo12hrTime
} from "../../common/datelib"
import {
    show, hide,
    loadingScreenController,
    messageDialogController,
    classDialogController,
    statusBarController,
    sideMenuController,
    settingsController,
} from "../helpers"

let TimetableList;
let LoadingScreen;
let MessageDialog;
let ClassDialog;
let StatusBar;
let SideMenu;
let SyncText;
let AppSettings;

let CurrentTimetableFile;
let OnFileRecievedUpdateGui;
let ConectionRetryCount;
let TileSelected;

let LM_TIMETABLE = [];

// screen entry point.
export function TimetableViewCtrl() {
    this.name;
    this.navigate;
    this.onMount = (kwargs) => {
        let options = kwargs || {};
        TimetableList   = document.getElementById("lm-class-list");
        LoadingScreen   = loadingScreenController(document.getElementById("loading-screen"));
        MessageDialog   = messageDialogController(document.getElementById("message-dialog"));
        ClassDialog     = classDialogController(document.getElementById("class-dialog"));
        StatusBar       = statusBarController(document.getElementById("status-bar"));
        SideMenu        = sideMenuController(document.getElementById("menu-screen"));
        SyncText        = SideMenu.Element.getElementById("sync-message");
        AppSettings     = settingsController(SETTINGS_FILE);

        // initialize.
        TileSelected = false;
        OnFileRecievedUpdateGui = false;
        ConectionRetryCount = -1;
        SyncText.text = "Last Synced: N/A";

        (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) ?
            StatusBar.hidePhone() : StatusBar.showPhone();

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
                    let elms = ["background", "color", "text-L", "text-R",
                                "tl", "tr", "text-subtitle"];
                    // hide elements for the very last tile.
                    if (info.index === LM_TIMETABLE.length-1) {
                        for (let i = 0; i < elms.length; i++) {
                            hide(tile.getElementById(elms[i]));
                        }
                        tile.getElementById("text-title").text = "Back to Top";
                        tile.getElementById("text-title").style.fill = "fb-aqua";
                        tile.getElementById("color-G").href = "./resources/images/tile_last.png";
                        tile.getElementById("color-G").style.fill = "fb-aqua";
                        tile.getElementById("click-pad").onclick = jumpToLatestClass;
                        return;
                    }

                    // populate tile
                    for (let i = 0; i < elms.length; i++) {
                        show(tile.getElementById(elms[i]));
                    }
                    tile.getElementById("color-G").href = "./resources/images/tile_grad.png";
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
                        tile.getElementById("text-subtitle").style.fill = "#6e6e6e";
                        tile.getElementById("text-L").style.fill        = "#6e6e6e";
                        tile.getElementById("text-R").style.fill        = "#6e6e6e";
                        tile.getElementById("color").style.fill         = "#000000";
                        tile.getElementById("color-G").style.fill       = "#272727";
                        clickPad.onclick = undefined;
                    } else {
                        tile.getElementById("text-title").style.fill    = "white";
                        tile.getElementById("text-subtitle").style.fill = "white";
                        tile.getElementById("text-L").style.fill        = "white";
                        tile.getElementById("text-R").style.fill        = "white";
                        tile.getElementById("color").style.fill         = info.color;
                        tile.getElementById("color-G").style.fill       = info.color;
                        clickPad.onclick = (evt) => {
                            if (TileSelected) {return;}
                            TileSelected = true;
                            let overlay = tile.getElementById("overlay");
                            overlay.animate("enable");
                            setTimeout(() => {TileSelected = false;}, 450);
                            setTimeout(() => {
                                let title = info.name;
                                title = (title.length > 25) ? truncateString(title, 22) : title;
                                let names = info.instructor1;
                                names = (info.instructor2 !== undefined) ?
                                        `${names} & ${info.instructor2}`: names;
                                names = (names.length > 36) ? truncateString(names, 33) : names;

                                ClassDialog.Color.style.fill    = info.color;
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
        let subButtons = [SideMenu.SubButton1,
                          SideMenu.SubButton2,
                          SideMenu.SubButton3,
                          SideMenu.SubButton4,
                          SideMenu.SubButton5,
                          SideMenu.SubButton6,
                          SideMenu.SubButton7];
        let dates = [date, date1, date2, date3, date4, date5, date6];
        let i = dates.length, x = -1;
        while (i--) {
            x++;
            let dateObj = dates[x];
            subButtons[x].text = `${DAYS_SHORT[dateObj.getDay()]} ` +
                                 `${dateObj.getDate()} ` +
                                 `${MONTHS_SHORT[dateObj.getMonth()]}`;
            // wire up the button here.
            subButtons[x].onclick = () => {loadTimetableByDate(dateObj);}
        }
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
                    StatusBar.enableRefreshButton();
                    SideMenu.hide();
                }
                else {me.exit();}
            }
        }
        // data inbox
        inbox.onnewfile = onDataRecieved;
        // messaging
        messaging.peerSocket.onmessage  = onMessageRecieved;
        messaging.peerSocket.onopen     = () => {
            debugLog("App Socket Open"); StatusBar.hidePhone();}
        messaging.peerSocket.onclose    = () => {
            debugLog("App Socket Closed"); StatusBar.showPhone();}
        // status bar buttons.
        StatusBar.RefreshButton.onclick = () => {
            StatusBar.RefreshButtonAnim.animate("enable");
            reloadCurrentTimetable();
        }
        StatusBar.MenuButton.onclick    = () => {
            StatusBar.MenuButtonAnim.animate("enable");
            if (SideMenu.isVisible()) {
                StatusBar.enableRefreshButton();
                SideMenu.hide();
            } else {
                StatusBar.disableRefreshButton();
                SideMenu.show();
            }
        }
        // sync button.
        SideMenu.SyncButton.onclick = () => {
            SideMenu.hide();
            StatusBar.enableRefreshButton();
            reloadCurrentTimetable();
        }
        // message dialog button.
        MessageDialog.OkButton.onclick = MessageDialog.hide;
        // class dialog button.
        ClassDialog.CloseButton.onclick = () => {
            ClassDialog.hide();
        };

        // Update current date.
        let dateStr = options.currentDate;
        let currentDate = (dateStr == undefined) ? date : new Date(dateStr);
        StatusBar.setDate(currentDate);

        // // Display the loader non animated.
        LoadingScreen.Label.text = "Loading...";
        LoadingScreen.SubLabel.text = clubName.toUpperCase();
        show(LoadingScreen.Element);

        // Load current timetable after transition.
        setTimeout(() => {loadTimetableByDate(currentDate);}, 400);

        debugLog(`>>> :: initialize view! - ${this.name}`);
    };
    this.onUnMount = () => {
        // unlink the callbacks.
        clock.granularity               = "off";
        clock.ontick                    = undefined;
        messaging.peerSocket.onopen     = undefined;
        messaging.peerSocket.onclose    = undefined;
        messaging.peerSocket.onmessage  = undefined;
        inbox.onnewfile                 = undefined;
        LM_TIMETABLE.length             = 0;

        // clean up references here just in case.
        TimetableList   = undefined;
        LoadingScreen   = undefined;
        MessageDialog   = undefined;
        ClassDialog     = undefined;
        StatusBar       = undefined;
        SideMenu        = undefined;
        SyncText        = undefined;
        AppSettings     = undefined;

        debugLog(`>>> :: unmounted view! - ${this.name}`);
    };
}

// ----------------------------------------------------------------------------

// callback when a message is recieved.
function onMessageRecieved(evt) {
    display.poke();
    switch (evt.data.key) {
        case "lm-noClub":
            debugLog("Timetable :: no club selected.");
            LoadingScreen.hide();
            SideMenu.SubLabel.text    = "Club Not Set";
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
        StatusBar.hidePhone() : StatusBar.showPhone();
}


// send data to companion.
function sendValue(key, data=null) {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        if (data == null) {
            messaging.peerSocket.send({key: key});
        } else {
            messaging.peerSocket.send({key: key, value: data});
        }
        StatusBar.hidePhone();
    } else {
        StatusBar.showPhone();
    }
}

// ----------------------------------------------------------------------------

// clean up old local files.
function cleanUpFiles() {
    let dates = [date, date1, date2, date3, date4, date5, date6];
    let keepList = [];
    let i = dates.length;
    while (i--) {
        keepList.push(`${DATA_FILE_PREFIX}` +
                     `${dates[i].getDay()}` +
                     `${dates[i].getDate()}` +
                     `${dates[i].getMonth()}.cbor`);
    }
    if (keepList.indexOf(CurrentTimetableFile) < 0) {
        keepList.push(CurrentTimetableFile);
    }
    let dirIter;
    let listDir = listDirSync("/private/data");
    while ((dirIter = listDir.next()) && !dirIter.done) {
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
    let clubName = AppSettings.getValue("club") || "";
    LoadingScreen.Label.text = "Loading Timetable...";
    LoadingScreen.SubLabel.text = clubName.toUpperCase();
    LoadingScreen.show();

    hide(TimetableList);

    // load locally fetched data file locally eg. "LM_dat123.cbor"
    LM_TIMETABLE.length = 0;
    if (existsSync(`/private/data/${fileName}`)) {
        LM_TIMETABLE = readFileSync(fileName, "cbor");
        // add a blank item for the last tile.
        LM_TIMETABLE.push({});
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
                            `${DAYS_SHORT[lastModified.getDay()]} ` +
                            `${lastModified.getDate()}/` +
                            `${zeroPad(lastModified.getMonth())}`;

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
                    StatusBar.hidePhone() : StatusBar.showPhone();
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
            MessageDialog.show(false);
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
    StatusBar.setTime(new Date());
    StatusBar.setDate(date);
    ClassDialog.Label3.text = `${DAYS_SHORT[date.getDay()]} ` +
                              `${date.getDate()} ` +
                              `${MONTHS_SHORT[date.getMonth()]}`;
    StatusBar.enableRefreshButton();
    SideMenu.hide();
    CurrentTimetableFile = `${DATA_FILE_PREFIX}` +
                            `${date.getDay()}` +
                            `${date.getDate()}` +
                            `${date.getMonth()}.cbor`;
    loadTimetableFile(CurrentTimetableFile);
}

function reloadCurrentTimetable() {
    if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
        MessageDialog.Header.text = "Connection Lost";
        MessageDialog.Message.text =
            "Phone connection required for internet access.";
        MessageDialog.show(true);
        return;
    }
    OnFileRecievedUpdateGui = true;
    LoadingScreen.Label.text = "Requesting Data...";
    LoadingScreen.SubLabel.text = "www.lesmills.co.nz";
    LoadingScreen.show();
    sendValue("lm-fetch");
}
