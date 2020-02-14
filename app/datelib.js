// export const DAYS = [
//     "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
//     "Friday", "Saturday"
// ];
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
// export const getDateObj = () => {return new Date();};
// export const getDate = () => {return getDateObj().getDate();};
// export const getYear = () => {return getDateObj().getFullYear();};
// export const getDayName = () => {return DAYS[getDateObj().getDay()];};
// export const getDayShortName = () => {return DAYS_SHORT[getDateObj().getDay()];};
// export const getMonthName = () => {return MONTHS[getDateObj().getMonth()];};
// export const getMonthShortName = () => {return MONTHS_SHORT[getDateObj().getMonth()];};
// export const getTime12hr = () => {return formatTo12hrTime(getDateObj());};
// export const getTime24Hr = () => {
//     let date = getDateObj();
//     return zeroPad(date.getHours + ':' + zeroPad(date.getMinutes()));
// };
// function zeroPad(i) {if (i < 10) {i = "0" + i;} return i;}
