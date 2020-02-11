import clock from "clock";

export const DAYS = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday"
];
export const DAYS_SHORT = [
    "Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"
];
export const MONTHS = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"
];
export const MONTHS_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul",
    "Aug", "Sep", "Oct", "Nov", "Dec"
];

let clockCallback;

export const formatTo12hrTime = date => {
    let hours = date.getHours();
    let mins = zeroPad(date.getMinutes());
    let ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    return hours + ':' + mins + ampm;
}
export const getDateObj = () => {return new Date();};
export const getDate = () => {return getDateObj().getDate();};
export const getYear = () => {return getDateObj().getFullYear();};
export const getDayName = () => {return DAYS[getDateObj().getDay()];};
export const getDayShortName = () => {return DAYS_SHORT[getDateObj().getDay()];};
export const getMonthName = () => {return MONTHS[getDateObj().getMonth()];};
export const getMonthShortName = () => {return MONTHS_SHORT[getDateObj().getMonth()];};
export const getTime12hr = () => {return formatTo12hrTime(getDateObj());};
export const getTime24Hr = () => {
    let date = getDateObj();
    return zeroPad(date.getHours + ':' + zeroPad(date.getMinutes()));
};

clock.granularity = "minutes"; // seconds, minutes, hours

export function registerCallback(callbackFunc) {
  clockCallback = callbackFunc;
  clock.addEventListener("tick", tickHandler);
}

// ----------------------------------------------------------------------------

function zeroPad(i) {if (i < 10) {i = "0" + i;} return i;}
function tickHandler(evt) {
    let hours = evt.date.getHours();
    let mins = zeroPad(evt.date.getMinutes());
    let ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    let time12hr = hours + ':' + mins + ampm;
    clockCallback({time: time12hr});
}
