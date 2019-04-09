const extensionId = chrome.i18n.getMessage("@@extension_id");
let key = null;
let session = 0;
let sessionUuid = 0;
const browser = "chrome";
const launchUrl = 'launch.html';
let targetUpdateApiUrl = null;
// const url = "http://prestaging.verificient.com:8102/screencasts/session/" + session + "/extension/chrome/config/";
// const url = "http://prestaging.verificient.com:8102/screencasts/session/" + session +"/"+ browser + "/"+ extensionId + "/extension/config/";
const authInfoUrl = 'https://app.verificient.com:54545/proxy_server/app/extension/param/';
let url = targetUpdateApiUrl + "/screencasts/session/" + session + "/chrome/ld/extension/config/";

let sendUrl = targetUpdateApiUrl + "/screencasts/session/" + session + "/extension/ld/store/activity/";
const bearer = 'Bearer '+ key;
/**
 * Tab id for current tab set fullscreen
 * @type {null || int}
 */
var tabId = null;
/**
 * Window id for set fullscreen
 * @global
 * @type {null || int}
 */
var tabWindowId = null;
/**
 * target url getting of the API
 * @global
 * @type {null || int}
 */
var targetUrl = null;
/**
 * data received from the response of the API
 * @global
 * @type {{}}
 */
var responseAPI = {};
/**
 * Indicates whether fullscreen has already been applied
 * @type {boolean}
 */
let isUsingSetFullScreen = false;
/**
 * Id extension that are enabled
 * @global
 * @type {array}
 */
let idExtensionEnabled = [];
/**
 * Is extension logging is started
 * @global
 * @type {boolean}
 */
let activityLogging = false;
/**
 * Is collecting tabs is started
 * @global
 * @type {boolean}
 */
let allowCollectTabs = false;
/**
 * Collected extensions info
 * @global
 * @type {{}}
 */
let totalExtensionInfo = {};
/**
 * Collected tabs info
 * @global
 * @type {{}}
 */
let allTabs = {};

let allTabs4Sent = {};
/**
 * Last open tab ID
 * @global
 * @type {int}
 */
let lastOpenedTabId = null;
/**
 * Time when tab ID is open
 * @global
 * @type {int}
 */
let timeOnTabStart = null;
/**
 * Time when tab ID is focus changed
 * @global
 * @type {int}
 */
let timeOnTabStop = null;

/**
 * Is extension allow use in incognito mode
 * @global
 * @type {boolean}
 */
let isIncognitoAccess = false;

// chrome.tabs.query({url: targetUpdateApiUrl}, function (tabs) {if (tabs.length > 0) {updateInfo(true);} else {searchTab(true,false);}});





chrome.tabs.query({}, function (tabs) {
    for (let i in tabs) {
        //looking for 'launch.html' in tab url
        if (tabs[i].url.indexOf(launchUrl) > 0) {
            console.log(tabs[i]);
            chrome.tabs.executeScript(tabs[i].id, {file: "authinfo.js"});
        }
    }
})




console.log('key1', key);

/**
 * Check if extension allow use in incognito mode
 */
 chrome.extension.isAllowedIncognitoAccess(function(result){
    isIncognitoAccess = result

    console.log('isIncognitoAccess =' ,isIncognitoAccess)
});


/**
 * Collect all open tabs.
 */
function getAllTabs() {
    allowCollectTabs = true;
    chrome.tabs.query({}, function(tabs) {
        for(let i in tabs){
           allTabs[tabs[i].id] = tabs[i] ;
           if (tabs[i].active){lastOpenedTabId = tabs[i].id}
           timeOnTabStart = Date.now();
           Object.assign(allTabs[tabs[i].id], {opened: Date.now(), ontab:0, isSent:false});
        }
        // console.log('allTabs = ',allTabs)
    } )

}

/**
 * Send all collected info (extension and tabs)
 * @param activityType{string}
 * @param activitySource {{}}
 */
function sendInfo(activityType, activitySource){
    fetch(sendUrl , {
        method: 'POST',
        withCredentials: true,
        credentials: 'include',
        body: JSON.stringify({activity_type : activityType, activity : activitySource}),
        headers: {
            'Authorization': bearer,
            'Content-Type': 'application/json'}
    }).then(response => {
          console.log(response);

    },error => {
        console.log(error);
    });
}

/**
 * Collect info about all extension and check tabs that were not sent
 */
function startToLogActivity() {
    activityLogging = true;
    chrome.management.getAll(function (extensionInfo){
        for (let i in extensionInfo){
            totalExtensionInfo[i] = Object.assign(extensionInfo[i])
        }
        console.log('totalExtensionInfo = ',totalExtensionInfo);
        sendInfo('extension_details',totalExtensionInfo);
        for (let i in allTabs){
            if (!allTabs[i].isSent){
                allTabs[i].opened = (Date.now() - allTabs[i].opened) / 1000;
                allTabs[i].isSent = true;
                if (allTabs[i].id === lastOpenedTabId){
                    timeOnTabStop = Date.now();
                    allTabs[i].ontab = (timeOnTabStop - timeOnTabStart) / 1000;
                }
                allTabs4Sent[i] = allTabs[i];
            }
        }
        if (Object.keys(allTabs4Sent).length > 0){
            sendInfo('tab_details',allTabs4Sent);
            allTabs4Sent = {};
        }
    });

}

/**
 * Start collect info about all extension
 */
function startToLogActivityTimer(){
    console.log('activity_upload_duration = ', responseAPI.activity_upload_duration);
    setInterval(function () {
          startToLogActivity();
    }, responseAPI.activity_upload_duration)
}

/**
 * If enabled = false that get all installed extensions and save id for all running ones and turn them disabled
 * if enabled = true enable all extensions that were turned off
 * @see idExtensionEnabled
 * @param enabled {boolean}
 */
function setEnabledExtension(enabled) {
    if (responseAPI.is_other_extensions_disabled) {
        if (!enabled) {
            chrome.management.getAll(function (extensionInfo) {
                console.log(extensionInfo);
                idExtensionEnabled = [];
                for (let i in extensionInfo) {
                    if (extensionInfo[i].enabled && extensionInfo[i].name !== "Lockdown") {
                        idExtensionEnabled.push(extensionInfo[i].id);
                        chrome.management.setEnabled(extensionInfo[i].id, false);
                    }
                }
            });
        } else {
            console.log(idExtensionEnabled);
            for (let i in idExtensionEnabled) {
                chrome.management.setEnabled(idExtensionEnabled[i], true);
            }
        }
    }
}

function updateInfo(isInjectScript = false){
    fetch(url, {
        method: 'GET',
        withCredentials: true,
        credentials: 'include',
        headers: {
            'Authorization': bearer,
            'Content-Type': 'application/json'}
    }).then(response => {
        // console.log(response);
        let promise =  response.json();
        promise.then(data => {
            // Work with JSON data here
            responseAPI = data.extension_config;
            // responseAPI.target_url = 'https://www.google.com';
            responseAPI.session_max_duration = responseAPI.session_max_duration * 1000;
            responseAPI.close_open_tabs_warning_duration = responseAPI.close_open_tabs_warning_duration * 1000;
            responseAPI.activity_upload_duration = responseAPI.activity_upload_duration * 1000;
            targetUrl = responseAPI.target_url;
            chrome.storage.sync.set({json_config: data.extension_config}, function () {
                // console.log('Value is set to ');
            });
            searchTab(isInjectScript);
            if (!activityLogging){
               getAllTabs();
               startToLogActivity();
               startToLogActivityTimer();

            }
        },error => {
            console.log(error);
        })
    },error => {
        console.log(error);
    });

}

/**
 * Searches tabs with URL targetUrl in all window, if isIncognitoAccess = false close tab with targetUrl
 * @see targetUrl
 * @see isIncognitoAccess
 * @param isInjectScript {boolean} default value "false"
 * @param isSetBlock is set block for tabs if searched target url
 */
function searchTab(isInjectScript = false, isSetBlock = true) {
    if (targetUrl != null) {
         chrome.tabs.query({url: targetUrl}, function (tabs) {

            if (tabs.length > 0 && isIncognitoAccess) {
                tabId = tabs[0].id;
                tabWindowId = tabs[0].windowId;
                if (isInjectScript) {
                    injectScript();
                }
                if (isSetBlock) {
                    setFocusedAndSelect();
                    blockKeyForOpenTabs();

                    if (responseAPI.is_close_open_tabs_windows) {
                        setTimeout(function () {
                            setFocusedAndSelect();
                            setFullScreen();
                            closeAllTabs();
                        }, responseAPI.close_open_tabs_warning_duration)
                    } else {
                        setFullScreen();
                    }
                }

            }else{
                if (tabs.length > 0 && tabs[0].url === targetUrl){
                   chrome.tabs.remove(tabs[0].id, function (){})
                }


             // chrome.tabs.update(lastOpenedTabId, {url: 'https://www.disney.com/'});
            }
        });

    }
}

/**
 * block key For all open tabs
 * @param isSetBlock {boolean} is set block or unblock, default value true
 */
function blockKeyForOpenTabs(isSetBlock = true) {

    setEnabledExtension(!isSetBlock);

    chrome.windows.getAll({populate:true}, getAllOpenWindows);

    function getAllOpenWindows(winData) {
        for (let i in winData) {
            for (let j in winData[i].tabs) {
               if (winData[i].tabs[j].status === "complete" && winData[i].tabs[j].url.indexOf("chrome:") !== 0){
                   chrome.tabs.sendMessage(winData[i].tabs[j].id, {setBlock: isSetBlock});
               }
            }
        }
    }
}


/**
 * Set full screen for tav with tabWindowId
 * @param isSetFullScreen {boolean} default value  "true", if false then set maximized
 * @see tabWindowId
 */
function setFullScreen(isSetFullScreen = true) {
    if (responseAPI.is_force_full_screen && !isUsingSetFullScreen) {
        if (tabWindowId) {
            chrome.windows.update(tabWindowId, {state: isSetFullScreen? "fullscreen" :"maximized"})
        }
    }
}

/**
 * create new tab in current window with URL equals targetUrl, and set this tab active
 */
function createTab() {
    if (!isUsingSetFullScreen) {
        chrome.tabs.create({active: true, url: targetUrl}, function (tab) {
            tabId = tab.id;
            tabWindowId = tab.windowId;
        })
    }
}

/**
 * set focused on window with windowId and set selected  on tab with tabId
 * @see tabWindowId
 * @see tabId
 */
function setFocusedAndSelect(){
    if (responseAPI.is_force_full_screen && !isUsingSetFullScreen) {
        chrome.windows.update(tabWindowId, {focused: true});
        chrome.tabs.update(tabId, {active: true});
        // chrome.tabs.update(tabId, {selected: true});
    }
}

/**
 * execute script in tab with tabId if necessary
 * @see tabId
 */
function injectScript() {

    console.log("INJECT SCRIPTS AND CSS");
    chrome.tabs.executeScript(tabId, {file: "content.js"});
    chrome.tabs.insertCSS(tabId, {file: "content.css"});
}

/**
 * Chrome message listener, get message of content scripts
 */
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        //sender.tab

        if (request.authInfo){
            key = request.authInfo.accessToken;
            session = request.authInfo.sessionId;
            targetUpdateApiUrl = request.authInfo.serverUrl + '/';
            sessionUuid = request.authInfo.sessionId;
            console.log('key= ',key)
            console.log('session= ',session)
            console.log('targetUpdateApiUrl= ',targetUpdateApiUrl)
            console.log('sessionUuid= ',sessionUuid)
        }

        if (request.openFull) {
            setFullScreen();
        }
        if (request.action === "focusPage") {
            setFocusedAndSelect();
        }
        // if (request.action === "closeAllTabs") {
        //     closeAllTabs();
        // }
        if (request.action === "fullScreenEnd") {
            blockKeyForOpenTabs(false);
            setFullScreen(false);
            isUsingSetFullScreen = true;
        }
        // sendResponse({farewell: "goodbye"});
    });

/**
 * listener for check if url for updated tab equal targetUrl
 * @see targetUrl
 */
chrome.tabs.onUpdated.addListener(function (tabId,changeInfo,tab) {

    if (changeInfo.status === "complete") {
        if (allowCollectTabs){
            console.log('onUpdated tabId = ', tab.id);
                allTabs[tab.id] = Object.assign(tab, {opened: Date.now(), ontab:0, isSent:false});
                console.log(JSON.stringify(allTabs));
            }
        if (!tab.url.indexOf(targetUrl) && !isUsingSetFullScreen) {
            // injectScript();
            searchTab();
        }
        if (tab.url === targetUpdateApiUrl) {
            console.log("update");
            isUsingSetFullScreen = false;
            updateInfo();
        }
    }
});



/**
 * Checking when tab focus change.
 */
chrome.tabs.onActivated.addListener( function(info) {
     if (allowCollectTabs){
        timeOnTabStop = Date.now();
        if (allTabs[lastOpenedTabId]){
           allTabs[lastOpenedTabId].ontab = (timeOnTabStop - timeOnTabStart) / 1000;
        }
        timeOnTabStart = Date.now();
        lastOpenedTabId = info.tabId;
    }
});

/**
 * Delete tab info from allTabs and create new tab if needed
 */
chrome.tabs.onRemoved.addListener(function (removedTabId,removeInfo) {
    delete allTabs[removedTabId];
    if (removedTabId === tabId){
        createTab();
    }
});

function closeAllTabs() {
    chrome.windows.getAll({populate:true}, getAllOpenWindows);

    function getAllOpenWindows(winData) {
        let tabIds = [];
        for (let i in winData) {
            for (let j in winData[i].tabs) {
                if (!(winData[i].tabs[j].url.indexOf(targetUrl) + 1)){
                    tabIds.push(winData[i].tabs[j].id)
                }
            }
        }
        chrome.tabs.remove(tabIds);
    }
}



