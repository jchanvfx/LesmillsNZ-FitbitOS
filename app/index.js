import { init } from "./views";

/**
 * Definition for each view in the resources/views folder, and the associated
 * JavaScript module is lazily loaded alongside its view.
 */
const views = init(
    [
        ["timetable", () => import("./views/timetable")],
        ["classes", () => import("./views/classes")],
        ["exercise", () => import("./views/exercise")],
        // ["base-template", () => import("./views/_base_tmpl")],
    ],
    "./resources/views/"
);

// Select the first view after 1 second
setTimeout(() => {
    views.navigate("exercise");
}, 1000);
