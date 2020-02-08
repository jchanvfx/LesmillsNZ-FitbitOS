import document from "document";
import * as dateTime from "../datelib"

const LM_FILENAME = "LM_TIMETABLE.cbor";
const TIMETABLE_DATA = [];

let TimetableList;
let views;

export function init(_views) {
    views = _views;
    console.log("view-1 init()");
    onMount();
}

/**
 * When this view is mounted, setup elements and events.
 */
function onMount() {
    // initTimetableWidget();
    let btn = document.getElementById("v1-button");
    btn.addEventListener("click", clickHandler);
}

/**
 * Sample button click with navigation.
 */
function clickHandler(_evt) {
    console.log("view-1 Button Clicked!");
    /* Navigate to another screen */
    views.navigate("view-2");
}

//-----------------------------------------------------------------------------

// function initTimetableWidget() {
//     TimetableList = document.getElementById("lm-class-list");
//     TimetableList.delegate = {
//         getTileInfo: index => {
//             if (TIMETABLE_DATA.length > 0) {
//                 let tileInfo = TIMETABLE_DATA[index];
//                 return {
//                     index: index,
//                     type: "lm-pool",
//                     name: tileInfo.name,
//                     instructor: tileInfo.instructor,
//                     date: tileInfo.date,
//                     desc: tileInfo.desc,
//                     color: (tileInfo.color !== null) ? tileInfo.color : "#545454",
//                     finished: tileInfo.finished,
//                 };
//             } else {
//                 // need this here or we'll get a "Error 22 Critical glue error"
//                 return {
//                     index: index,
//                     type: "lm-pool",
//                     name: "{no data}",
//                     instructor: "",
//                     date: "",
//                     desc: "",
//                     color: "",
//                     finished: "y",
//                 };
//             }
//         },
//         configureTile: (tile, info) => {
//             if (info.type == "lm-pool") {
//                 let itmDate = new Date(info.date);
//                 tile.getElementById("text-title").text = info.name.toUpperCase();
//                 tile.getElementById("text-subtitle").text = info.instructor;
//                 tile.getElementById("text-L").text = dateTime.formatTo12hrTime(itmDate);
//                 tile.getElementById("text-R").text = info.desc;
//                 if (info.finished == "y") {
//                     tile.getElementById("text-title").style.fill = "#6e6e6e";
//                     tile.getElementById("text-subtitle").style.fill = "#4f4f4f";
//                     tile.getElementById("text-L").style.fill = "#6e6e6e";
//                     tile.getElementById("text-R").style.fill = "#6e6e6e";
//                     tile.getElementById("color").style.fill = "#4f4f4f";
//                 } else {
//                     tile.getElementById("text-title").style.fill = "white";
//                     tile.getElementById("text-subtitle").style.fill = "white";
//                     tile.getElementById("text-L").style.fill = "white";
//                     tile.getElementById("text-R").style.fill = "white";
//                     tile.getElementById("color").style.fill = info.color;
//                 }
//             }
//         }
//     }
//     // TimetableList.length must be set AFTER TimetableList.delegate
//     TimetableList.length = 10;
// }
