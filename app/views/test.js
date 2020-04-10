// base template module for creating a screen
import document from "document";
import { me } from "appbit";
import { debugLog } from "../utils";
import {
    createLoadingScreenHelper,
    createMessageDialogHelper,
    createStatusBarHelper,
} from "../helpers"


let LoadingScreen;
let MessageDialog;
let StatusBar;
let Button;

// screen entry point.
let views;
let options;
export function init(_views, _options) {
    views   = _views;
    options = _options;

    LoadingScreen   = createLoadingScreenHelper(document.getElementById("loading-screen"));
    MessageDialog   = createMessageDialogHelper(document.getElementById("message-dialog"));
    StatusBar       = createStatusBarHelper(document.getElementById("status-bar"));
    Button          = document.getElementById("btn1");

    debugLog("view-tmpl :: initialize!");
    onMount();
    return onUnMount;
}

function onMount() {
    // LoadingScreen.show();
    Button.addEventListener("click", onButtonClicked);
    document.addEventListener("keypress", onKeyPressEvent);
}

// Clean-up function executed before the view is unloaded.
// No need to unsubscribe from DOM events, it's done automatically.
function onUnMount() {
    debugLog(">>> unMounted - view-tmpl");
}

function onButtonClicked(_evt) {
    debugLog("Button Clicked!");
    // views.navigate("");
}

function onKeyPressEvent(evt) {
    if (evt.key === "back") {
        evt.preventDefault();
        // views.navigate("");
        me.exit();
    }
}
