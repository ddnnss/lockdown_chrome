
if (res === undefined || res === null) {
    var res = {};
    let isSetButtonBlock = false;
    let isSetFullscreenBlock = false;
    /**
     * For those cases when the script was inject after loading this page
     */
    if (document.readyState === "complete") {
        addChromeRuntimeListener();
       
    }

    window.onload = function() {
         console.log('page loaded');
      };

    addAllListener();

    /**
     * Add all listener for current tab
     */
    function addAllListener() {
        window.onload = function () {
            addChromeRuntimeListener();
        };

        let isPressedControlLeft = false;
        let isPressedAltLeft = false;
        let isPressedShift = false;
        let isPressedCMD = false;
        window.onkeydown = function (e) {
            if (isSetButtonBlock) {

                if (e.code === "ControlLeft") {
                    isPressedControlLeft = true;
                }

                if (e.code === "AltLeft") {
                    isPressedAltLeft = true;
                }

                if (e.code === "ShiftLeft") {
                    isPressedShift = true;
                }

                if (e.code === "MetaLeft") {
                    isPressedCMD = true;
                }

                /**
                 *
                 * block F11 || ctr+shift+Tab and returned focus
                 */
                if (e.code === "F11" || ((isPressedControlLeft || isPressedAltLeft) && e.code === "Tab")) {
                    chrome.runtime.sendMessage({action: "focusPage"});
                    e.preventDefault();
                    return false;
                }

                /**
                 * if is_keyboard_shortcut_disabled = true
                 * block F12 || ctr+U || ctr+shift+i || alt+cmd+i
                 */
                // if (res.is_keyboard_shortcut_disabled && (e.code === "F12" ||
                //     (isPressedControlLeft && (e.code === "KeyU" || (isPressedShift && e.code === "KeyI"))) || (isPressedAltLeft && isPressedCMD && e.code === "KeyI"))) {
                //     e.preventDefault();
                //     return false;
                // }

                /**
                 * if is_printing_disabled = true
                 * block ctr+P
                 */
                if (res.is_printing_disabled && (isPressedControlLeft && e.code === "KeyP")){
                    e.preventDefault();
                    return false;
                }
            }
        };

        window.onkeyup = function (e) {
            if (isSetButtonBlock) {
                if (e.code === "ControlLeft") {
                    isPressedControlLeft = false;
                }

                if (e.code === "AltLeft") {
                    isPressedAltLeft = false;
                }

                if (e.code === "ShiftLeft") {
                    isPressedShift = false;
                }

                if (e.code === "MetaLeft") {
                    isPressedCMD = false;
                }

            }
        };


        /**
         * If the loss of focus sets it again
         * @param e native event
         */
        window.onblur = function (e) {
            if (isSetFullscreenBlock) {
                chrome.runtime.sendMessage({action: "focusPage"});
            }
        };

        /** for full screen exit event */
        window.onresize = function (e) {
            if (isSetFullscreenBlock) {
                console.log("Attempt to exit the full screen mode: " + new Date());
                chrome.runtime.sendMessage({openFull: true});
            }
        };


        document.onclick = function (e) {
        };

        /**
         *  Disabled right click if set full screen and is_right_click_disabled equals true
         * @param e Native event
         * @returns {boolean} if set full screen and is_right_click_disabled equals true returned false for disabled right click
         */
        window.oncontextmenu = function (e) {
            if (isSetButtonBlock && (res.is_right_click_disabled || res.is_printing_disabled)) {
                e.preventDefault();
                return false;
            }
        };

        window.addEventListener("unhandledrejection", function(event) {
            // console.log(event);
            event.preventDefault();
        });

        /**
         * if is_copy_paste_disabled = true
         * block paste event
         */
        document.addEventListener('paste', (e) => {
            if (isSetButtonBlock && res.is_copy_paste_disabled) {
                e.preventDefault();
                e.stopPropagation();
            }
        });

        /**
         * if is_copy_paste_disabled = true
         * block copy event
         */
        document.addEventListener('copy', (e) => {
            if (isSetButtonBlock && res.is_copy_paste_disabled) {
                e.preventDefault();
                e.stopPropagation();
                e.clipboardData.setData('text/plain', "");
            }
        });

        /**
         * if is_copy_paste_disabled = true
         * block event drop in page
         */
        document.addEventListener('drop', (e) => {
            if (isSetButtonBlock && res.is_copy_paste_disabled) {
                e.preventDefault();
                e.stopPropagation();
            }
        });

        /**
         * if is_copy_paste_disabled = true
         * block event drop from page
         */
        document.addEventListener('dragstart', (e) => {
            if (isSetButtonBlock && res.is_copy_paste_disabled) {
                e.preventDefault();
                e.stopPropagation();
            }
        });

    }

    /**
     * Adds Chrome message listener for current page
     */
    function addChromeRuntimeListener() {
        /**
         * Chrome message listener, get message of background scripts
         */
        chrome.runtime.onMessage.addListener(
            function (request, sender, sendResponse) {
                console.log(request);
                if (request.setBlock !== undefined) {
                    chrome.storage.sync.get(['json_config'], function (result) {
                        // console.log(result.json_config);
                        res = result.json_config;
                        if (request.setBlock && !window.location.href.indexOf(res.target_url) && !isSetButtonBlock) {
                            if (res.is_close_open_tabs_windows) {
                                showModalWindow(true);
                            } else {
                                setTimeout(function () {
                                    chrome.runtime.sendMessage({action: "fullScreenEnd"});
                                    clearClipboard();
                                }, res.session_max_duration);
                            }
                        }
                        if (request.setBlock) {
                            if (res.is_close_open_tabs_windows) {
                                setTimeout(function () {
                                    isSetFullscreenBlock = true;
                                }, res.close_open_tabs_warning_duration);
                            } else {
                                isSetFullscreenBlock = true;
                            }
                            isSetButtonBlock = true;
                        } else {
                            isSetFullscreenBlock = false;
                            isSetButtonBlock = false;
                        }

                    });
                    clearClipboard();
                }
            });
    }

   function clearClipboard() {
       let prom = navigator.clipboard.writeText('');

   }


   function addFon() {
       let fon = document.createElement('div');
       fon.setAttribute('class', "ext-modal-window-fon");
       fon.setAttribute('id', "ext-window-fon-id");
       fon.style.display = "none";
       document.body.appendChild(fon);
       return fon;
   }

   function addWindow() {
       let modalWindow = document.createElement('div');
       modalWindow.setAttribute('class', "ext-modal-window");
       modalWindow.setAttribute('id', "ext-modal-window-id");
       modalWindow.style.display = "none";
       modalWindow.innerHTML = "<div class='ext-modal-window-grid'>" +
           "<p class='ext-modal-window-text' >Close all tabs?</p>" +
           "<p class='ext-modal-display-time' id='display-time-id'>Auto closing through " + (res.close_open_tabs_warning_duration / 1000) + " seconds</p>" +
           "<div class='ext-modal-window-btn-ok'>OK</div></div>";
       modalWindow.getElementsByClassName("ext-modal-window-btn-ok")[0].addEventListener('click',clickOk);
       document.body.appendChild(modalWindow);
       return modalWindow;
   }

   function showModalWindow(show) {
        let fon = document.getElementById("ext-window-fon-id");
        if (fon === undefined || fon == null){
            fon = addFon();
        }
       fon.style.display = show? "block" : "none";
       let modalWindow = document.getElementById("ext-modal-window-id");
       if (modalWindow === undefined || modalWindow == null){
           modalWindow = addWindow();
       }
       modalWindow.style.display = show? "block" : "none";
       if (show){
         let timeText = document.getElementById("display-time-id");
         let time = (res.close_open_tabs_warning_duration / 1000);
           timeText.innerText = "Auto closing through " + time + " seconds";
           let tamerCloseTabs = setInterval(function () {
               time--;
               timeText.innerText = "Auto closing through " + time + " seconds";
               if (time <= 0){
                   clearInterval(tamerCloseTabs);
                   clickOk();
                   setTimeout(function () {
                       chrome.runtime.sendMessage({action: "fullScreenEnd"});
                       clearClipboard();
                   }, res.session_max_duration);
               }
           },1000)
       }
   }

   function clickOk() {
       // chrome.runtime.sendMessage({action: "closeAllTabs"});
       showModalWindow(false);

   }
}
