import { readFileSync, writeFileSync, existsSync } from "fs";
import { DAYS_SHORT, MONTHS, formatTo12hrTime, date } from "./datelib"

// visibility functions.
export function show(element) {element.style.display = "inline"}
export function hide(element) {element.style.display = "none"}
export function isVisible(element) {return element.style.display === "inline";}

// helper objects.
export function createStatusBarHelper(element) {
    return {
        Element         : element,
        DateLabel1      : element.getElementById("date1"),
        DateLabel2      : element.getElementById("date2"),
        TimeLabel       : element.getElementById("time"),
        MenuButton      : element.getElementById("click-l"),
        JumpToButton    : element.getElementById("click-r"),
        JumpToIcon      : element.getElementById("jump-to"),
        PhoneIcon       : element.getElementById("no-phone"),
        setDate(dateObj) {
            let day = (date.getDay() === dateObj.getDay()) ? " (Today)" : "";
            this.DateLabel1.text = `${DAYS_SHORT[dateObj.getDay()]}${day}`;
            this.DateLabel2.text = `${dateObj.getDate()} ${MONTHS[dateObj.getMonth()]}`;
            this.TimeLabel.text  = formatTo12hrTime(dateObj);
        },
        setTime(dateObj) {
            this.TimeLabel.text  = formatTo12hrTime(dateObj);
        }
    };
}

export function createSideMenuHelper(element) {
    return {
        Element         : element,
        MainLabel       : element.getElementById("main-label"),
        MainButton      : element.getElementById("main-btn1"),
        SubLabel        : element.getElementById("sub-label"),
        SubButton1      : element.getElementById("sub-btn1"),
        SubButton2      : element.getElementById("sub-btn2"),
        SubButton3      : element.getElementById("sub-btn3"),
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

export function createQuestionDialogHelper(element) {
    return {
        Element     : element,
        HeaderSmall : element.getElementById('header-small'),
        Header      : element.getElementById('mixedtext'),
        Message     : element.getElementById('mixedtext').getElementById("copy"),
        YesButton   : element.getElementById("btn-right"),
        NoButton    : element.getElementById("btn-left"),
        isVisible() {return isVisible(element);},
        show() {element.style.display = "inline";},
        hide() {element.style.display = "none";},
        setHeader (text) {
            if (text.length > 12) {
                this.Header.text = "";
                this.HeaderSmall.text = text;
                this.HeaderSmall.style.display = "inline";
            } else {
                this.Header.text = text;
                this.HeaderSmall.text = "";
                this.HeaderSmall.style.display = "none";
            }
        },
        getHeader() {
            if (this.HeaderSmall.style.display === "inline") {
                return this.HeaderSmall.text;
            }
            return this.Header.text;
        },
    };
}

export function createMessageDialogHelper(element) {
    return {
        Element     : element,
        Header      : element.getElementById("#mixedtext"),
        Message     : element.getElementById("#mixedtext").getElementById("copy"),
        isVisible() {return isVisible(element);},
        show() {element.style.display = "inline";},
        hide() {element.style.display = "none";},
    };
}


export function createLoadingScreenHelper(element) {
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

export function createSettingsHelper(settingsFile) {
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