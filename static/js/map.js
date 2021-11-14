// JSON loading code from http://stackoverflow.com/a/18278346
function loadJSON(path, success, error) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        if (success) success(JSON.parse(xhr.responseText));
      } else {
        if (error) error(xhr);
      }
    }
  };
  xhr.open("GET", path, true);
  xhr.send();
}

// Throttle function to only fire every, say 250ms
function throttle(fn, threshhold, scope) {
  if (!threshhold) {
    threshhold = 1000;
  }
  var last, deferTimer;
  return function() {
    var context = scope || this;

    var now = +new Date(),
      args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function() {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}

// Get the query parameters (from http://stackoverflow.com/a/21152762)
var qd = {};
location.search.substr(1).split("&").forEach(function(item) {
  var s = item.split("="),
    k = s[0],
    v = s[1] && decodeURIComponent(s[1]);
  (qd[k] = qd[k] || []).push(v);
});

// Set up shorthand (yx and xy)
var yx = L.latLng;
var xy = function(x, y) {
  if (L.Util.isArray(x)) {
    // When doing xy([x, y]);
    return yx(x[1], x[0]);
  }
  return yx(y, x); // When doing xy(x, y);
};

// Set up the socket.io connection
var socket = null;
document.addEventListener("DOMContentLoaded", function() {
  socket = io();
  socket.on("error", function(error) {
    console.log(error);
  });
  // clean up the connection before leaving the page
  window.addEventListener("beforeunload", function() {
    socket.disconnect();
  });
  socket.on("update", function(message) {
    if (bbMap.pc) {
      console.log(message);
      // remove the old markers
      bbMap.markers.forEach(function(marker) {
        marker.remove();
      });

      // set the new view
      bbMap.map.flyTo(
        xy(message.center.lng, message.center.lat),
        message.zoom
      );

      // set the new markers
      message.markers.forEach(function(marker) {
        bbMap.addMarker(xy(marker.lng, marker.lat), marker.title);
      });

      // update the URL
      //bbMap.updateURL();
    }
  });
});

var bbMap = (function() {
  var my = {};
  var oms;
  var popup;

  my.updateURL = function() {
    var url = document.location.href.split("?", 1)[0];
    var center = my.map.getCenter();
    var zoom = my.map.getZoom();
    var markers = [];

    url += "?x=" + center.lng + "&y=" + center.lat + "&z=" + zoom;
    if (my.gm) {
      url += "&gm";
    } else if (my.pc) {
      url += "&pc";
    }
    my.markers.forEach(function(marker) {
      var latLng = marker.getLatLng();
      url += "&marker=" + encodeURIComponent(marker.options.title);
      url += ";" + latLng.lng;
      url += ";" + latLng.lat;
      markers.push({
        title: marker.options.title,
        lat: latLng.lat,
        lng: latLng.lng
      });
    });
    if (my.live) {
      url += "&live";
      // if live, send the current info to the server
      var message = JSON.stringify({
        center: center,
        zoom: zoom,
        markers: markers
      });
      // Wait for the document to fully load before sending messages
      if (socket != null) {
        socket.emit("update", message);
      }
    }
    history.replaceState({}, document.title, url);
  };

  //
  // Initialise the map
  //
  my.init = function() {
    //
    // Set the 'map' div up
    //
    var map = L.map("map", {
      crs: L.CRS.Simple,
      minZoom: 0
    });

    //
    // Add a "Spiderfier" layer
    //
    oms = new OverlappingMarkerSpiderfier(map);
    // set popup to display when marker is clicked
    // Note: this restricts us to one popup open at a time
    popup = new L.Popup({ offset: [1, -20] });
    oms.addListener("click", function(marker) {
      if (marker.options.title) {
        // only popup if there is a title
        popup.setContent(marker.options.title);
        popup.setLatLng(marker.getLatLng());
        map.openPopup(popup);
      }
    });

    //
    // Add the map tile layers
    //
    L.tileLayer("/static/map/inner_sea/{z}/{x}/{y}.png", {
      maxZoom: 8,
      maxNativeZoom: 5,
      minZoom: 0,
      bounds: [yx(-256, 0), yx(0, 256)]
    }).addTo(map);

    L.tileLayer("/static/map/shackles/{z}/{x}/{y}.png", {
      maxZoom: 8,
      maxNativeZoom: 7,
      minZoom: 5,
      bounds: [yx(-224, 32), yx(-192, 64)]
    }).addTo(map);

    L.tileLayer("/static/map/ustalav/{z}/{x}/{y}.png", {
      maxZoom: 8,
      maxNativeZoom: 5,
      minZoom: 5,
      bounds: [yx(-48, 120), yx(-80, 152)]
    }).addTo(map);

    //
    // Set the view
    //
    var center = {};
    if (isNaN(parseFloat(qd.x))) {
      center.x = 47.7;
    } else {
      center.x = parseFloat(qd.x);
    }
    if (isNaN(parseFloat(qd.y))) {
      center.y = -213.25;
    } else {
      center.y = parseFloat(qd.y);
    }
    if (isNaN(parseFloat(qd.z))) {
      center.z = 5;
    } else {
      center.z = parseFloat(qd.z);
    }
    map.setView(xy(center.x, center.y), center.z);

    //
    // Add markers to map
    //
    var markers = [];
    var addMarker = function(latLng, title) {
      // Add marker to map at lat,lng with title

      // Round lat/long to nearest 0.01
      x = Math.round(latLng.lng * 100) / 100;
      y = Math.round(latLng.lat * 100) / 100;
      var m = new L.marker(xy(x, y), { title: title });
      m.addTo(map);
      oms.addMarker(m);
      markers.push(m);
      if (my.live) {
        my.updateURL();
      }
    };

    (qd.marker || []).forEach(function(marker) {
      var title, x, y;
      [title, x, y] = marker.split(";");
      addMarker(yx(y, x), title);
    });

    //
    // Enable "pc-mode" if necessary
    //
    if(qd.pc != undefined) {
      this.pc = true;
    } else {
      this.pc = false;
    }

    //
    // Enable GM-tools if necessary
    //
    if (qd.gm != undefined) {
      this.gm = true;

      //
      // Set the cross-hairs
      //
      var crosshairIcon = L.icon({
        iconUrl: "/static/img/crosshair.png",
        iconSize: [64, 64],
        iconAnchor: [32, 32]
      });
      var crosshair;
      var centre_div = document.getElementById("centre");
      crosshair = new L.marker(map.getCenter(), {
        icon: crosshairIcon,
        interactive: false
      });
      crosshair.addTo(map);

      var updateURL = throttle(my.updateURL, 50);
      var updateLatLng = function(e) {
        // Move the crosshair to the centre of the map when it is panned
        // and update the centre indicator div
        crosshair.setLatLng(map.getCenter());
        var x = map.getCenter().lng;
        var y = map.getCenter().lat;
        // Round to nearest 0.05
        x = Math.round(x * 20) / 20;
        y = Math.round(y * 20) / 20;
        centre_div.innerText = "x=" + x + "&y=" + y + "&z=" + map.getZoom();
        if (my.live) {
          updateURL();
        }
      };
      map.on("move", updateLatLng);
      updateLatLng();

      //
      // Add extra buttons
      //

      // define a function to add a marker at the curser location when the map is clicked
      var uiAddmarker = function(e) {
        if (e.latlng != undefined) {
          map.off("click", uiAddmarker);
          map._container.style.cursor = null;
          var title = window.prompt("Name your marker:");
          if (title != null) {
            addMarker(e.latlng, title);
          }
        }
      };

      // Add the Controls to the map
      var GmControls = L.Control.extend({
        options: { position: "topleft" },

        onAdd: function(map) {
          var container = L.DomUtil.create(
            "div",
            "leaflet-bar leaflet-control leaflet-control-custom"
          );

          // Add marker button
          var markerButton = L.DomUtil.create("a", null, container);
          markerButton.text = "M";
          markerButton.href = "#";

          markerButton.onclick = function(e) {
            e.preventDefault();
            L.DomEvent.stopPropagation(e);
            map._container.style.cursor = "crosshair";
            map.on("click", uiAddmarker);
          };

          // Live mode button
          my.live = qd.live != undefined;
          var liveButton;
          if (my.live) {
            liveButton = L.DomUtil.create(
              "a",
              "leaflet-control-pressed",
              container
            );
          } else {
            liveButton = L.DomUtil.create("a", null, container);
          }
          liveButton.text = "L";

          liveButton.onclick = function(e) {
            if (e.target.classList.contains("leaflet-control-pressed")) {
              e.target.classList.remove("leaflet-control-pressed");
              my.live = false;
              my.updateURL();
            } else {
              e.target.classList.add("leaflet-control-pressed");
              my.live = true;
              my.updateURL();
            }
          };

          return container;
        }
      });
      map.addControl(new GmControls());
    } else {
      this.gm = false;
    }
    this.map = map;
    this.markers = markers;
    this.addMarker = addMarker;
  };

  my.init();

  return my;
})();

var search = (function(map) {
  // Set up search
  var options = {
    shouldSort: true,
    threshold: 0.3,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 1,
    keys: ["location"]
  };
  var fuse;
  var results;

  // Load the locations
  var locations;
  loadJSON(
    "/static/map/inner_sea/locations.json",
    function(data) {
      locations = data;
      fuse = new Fuse(locations, options);
    },
    function(xhr) {
      console.log(xhr);
    }
  );

  // Go to top result (if it exists) on click of the go button
  var gobutton = document.getElementById("gobutton");
  gobutton.addEventListener("click", function() {
    map.flyTo(xy(results[0].x, results[0].y));
  });

  // Search for results on keyup event of textbox
  var searchbox = document.getElementById("searchbox");
  var resultlist = document.getElementById("resultlist");
  searchbox.addEventListener("keyup", function(event) {
    // Check if enter key, if so call the "Go!" function
    var code = event.which || event.keyCode || event.charCode;
    if (code == "13") {
      gobutton.click();
      return;
    }

    // get the search results
    results = fuse.search(searchbox.value);
    // remove existing results
    while (resultlist.hasChildNodes()) {
      resultlist.removeChild(resultlist.lastChild);
    }
    // Add new results
    var frag = document.createDocumentFragment();
    results.forEach(function(item, index) {
      if (index > 10) {
        return;
      }
      var li = document.createElement("li");
      li.innerHTML = item.location;
      li.addEventListener("click", function() {
        map.flyTo(xy(item.x, item.y));
      });
      frag.appendChild(li);
    });
    resultlist.appendChild(frag);
  });
  searchbox.addEventListener("onchange", function() {
    this.onKeyUp();
  });

  return fuse;
})(bbMap.map);
