import clock from "clock";
import document from "document";
import * as messaging from "messaging";
import { me } from "appbit";
import { DAYS_SHORT, MONTHS, formatTo12hrTime } from "../datelib"
import { debugLog } from "../utils"

let StatusBar;
let StatusBtnMenu;
let StatusBarPhone;
let MenuScreen;
let MenuBtnTimetable;

const date = new Date();

// screen initialize.
let views;
export function init(_views) {
  views = _views;
  debugLog("classes init()");
  onMount();
}

// entry point when this view is mounted, setup elements and events.
function onMount() {
    StatusBar = document.getElementById("status-bar");
    StatusBtnMenu = StatusBar.getElementById("click-l");
    StatusBarPhone = StatusBar.getElementById("no-phone");
    displayElement(StatusBar.getElementById("click-r"), false);
    displayElement(StatusBar.getElementById("jump-to"), false);
    displayElement(
        StatusBarPhone,
        messaging.peerSocket.readyState === messaging.peerSocket.CLOSED
        );
    StatusBar.getElementById("date1").text = `${DAYS_SHORT[date.getDay()]} (Today)`;
    StatusBar.getElementById("date2").text = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    StatusBar.getElementById("time").text = formatTo12hrTime(date);

    MenuScreen = document.getElementById("menu-screen");
    MenuBtnTimetable = MenuScreen.getElementById("main-btn1");
    MenuBtnTimetable.text = "Timetable";
    MenuScreen.getElementById("main-label").text = "Timetable Schedule";
    displayElement(MenuScreen.getElementById("sub-itm-label"), false);
    displayElement(MenuScreen.getElementById("sub-itm1"), false);
    displayElement(MenuScreen.getElementById("sub-itm2"), false);
    displayElement(MenuScreen.getElementById("sub-itm3"), false);


    // initialize here.


    // connect up add the events.
    // ----------------------------------------------------------------------------

    // register time callback.
    clock.granularity = "minutes";
    clock.addEventListener("tick", tickHandler);
    // message socket opens.
    messaging.peerSocket.onopen = () => {
        debugLog("App Socket Open");
        displayElement(StatusBarPhone, false);
    };
    // message socket closes
    messaging.peerSocket.onclose = () => {
        debugLog("App Socket Closed");
        displayElement(StatusBarPhone, true);
    };
    // button events.
    document.addEventListener("keypress", evt => {
        if (evt.key === "back") {
            evt.preventDefault();
            if (MenuScreen.style.display === "inline") {
                MenuScreen.animate("disable");
                setTimeout(() => {MenuScreen.style.display = "none";}, 300);
            } else {
                me.exit();
            }
        }
    });
    StatusBtnMenu.addEventListener("click", () => {
        if (MenuScreen.style.display === "none") {
            MenuScreen.style.display = "inline";
            MenuScreen.animate("enable");
        } else {
            MenuScreen.animate("disable");
            setTimeout(() => {MenuScreen.style.display = "none";}, 300);
        }
    });
    MenuBtnTimetable.addEventListener("activate", onMenuBtnTimetableClicked);
}

// clock update.
function tickHandler(evt) {
    StatusBar.getElementById("time").text = formatTo12hrTime(evt.date);
}

// Buttons
// ----------------------------------------------------------------------------

// Menu Screen.
function onMenuBtnTimetableClicked () {
    clock.removeEventListener("tick", tickHandler);
    MenuScreen.style.display = "none";
    views.navigate("timetable");
}

// Gui
// ----------------------------------------------------------------------------

// toggle element visibility.
function displayElement(element, display=true) {
    element.style.display = display ? "inline" : "none";
}