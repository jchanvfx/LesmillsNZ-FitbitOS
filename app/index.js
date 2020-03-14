import { init } from "./views";

/**
 * Definition for each view in the resources/views folder, and the associated
 * JavaScript module is lazily loaded alongside its view.
 */
const views = init(
    [
        ["home",      () => import("./views/home")],
        ["timetable", () => import("./views/timetable")],
        ["workouts",  () => import("./views/workouts")],
        ["exercise",  () => import("./views/exercise")],
        // ["template", () => import("./views/_base_tmpl")],
    ],
    "./resources/views/"
);

// Select the first view after 1 second
setTimeout(() => {
    views.navigate("home");
}, 800);
