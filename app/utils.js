import { DEBUG_MODE } from "../common/config"

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