$(document).ready(function() {
  var map;
  var markers = [];
  var lastValidCenter;
  //sw,ne
  var strictBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(-85, -180),
        new google.maps.LatLng(85, 180));

  function initialize() {

    var mapCanvas = document.getElementById('map_canvas');
    var mapOptions = {
      center: new google.maps.LatLng(38.150160, 12.728289),
      minZoom:3,
      zoom:3,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [{"featureType":"administrative","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-100},{"lightness":20}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-100},{"lightness":40}]},{"featureType":"water","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-10},{"lightness":30}]},{"featureType":"landscape.man_made","elementType":"all","stylers":[{"visibility":"simplified"},{"saturation":-60},{"lightness":10}]},{"featureType":"landscape.natural","elementType":"all","stylers":[{"visibility":"simplified"},{"saturation":-60},{"lightness":60}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"},{"saturation":-100},{"lightness":60}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"},{"saturation":-100},{"lightness":60}]}]
    };


    map = new google.maps.Map(mapCanvas, mapOptions)

    lastValidCenter = map.getCenter();

    google.maps.event.addListener(map, 'center_changed', function() {
        if (strictBounds.contains(map.getCenter())) {
            // still within valid bounds, so save the last valid position
            lastValidCenter = map.getCenter();
            return;
        }
        // not valid anymore => return to last valid position
        map.setCenter(lastValidCenter);
    });
  }


  // Add a marker to the map and push to the array.
  function addMarker(marker, content) {
    marker.setAnimation(google.maps.Animation.DROP);
    marker.setMap(map);
    google.maps.event.addListener(marker, 'click', function() {
      new google.maps.InfoWindow({content: content}).open(map,marker);
    });
    markers.push(marker);
  }

  // Sets the map on all markers in the array.
  function setAllMap(map) {
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(map);
    }
  }

  // Removes the markers from the map, but keeps them in the array.
  function clearMarkers() {
    setAllMap(null);
  }

  // Shows any markers currently in the array.
  function showMarkers() {
    setAllMap(map);
  }

  // Deletes all markers in the array by removing references to them.
  function deleteMarkers() {
    clearMarkers();
    markers = [];
  }

  google.maps.event.addDomListener(window, 'load', initialize);

  $("#inline-whatisthis").click(function () {
    $.colorbox({href:"whatisthis.html"});
  });

  $("#inline-aboutus").click(function () {
    $.colorbox({href:"aboutus.html"});
  });

  $("#inline-faq").click(function () {
    $.colorbox({href:"faq.html"});
  });

  $("#e1").select2({
    placeholder: "Select a Category",
    allowClear: true
  });

  $("#e2").select2({
    placeholder: "Select a Conference",
    allowClear: true
  });

  var icons = {
    Unknown_C: {
      icon: 'img/uc.png'
    },
    Unknown_J: {
      icon: 'img/uj.png'
    },
    OK_C: {
      icon: 'img/oc.png'
    },
    OK_J: {
      icon: 'img/oj.png'
    },
    Good_C: {
      icon: 'img/gc.png'
    },
    Good_J: {
      icon: 'img/gj.png'
    },
    Top_C: {
      icon: 'img/tc.png'
    },
    Top_J: {
      icon: 'img/tj.png'
    }
  };


  var db;
  var staticConferenceDB;

  $.getJSON( "db.json", function( data ) {
    var associativeArray = {};
    db = data;
    $("#last_updated").html(db.last_updated);
    selector2 = $("#e2");
    var count = 0;
    for (var key in db.conferences) {
      selector2.append(new Option(db.conferences[key].title, db.conferences[key].title));
      count = count + 1;
    }
    $("#conference_count").html(count);
  });

  $.getJSON( "categories.json", function(data) {
    selector1 = $("#e1");
    data["categories"].forEach(function(entry) {
      selector1.append(new Option(entry, entry));
    });
  });

  $.getJSON( "conference-repo.json", function(data) {
    staticConferenceDB = data["conferences"];
  });

  function selectByConfTitle () {
    var type;
    $("#e2").select2("val").forEach(function(item) {
      conference = db.conferences[item.toLowerCase()];
      conf_location = conference["location"].toLowerCase();
      type = "Conference"
      if (conf_location === 'n/a' || conf_location === "publication" || conf_location === "online") {
        type = "Journal"
      }
      makeMarker(type, conference, new google.maps.LatLng(conference["lat"], conference["lng"]));
    });
  }

  function selectByConfCategory() {
    var type;
    $("#e1").select2("val").forEach(function(item) {
      for (var key in db.conferences) {
        conference = db.conferences[key];
        if (!!~db.conferences[key].categories.indexOf(item)) {
          conf_location = conference["location"].toLowerCase();
          type = "Conference"
          if (conf_location === 'n/a' || conf_location === "publication" || conf_location === "online") {
            type = "Journal"
          }
          makeMarker(type, conference, new google.maps.LatLng(conference["lat"], conference["lng"]));
        }
      }
    });
  }

  function makeMarker(type, conference, location) {

    var title = conference["title"].toLowerCase().match(/\w+/)[0];
    var iconType;
    if (staticConferenceDB[title] != undefined) {
      var confInfo = staticConferenceDB[title];
      var info = '(<b>Type:</b> ' + confInfo.type + ', ' + '<b>Ranking:</b> ' + confInfo.ranking + ', ' + '<b>Tier:</b> ' + confInfo.tier + ')';

      if (confInfo.tier === "A") {
        if (type === "Journal") {iconType = "Top_J";} else {iconType = "Top_C";}
      } else if (confInfo.tier === "B") {
        if (type === "Journal") {iconType = "Good_J";} else {iconType = "Good_C";}
      } else if (confInfo.tier === "C") {
        if (type === "Journal") {iconType = "OK_J";} else {iconType = "OK_C";}
      } else {
        if (type === "Journal") {iconType = "Unknown_J";} else {iconType = "Unknown_C";}
      }

    } else {
      if (type === "Journal") {iconType = "Unknown_J";} else {iconType = "Unknown_C";}
      var info = '(<b>Type:</b> Unknown, ' + '<b>Ranking:</b> Unknown, ' + '<b>Tier:</b> Unknown)';
    }

    var contents = '<h4>' + type + '</h4>' +
      '<b>Name: ' + conference["title"] + '</b> ' + info + '<br>' +
      '<b>Submission Deadline:</b> ' + conference["submission"] + '<br>' +
      '<b>Full Title:</b> ' + conference["full_title"] + '<br>' +
      '<b>Location:</b> ' + conference["location"] + '<br>' +
      '<b>Conference Date:</b> ' + conference["date"] + '<br>' +
      '<b>URL:</b> ' + '<a target="_blank" href="'+ conference["url"] + '">' + conference["url"] + '</a>' + '<br>' +
      '<b>Categories:</b> ' + conference["categories"];

    if (conference["lat"] == 0 && conference["lng"] == 0) {
      location
    }

    var marker = new google.maps.Marker({
      position: location,
      icon: icons[iconType].icon
    });

    addMarker(marker,contents);
  }

  $("#e1").click(function() {
    deleteMarkers();
    selectByConfTitle();
    selectByConfCategory();
  });
  $("#e2").click(function() {
    deleteMarkers();
    selectByConfTitle();
    selectByConfCategory();
  });
});
