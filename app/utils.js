import document from "document";
import {DEBUG_MODE, VIEW_GUI_PATH} from "../common/config"

export function AppController() {
    this._views;
    this._current;
    this.init = (views) => {
        this._views = views;
        for (let key in this._views) {
            if (this._views.hasOwnProperty(key)) {
                this._views[key].name = key;
                this._views[key].navigate = this.navigate;
            }
        }
    };
    this.navigate = (name, kwargs) => {
        if (this._current !== undefined) {this._current.onUnMount();}
        document.location.replace(`${VIEW_GUI_PATH}/${name}.view`)
            .then(() => {
                this._current = this._views[name];
                this._current.onMount(kwargs);
            })
            .catch((error) => {
                console.log(`\n\nNavigation Error: ${error}\n`);
            });
    };
}

// ----------------------------------------------------------------------------

export function debugLog(value) {if (DEBUG_MODE) {console.log(value);}}
export function zeroPad(i) {if (i < 10) {i = "0" + i;} return i;}
export function truncateString(text, maxLength, prefix="...") {
    if (text.length > maxLength) {
        return text.substr(0, maxLength) + prefix;
    }
    return text;
}
export function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}