$(document).ready(function() {
  var map;
  var markers = [];
  var markers2 = [];
  var markers3 = [];
  var lastValidCenter;
  var oms;

  function initialize() {

    var mapCanvas = document.getElementById('map_canvas');
    var mapOptions = {
      center: new google.maps.LatLng(38.150160, 12.728289),
      // minZoom:3,
      zoom:4,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [{"featureType":"administrative","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-100},{"lightness":20}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-100},{"lightness":40}]},{"featureType":"water","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-10},{"lightness":30}]},{"featureType":"landscape.man_made","elementType":"all","stylers":[{"visibility":"simplified"},{"saturation":-60},{"lightness":10}]},{"featureType":"landscape.natural","elementType":"all","stylers":[{"visibility":"simplified"},{"saturation":-60},{"lightness":60}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"},{"saturation":-100},{"lightness":60}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"},{"saturation":-100},{"lightness":60}]}]
    };


    map = new google.maps.Map(mapCanvas, mapOptions)
    oms = new OverlappingMarkerSpiderfier(map);
    lastValidCenter = map.getCenter();

    var iw = new google.maps.InfoWindow();
    oms.addListener('click', function(marker, event) {
      iw.setContent(marker.desc);
      iw.open(map, marker);
    });
  }

  // Add a marker to the map and push to the array.
  function addMarker(marker, content, arrayId) {
    marker.setAnimation(google.maps.Animation.DROP);
    marker.setMap(map);
    marker.desc = content;
    var shouldAdd = true;
    if (arrayId == 1) {
      markers.forEach(function(item) {
        if (item.title == marker.title) {
          shouldAdd = false;
          return;
        }
      });
      if (shouldAdd) {
        markers.push(marker);
      }
    } else if (arrayId == 2) {
      markers2.forEach(function(item) {
        if (item.title == marker.title) {
          shouldAdd = false;
          return;
        }
      });
      if (shouldAdd) {
        markers2.push(marker);
      }
    } else if (arrayId == 3) {
      markers3.forEach(function(item) {
        if (item.title == marker.title) {
          shouldAdd = false;
          return;
        }
      });
      if (shouldAdd) {
        markers3.push(marker);
      }
    }
    if (shouldAdd) {
      oms.addMarker(marker);
    }
  }

  // Sets the map on all markers in the array.
  function setAllMap(map,markers) {
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(map);
    }
  }

  // Removes the markers from the map, but keeps them in the array.
  function clearMarkers(markers) {
    setAllMap(null,markers);
  }


  // Shows any markers currently in the array.
  function showMarkers() {
    setAllMap(map,markers);
    setAllMap(map,markers2);
  }

  // Deletes all markers in the array by removing references to them.
  function deleteCategoryMarkers() {
    clearMarkers(markers);
    markers = [];
  }

  function deleteTitleMarkers() {
    clearMarkers(markers2);
    markers2 = [];
  }
  function deleteCountryMarkers() {
    clearMarkers(markers3);
    markers3 = [];
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
    UNKNOWN: {
      icon: 'https://maps.google.com/mapfiles/ms/icons/pink.png'
    },
    KNOWN: {
      icon: 'https://maps.google.com/mapfiles/ms/icons/blue.png'
    },
    OK: {
      icon: 'https://maps.google.com/mapfiles/ms/icons/yellow.png'
    },
    GOOD: {
      icon: 'https://maps.google.com/mapfiles/ms/icons/orange.png'
    },
    TOP: {
      icon: 'https://maps.google.com/mapfiles/ms/icons/green.png'
    }
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
      if (country != undefined){
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

  function selectByConfCategory() {
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
              makeMarker(type, conference, new google.maps.LatLng(conference["lat"], conference["lng"]), 1);
            }
          }
        });
    });
  }

  function selectByCountry () {
    var type;
    $("#e3").select2("val").forEach(function(item) {
      for (var key in db.conferences) {
        var conference = db.conferences[key];
        if (conference.country === item) {
          conf_location = conference["location"].toLowerCase();
          type = "Conference"
          if (conf_location === 'n/a' || conf_location === "publication" || conf_location === "online") {
            type = "Journal"
          }
          makeMarker(type, conference, new google.maps.LatLng(conference["lat"], conference["lng"]), 3);
        }
      }
    });
  }

  function selectByConfTitle () {
    var type;
    $("#e2").select2("val").forEach(function(item) {
      conference = db.conferences[item.toLowerCase()];
      conf_location = conference["location"].toLowerCase();
      type = "Conference"
      if (conf_location === 'n/a' || conf_location === "publication" || conf_location === "online") {
        type = "Journal"
      }
      makeMarker(type, conference, new google.maps.LatLng(conference["lat"], conference["lng"]),2);
    });
  }

  function addToList(type, conference, contents) {
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
      if (type === "Conference") {
        listToAddTo = $("#stranded_confs")
      } else {
        listToAddTo = $("#stranded_journals")
      }
      listToAddTo.append(
          $('<label>')
            .attr('class', 'list-group-item')
            .append(
              $('<a>')
                // .attr('href', "#")
                .attr('target', "_blank")
                .append(conference["title"]))
            .click(function(){
              $.colorbox({html:contents});
            })
            );
    }
    $("#cool").show();
  }

  function makeMarker(type, conference, location, arrayId) {

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

    var contents = '<h4>' + type + '</h4>' +
      '<b>Name: ' + conference["title"] + '</b> ' + info + '<br>' +
      '<b>Submission Deadline:</b> ' + conference["submission"] + '<br>' +
      '<b>Full Title:</b> ' + conference["full_title"] + '<br>' +
      '<b>Location:</b> ' + conference["location"] + '<br>' +
      '<b>Conference Date:</b> ' + conference["date"] + '<br>' +
      '<b>URL:</b> ' + '<a target="_blank" href="'+ conference["url"] + '">' + conference["url"] + '</a>' + '<br>' +
      '<b>Categories:</b> ' + conference["categories"];

    if (conference["lat"] == 0 && conference["lng"] == 0) {
      addToList(type, conference, contents);
      return;
    }

    var marker = new google.maps.Marker({
      position: location,
      icon: icons[iconType].icon,
      title: conference["title"].trim().toLowerCase()
    });
    addMarker(marker,contents,arrayId);
  }

  $("#e1").click(function() {
    $("#cool div").empty();
    deleteCategoryMarkers();
    selectByConfCategory();
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });

  $("#e2").click(function() {
    deleteTitleMarkers();
    selectByConfTitle();
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });

  $("#e3").click(function() {
    deleteCountryMarkers();
    selectByCountry();
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });

  $("#listClose").click(function() {
    $("#cool").hide();
  });
});
