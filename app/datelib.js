export const date = new Date();
export const date1 = new Date();
export const date2 = new Date();
date1.setDate(date1.getDate() + 1);
date2.setDate(date2.getDate() + 2);

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
export const formatTo12hrTime = date => {
    let hours = date.getHours();
    let mins = date.getMinutes();
    mins = (mins < 10) ? "0" + mins : mins;
    let ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    return hours + ':' + mins + ampm;
}