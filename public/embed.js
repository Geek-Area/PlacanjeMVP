// Sizes placanje.rs embed iframes to fit the slip. Optional; without it, give the iframe a fixed height.
//   <iframe src="https://placanje.rs/e#2.<kod>" style="width:100%;border:0" title="Uplatnica"></iframe>
//   <script src="https://placanje.rs/embed.js" async></script>
(function () {
  var script = document.currentScript;
  var origin = script ? new URL(script.src).origin : 'https://placanje.rs';

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (event.origin !== origin || !data || data.type !== 'placanje-embed:height') return;
    if (typeof data.height !== 'number' || !isFinite(data.height)) return;

    var frames = document.getElementsByTagName('iframe');
    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      if (frame.contentWindow === event.source) {
        // Borders count towards the height when the host page uses box-sizing: border-box.
        var borders = frame.offsetHeight - frame.clientHeight;
        frame.style.height = Math.min(Math.max(Math.round(data.height), 50), 5000) + borders + 'px';
      }
    }
  });
})();
