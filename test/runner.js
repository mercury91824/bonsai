define([
  'order!../lib/jasmine-core/jasmine.js',
  'order!../lib/jasmine-core/jasmine-html.js',
  'order!../lib/jasmine-core/jasmine.junit-reporter.js',
  'order!jasmine.helper.js',
  'order!jasmine.compare-reporter.js',
  'order!jasmine-matchers.js'
], function(jasmineCore, jasmineHtml, junitReporter, jasmineHelper, compareReporter) {
  var jasmineEnv = jasmine.getEnv();
  jasmineEnv.updateInterval = 10000;

  this.async = jasmineHelper.async;
  this.waitForAsync = jasmineHelper.waitForAsync;
  this.compare = jasmineHelper.compare({
    runCompareTests: true,
    compareServer: 'http://jenkins.ux:33334'
  });

  var trivialReporter = new jasmine.TrivialReporter();

  jasmineEnv.addReporter(trivialReporter);
  jasmineEnv.addReporter(new jasmine.JUnitXmlReporter('', true, false));
  // passing trivialReporter so we can access the individual DOM nodes
  jasmineEnv.addReporter(new jasmine.CompareReporter(trivialReporter));

  jasmineEnv.specFilter = function(spec) {
    return trivialReporter.specFilter(spec);
  };

  function execJasmine() {
    jasmineEnv.execute();
  }

  if (document.body) {
    setTimeout(execJasmine, 1000);
  } else {
    window.addEventListener('load', execJasmine, false);
  }
});
