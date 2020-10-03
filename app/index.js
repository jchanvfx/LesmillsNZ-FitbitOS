import { AppController } from "./utils";
import { TimetableViewCtrl } from "./views/timetable"


const controller = new AppController();
controller.init({
    "timetable" : new TimetableViewCtrl(),
});

// Select the first view after 1 second
setTimeout(() => {
    controller.navigate("timetable");
}, 1000);
