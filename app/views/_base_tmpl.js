import document from "document";
import { me } from "appbit";

let views;

// screen initialize.
export function init(_views) {
  views = _views;
  console.log("view-2 init()");
  onMount();
}

// entry point when this view is mounted, setup elements and events.
function onMount() {
    let btn = document.getElementById("btn1");

    btn.addEventListener("click", clickHandler);
    document.addEventListener("keypress", keyHandler);
}

function clickHandler(_evt) {
    console.log("view-2 Button Clicked!");
    // views.navigate("");
}

function keyHandler(evt) {
    if (evt.key === "back") {
        evt.preventDefault();
        // views.navigate("");
        me.exit();
    }
}
