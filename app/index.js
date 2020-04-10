import { init } from "./views";

/**
 * Definition for each view in the resources/views folder, and the associated
 * JavaScript module is lazily loaded alongside its view.
 */
const views = init(
    [
        ["timetable", () => import("./views/timetable")],
        // ["test", () => import("./views/test")],
    ],
    "./resources/views/"
);

// Select the first view after 1 second
setTimeout(() => {
    views.navigate("timetable");
}, 1000);
