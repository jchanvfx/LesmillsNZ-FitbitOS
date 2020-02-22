import document from "document";
import { me } from "appbit";
import { debugLog } from "../utils";

let views;

// screen initialize.
export function init(_views) {
  views = _views;
  console.log("view-tmpl init()");
  onMount();
}

// entry point when this view is mounted, setup elements and events.
function onMount() {
    // let btnStartWorkout = document.getElementById("btn-start");

    // btn.addEventListener("click", clickHandler);
    // document.addEventListener("keypress", keyHandler);
}

function clickHandler(_evt) {
    debugLog("Button Clicked!");
    // views.navigate("");
}

function keyHandler(evt) {
    if (evt.key === "back") {
        evt.preventDefault();
        // views.navigate("");
        me.exit();
    }
}