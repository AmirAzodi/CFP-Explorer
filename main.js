$(document).ready(function() {
  var map;
  var markers = [];
  var oms;

  function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }
  function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
      if (myArray[i] != undefined){
        if (myArray[i][property] === searchTerm) return i;
      }
    }
    return -1;
  }

  function initialize() {

    var mapCanvas = document.getElementById('map_canvas');
    var mapOptions = {
      center: new google.maps.LatLng(38.150160, 12.728289),
      zoom:4,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };


    map = new google.maps.Map(mapCanvas, mapOptions)
    oms = new OverlappingMarkerSpiderfier(map, {
      keepSpiderfied: true,
      circleSpiralSwitchover: Infinity,
      markersWontMove: true,
      markersWontHide: true
    });

    var iw = new google.maps.InfoWindow();
    oms.addListener('click', function(marker, event) {
      iw.setContent(marker.desc);
      iw.open(map, marker);
    });
  }

  google.maps.event.addDomListener(window, 'load', initialize);

  $("#inline-faq").click(function () {
    $.colorbox({href:"faq.html"});
  });

  $("#e1").select2({
    placeholder: "Enter a Category",
    allowClear: true
  });

  $("#e2").select2({
    placeholder: "Enter a Conference",
    allowClear: true
  }).on("select2-removing", function(e) {
    $("#cool div label").each(function() {
      var my = $(this);
      if (my.text().toLowerCase().trim() === e.val.toLowerCase().trim()) {
        my.remove();
        return false;
      }
    });
  });

  $("#e3").select2({
    placeholder: "Enter a Country",
    allowClear: true
  });

  var icons = {
    UNKNOWN: 'https://maps.google.com/mapfiles/ms/icons/pink.png',
    KNOWN: 'https://maps.google.com/mapfiles/ms/icons/blue.png',
    OK: 'https://maps.google.com/mapfiles/ms/icons/yellow.png',
    GOOD: 'https://maps.google.com/mapfiles/ms/icons/orange.png',
    TOP: 'https://maps.google.com/mapfiles/ms/icons/green.png'
  };


  var db;
  var staticConferenceDB;
  function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

  $.getJSON( "db.json", function( data ) {
    var associativeArray = {};
    db = data;
    $("#last_updated").html(db.last_updated.split(' ')[0]);
    selector2 = $("#e2");
    countrySelector = $("#e3");
    var listOfCountries = [];
    var count = 0;
    for (var key in db.conferences) {
      selector2.append(new Option(db.conferences[key].title, db.conferences[key].title));
      count = count + 1;
      country = db.conferences[key].country;
      if (country != undefined && country != "Unknown" ) {
        listOfCountries.push(country);
      }
    }
    listOfCountries.filter(onlyUnique).forEach(function(country) {
      countrySelector.append(new Option(country, country));
    });
    $("#conference_count").html(count);
  });

  $.getJSON( "ui-categories.json", function(data) {
    selector1 = $("#e1");
    for (var key in data["categories"]) {
      selector1.append(new Option(key, data["categories"][key]));
    }
  });

  $.getJSON( "conference-repo.json", function(data) {
    staticConferenceDB = data["conferences"];
  });

  function placeMarkers() {
    newMarkers = [];
    var trackedMarkers = oms.getMarkers();
    var type;
    $("#e1").select2("val").forEach(function(item) {
        item.split(',').forEach(function(subItem) {
          for (var key in db.conferences) {
            conference = db.conferences[key];
            if (!!~db.conferences[key].categories.indexOf(subItem)) {
              conf_location = conference["location"].toLowerCase();
              type = "Conference"
              if (conf_location === 'n/a' || conf_location === "publication" || conf_location === "online") {
                type = "Journal"
              }
              conference["geoLocation"] = new google.maps.LatLng(conference["lat"], conference["lng"]);
              conference["type"] = type;
              newMarkers.push(makeMarker(conference));
            }
          }
        });
    });

    $("#e3").select2("val").forEach(function(item) {
      for (var key in db.conferences) {
        var conference = db.conferences[key];
        if (conference.country === item) {
          conf_location = conference["location"].toLowerCase();
          type = "Conference"
          if (conf_location === 'n/a' || conf_location === "publication" || conf_location === "online") {
            type = "Journal"
          }
          conference["geoLocation"] = new google.maps.LatLng(conference["lat"], conference["lng"]);
          conference["type"] = type;
          newMarkers.push(makeMarker(conference));
        }
      }
    });

    $("#e2").select2("val").forEach(function(item) {
      conference = db.conferences[item.toLowerCase()];
      conf_location = conference["location"].toLowerCase();
      type = "Conference"
      if (conf_location === 'n/a' || conf_location === "publication" || conf_location === "online") {
        type = "Journal"
      }
      conference["geoLocation"] = new google.maps.LatLng(conference["lat"], conference["lng"]);
      conference["type"] = type;
      newMarkers.push(makeMarker(conference));
    });


    newMarkers.filter( function( el ) {
      if (el != undefined) {
        return arrayObjectIndexOf(markers, el.title, "title") < 0;
      }
    }).forEach(function(m){
      m.setAnimation(google.maps.Animation.DROP);
      m.setMap(map);
      markers.push(m);
      oms.addMarker(m);
    });

    markers.filter( function( el ) {
      if (el != undefined) {
        return arrayObjectIndexOf(newMarkers, el.title, "title") < 0;
      }
    }).forEach(function(m){
        m.setMap(null);
        delete markers[arrayObjectIndexOf(markers, m.title, "title")];
        oms.removeMarker(m);
    });
  }

  function addToList(conference) {
    var shouldAdd = true;
    $("#cool div label").each(function() {
      var my = $(this);
      if (my.text().toLowerCase().trim() === conference["title"].toLowerCase().trim()) {
        shouldAdd = false;
        return;
      }
    });
    if (shouldAdd) {
      var listToAddTo;
      if (conference["type"] === "Conference") {
        listToAddTo = $("#stranded_confs")
      } else {
        listToAddTo = $("#stranded_journals")
      }
      listToAddTo.append(
        $('<label>')
          .attr('class', 'list-group-item')
          .append(
            $('<a>')
              .attr('target', "_blank")
              .append(conference["title"]))
          .click(function(){
            $.colorbox({html:conference["contents"]});
          }
        )
      );
    }
    $("#cool").show();
  }

  function makeMarker(conference) {

    var title = conference["title"].toLowerCase().match(/\w+/)[0];
    var iconType;

    if (staticConferenceDB[title] != undefined) {
      var confInfo = staticConferenceDB[title];
      var info = '(<b>Type:</b> ' + confInfo.type + ', ' + '<b>Ranking:</b> ' + confInfo.ranking + ', ' + '<b>Tier:</b> ' + confInfo.tier + ')';
      if (confInfo.tier === "A") {
        iconType = "TOP";
      } else if (confInfo.tier === "B") {
        iconType = "GOOD";
      } else if (confInfo.tier === "C") {
        iconType = "OK";
      } else if (confInfo.ranking != "Unknown"){
        iconType = "KNOWN";
      } else {
        iconType = "UNKNOWN";
      }
    } else {
      iconType = "UNKNOWN";
      var info = '(<b>Type:</b> Unknown, ' + '<b>Ranking:</b> Unknown, ' + '<b>Tier:</b> Unknown)';
    }

    var contents = '<h4>' + conference["type"] + '</h4>' +
      '<b>Name: ' + conference["title"] + '</b> ' + info + '<br>' +
      '<b>Submission Deadline:</b> ' + conference["submission"] + '<br>' +
      '<b>Full Title:</b> ' + conference["full_title"] + '<br>' +
      '<b>Location:</b> ' + conference["location"] + '<br>' +
      '<b>Conference Date:</b> ' + conference["date"] + '<br>' +
      '<b>URL:</b> ' + '<a target="_blank" href="'+ conference["url"] + '">' + conference["url"] + '</a>' + '<br>' +
      '<b>Categories:</b> ' + conference["categories"];

    if (conference["lat"] == 0 && conference["lng"] == 0) {
      conference["contents"] = contents;
      addToList(conference);
      return;
    }

    return new google.maps.Marker({
      position: conference["geoLocation"],
      icon: icons[iconType],
      title: conference["title"].trim().toLowerCase(),
      desc: contents
    });
  }

  $("#e1").click(function() {
    $("#cool div").empty();
    placeMarkers();
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });

  $("#e2").click(function() {
    placeMarkers();
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });

  $("#e3").click(function() {
    placeMarkers();
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });

  $("#listClose").click(function() {
    $("#cool").hide();
  });
});
