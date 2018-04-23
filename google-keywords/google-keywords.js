var TIMEOUT = 10 * 1000;
var webPage = require('webpage');
var system = require('system');
var fs = require('fs');
var page = webPage.create();
phantom.outputEncoding = "utf-8"
//page.settings.loadImages = false;
var useragent = [];
useragent.push('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36');
page.viewportSize = {
    width: 1920,
    height: 1080
};
page.settings.userAgent = useragent[Math.floor(Math.random() * useragent.length)];
page.settings.resourceTimeout = TIMEOUT;
var args = system.args;
var re = new Object();
"use strict";
if (args.length < 2) {
    console.log('usage: phantomjs click.js url elementSelector');
    phantom.exit(1);
}
var exit = function () {
    console.log(JSON.stringify(re));
    phantom.exit();
};
function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 5000, //< Default Max Timout is 5s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function () {
            if ((new Date().getTime() - start < maxtimeOutMillis) && !condition) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof (testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if (!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    typeof (onReady) === "string" ? eval(onReady) : onReady();
                    clearInterval(interval);
                    //phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                    typeof (onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 500); //< repeat check every 500ms
};
var url = args[1];
var loadCount = 0;
var elementSelector = ".r a";
var finishSelector = ".exp-c .exp-r";

var isResourceLogEnabled = true;
 
var triggerClick = function(status) {
    isResourceLogEnabled = true;    

    var ret = page.evaluate(function(elementSelector) {
        var element = document.querySelector(elementSelector);        
        if (!element) {
            re["Error"] = "selectForFirstClick";
            return 3;
        }
        if (typeof element.click == 'function') {
            element.click();                        
            return 0;
        }
    }, elementSelector);

    if (ret != 0) {
        re["Error"] = "notFoundClickTarget";
        exit();
    }
};

/**
page.onResourceRequested = function(e) {
    if (isResourceLogEnabled) {
        console.log(e.url);        
        phantom.exit(0);
    }
};
*/

page.onResourceReceived = function(response) {
    if (response.stage !== "end") return;
    //console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + response.url);
    re["Header"] = response.headers;
};
page.onResourceTimeout = function (e) {
    // console.log("phantomjs onResourceTimeout error");
    // console.log(e.errorCode);   // it'll probably be 408
    // console.log(e.errorString); // it'll probably be 'Network timeout on resource'
    // console.log(e.url);         // the url whose request timed out
    // phantom.exit(1);
    re["Error"] = "onResourceTimeout";
    exit();
};
page.onResourceError = function (e) {
     //console.log("onResourceError");
     //console.log("1:" + e.errorCode + "," + e.errorString);
    if (e.errorCode != 5) { //errorCode=5的情况和onResourceTimeout冲突
        re["Error"] = "onResourceError";
        exit();
    }
};
page.onUrlChanged = function(targetUrl) {
    console.log('New URL: ' + targetUrl);
};
page.onLoadFinished = function(status) {
    loadCount++;    
    if(loadCount == 2){ 
        page.evaluate(function() {            
            window.history.back();            
        });        
    }
    page.render('step' + loadCount + '.png');
    fs.write('step'+loadCount+'.html', page.content, 'w');    
};
page.onLoadStarted = function() {    
    console.log('Load Started');
};
page.onNavigationRequested = function(url, type, willNavigate, main) {
    console.log('Trying to navigate to: ' + url);
};

//page.open(url, triggerClick);
page.open(url,function(status){    
    if (status !== 'success') {        
        re["Error"] = "connectError";
        exit();
    }else{
        waitFor(
            function () {
                var len = document.querySelectorAll(finishSelector).length;
                console.log(finishSelector + ":" +len);
                if(len > 0){                    
                    return true;
                }else{
                    return false;
                }                
            },
            function () {
                page.render('step-finish.png');
                re["Body"] = page.content;
                fs.write('step-finish.html', page.content, 'w');
                exit();
            }, 5000);        
    }
	//page.injectJs('jquery.js');    
	triggerClick();        	   
});
