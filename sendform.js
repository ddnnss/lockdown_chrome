chrome.storage.sync.get(['json_config'], function (result) {
    res = result.json_config;
    let input = document.getElementById(res.access_code_textbox_idcls);
    let btn = document.querySelector('.access_code_form .' + res.access_code_submitbtn_idcls);
    input.value = res.access_code;
    console.log (btn)
    window.name = 'test';
    chrome.runtime.sendMessage({ clicked: true});
    btn.click();
})



