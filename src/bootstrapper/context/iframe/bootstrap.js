define([
  '../../../runner/stage',
  '../script_loader',
  '../../../tools'
], function(Stage, makeScriptLoader, tools) {
  'use strict';

  function loadUrl(url, successCallback, errorCallback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function() {
      if (xhr.status >= 200 || xhr.status < 300 || xhr.status == 304) {
        successCallback(this.responseText);
      } else {
        errorCallback();
      }
    };
    xhr.onerror = errorCallback;
    xhr.send(null);
  }

  return function(messageChannel, iframeWindow) {

    var doc = iframeWindow.document;

    var loader = makeScriptLoader(function(url, cb) {
      var script = doc.createElement('script');
      script.src = url;
      script.onload = cb;
      doc.documentElement.appendChild(script);
    });

    iframeWindow.load = function(url, cb) { return loader.load(url, cb); };
    iframeWindow.wait = function() { return loader.wait(); };
    iframeWindow.done = function() { return loader.done(); };

    var stage = new Stage(messageChannel, loadUrl);
    var env = stage.env.exports;
    
    // Expose bonsai API in iframe window
    tools.mixin(iframeWindow, env);
    iframeWindow.exports = {}; // for plugins

    // As per the boostrap's contract, it must provide stage.loadSubMovie
    stage.loadSubMovie = function(movieUrl, doDone, doError, movieInstance) {

      var iframe = doc.createElement('iframe');
      doc.documentElement.appendChild(iframe);
      var subWindow = iframe.contentWindow;
      var subMovie = movieInstance || new env.Movie();
      var subEnvironment = stage.getSubMovieEnvironment(subMovie, movieUrl);

      // Need to call open()/close() before exposing anything on the window
      // (Opera would initiate a separate script context if we did it after)
      subWindow.document.open();
      subWindow.document.close();
      tools.mixin(subWindow, subEnvironment.exports);

      subWindow.stage = subMovie;
      subMovie.root = this;

      var subLoader = makeScriptLoader(function(url, cb) {
        var script = subWindow.document.createElement('script');
        script.src = url;
        script.onload = cb;
        subWindow.document.documentElement.appendChild(script);
      });

      subLoader.load(stage.assetBaseUrl.resolveUri(movieUrl), function() {
        doDone && doDone.call(subMovie, subMovie);
      });

    };
    
    messageChannel.on('message', function(message) {
      if (message.command === 'loadScript') {
        loader.load(message.url, function() {
          messageChannel.notify({
            command: 'scriptLoaded',
            url: message.url
          })
        });
      } else if (message.command === 'runScript') {
        loader.load('data:text/javascript,' + encodeURIComponent(message.code));
      } else if (message.command === 'exposePluginExports') {
        // Don't allow anything to overwrite the bonsai stage:
        if ('stage' in iframeWindow.exports) {
          delete iframeWindow.exports.stage;
        }
        tools.mixin(env, iframeWindow.exports);
        tools.mixin(iframeWindow, iframeWindow.exports);
      }
    });

    stage.unfreeze();
    messageChannel.notifyRenderer({command:"isReady"});
  };
});
