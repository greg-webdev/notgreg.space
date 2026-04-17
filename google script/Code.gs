function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Google Script App')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
