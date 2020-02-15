import { init } from "./views";

/**
 * Definition for each view in the resources/views folder, and the associated
 * JavaScript module is lazily loaded alongside its view.
 */
const views = init(
    [
        ["timetable", () => import("./views/timetable")],
        ["view-2", () => import("./views/view-2")],
        ["view-3", () => import("./views/view-3")]
    ],
    "./resources/views/"
);

// Select the first view (view-1) after 1 second
setTimeout(() => {
    views.navigate("timetable");
}, 1000);
