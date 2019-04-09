if (!span) {
    var span = document.getElementById('pluginParams');

    let accessToken = span.dataset.accessToken;
    let serverUrl = span.dataset.serverUrl;
    let sessionUuid = span.dataset.sessionUuid;
    let sessionId = span.dataset.sessionId;


    chrome.runtime.sendMessage({
        authInfo: {
            accessToken: accessToken,
            serverUrl: serverUrl,
            sessionUuid: sessionUuid,
            sessionId: sessionId
        }
    });

}