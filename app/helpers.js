import { readFileSync, writeFileSync, existsSync } from "fs";
import {
    DAYS_SHORT, MONTHS_SHORT, formatTo12hrTime
} from "../common/datelib"


// visibility functions.
export function show(element) {element.style.display = "inline"}
export function hide(element) {element.style.display = "none"}
export function isVisible(element) {
    return element.style.display === "inline";
}

// helper objects.
export function statusBarController(element) {
    let clickR_color = element.getElementById("click-r-bg").style.fill;
    return {
        Element           : element,
        DateLabel         : element.getElementById("date"),
        TimeLabel         : element.getElementById("time"),
        MenuButton        : element.getElementById("click-l"),
        MenuButtonAnim    : element.getElementById("click-l-anim"),
        RefreshButton     : element.getElementById("click-r"),
        RefreshButtonAnim : element.getElementById("click-r-anim"),
        showPhone() {
            show(element.getElementById("no-phone-icon"));
            show(element.getElementById("no-phone-bg"));
        },
        hidePhone() {
            hide(element.getElementById("no-phone-icon"));
            hide(element.getElementById("no-phone-bg"));
        },
        enableRefreshButton() {
            element.getElementById("refresh-btn").style.opacity = 1;
            element.getElementById("click-r-bg").style.opacity = 1;
            show(element.getElementById("click-r"));
        },
        disableRefreshButton() {
            element.getElementById("refresh-btn").style.opacity = 0.4;
            element.getElementById("click-r-bg").style.opacity = 0.4;
            hide(element.getElementById("click-r"));
        },
        setDate(dateObj) {
            this.DateLabel.text = `${DAYS_SHORT[dateObj.getDay()]} ` +
                                  `(${dateObj.getDate()} ` +
                                  `${MONTHS_SHORT[dateObj.getMonth()]})`;
            this.TimeLabel.text  = formatTo12hrTime(dateObj);
        },
        setTime(dateObj) {
            this.TimeLabel.text  = formatTo12hrTime(dateObj);
        }
    };
}

export function sideMenuController(element) {
    // custom button controller for rounded button.
    function Button(element, clickedColor="fb-aqua") {
        let ids = ["bg", "tl", "tr", "bl", "br"];
        let color = element.getElementById("bg").style.fill;
        element.getElementById('click').onmousedown = () => {
            for (let i = 0; i < ids.length; i++) {
                element.getElementById(ids[i]).style.fill = clickedColor;
            }
            element.getElementById("text").style.fill = "black";
        };
        element.getElementById('click').onmouseup = () => {
            for (let i = 0; i < ids.length; i++) {
                element.getElementById(ids[i]).style.fill = color;
            }
            element.getElementById("text").style.fill = "white";
        };
        Object.defineProperty(this, "onclick", {
            get: function get() {
                element.getElementById('click').onclick;
            },
            set: function set(value) {
                element.getElementById('click').onclick = value;
            }
        });
        Object.defineProperty(this, "text", {
            get: function get() {
                element.getElementById('text').text;
            },
            set: function set(value) {
                element.getElementById('text').text = value;
            }
        });
    };
    return {
        Element         : element,
        SubLabel        : element.getElementById("timetable-label"),
        SubButton1      : new Button(element.getElementById("timetable-btn1")),
        SubButton2      : new Button(element.getElementById("timetable-btn2")),
        SubButton3      : new Button(element.getElementById("timetable-btn3")),
        SubButton4      : new Button(element.getElementById("timetable-btn4")),
        SubButton5      : new Button(element.getElementById("timetable-btn5")),
        SubButton6      : new Button(element.getElementById("timetable-btn6")),
        SubButton7      : new Button(element.getElementById("timetable-btn7")),
        SyncButton      : new Button(element.getElementById("sync-btn")),
        Footer          : element.getElementById("footer-label"),
        isVisible() {return isVisible(element);},
        show() {
            element.style.display = "inline";
            element.animate("enable");
        },
        hide() {
            element.animate("disable");
            setTimeout(() => {element.style.display = "none";}, 300);
        },
    };
}

export function messageDialogController(element) {
    return {
        Element     : element,
        Header      : element.getElementById("header"),
        Message     : element.getElementById("text"),
        OkButton    : element.getElementById("btn-ok"),
        isVisible() {return isVisible(element);},
        show(showButton=false) {
            element.style.display = "inline";
            (showButton) ? show(this.OkButton) : hide(this.OkButton);
        },
        hide() {element.style.display = "none";},
    };
}

export function classDialogController(element) {
    // close button controller.
    function CloseButton(buttonElmement) {
        let bg = element.getElementById("btn-close-bg");
        let color = element.getElementById("btn-close-bg").style.fill;
        buttonElmement.onmousedown = () => {bg.style.fill = "#ff9c8a";};
        buttonElmement.onmouseup = () => {bg.style.fill = color;};
        Object.defineProperty(this, "onclick", {
            get: function get() {buttonElmement.onclick;},
            set: function set(value) {buttonElmement.onclick = value;}
        });
    };
    return {
        Element     : element,
        Title       : element.getElementById("title"),
        Name        : element.getElementById("name"),
        Color       : element.getElementById("color"),
        Label1      : element.getElementById("label1"),
        Label2      : element.getElementById("label2"),
        Label3      : element.getElementById("label3"),
        Label4      : element.getElementById("label4"),
        CloseButton : new CloseButton(element.getElementById("btn-close")),
        isVisible() {return isVisible(element);},
        show() {
            element.animate("enable");
            element.style.display = "inline";
        },
        hide() {
            element.animate("disable");
            setTimeout(() => {element.style.display = "none";}, 300);
        },
    };
}


export function loadingScreenController(element) {
    return {
        Element  : element,
        Label    : element.getElementById("text"),
        SubLabel : element.getElementById("sub-text"),
        isVisible() {return isVisible(element);},
        show() {
            element.animate("enable");
            element.style.display = "inline";
        },
        hide() {
            this.Label.text     = "";
            this.SubLabel.text  = "";
            element.animate("disable");
            element.style.display = "none";
        },
    };
}

export function settingsController(settingsFile) {
    return {
        setValue(key, value) {
            let data = this.load();
            data[key] = value;
            this.save(data);
        },
        getValue(key) {
            let data = this.load();
            return data[key];
        },
        save(data) {
            writeFileSync(settingsFile, data, "cbor");
        },
        load() {
            if (existsSync(`/private/data/${settingsFile}`)) {
                return readFileSync(settingsFile, "cbor");
            }
            return {};
        }
    };
}