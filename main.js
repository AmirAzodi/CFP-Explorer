var db;
var staticConferenceDB;
var cal;
var map;
var markers = [];
var oms;
var icons = {
  UNKNOWN: 'pink.png',
  KNOWN: 'blue.png',
  OK: 'yellow.png',
  GOOD: 'orange.png',
  TOP: 'green.png'
};

function calendarEvent(title) {
  for (var key in db.conferences) {
    if (key === title.toLowerCase().trim()) {
      var conference = db.conferences[key];
      cal = ics();
      cal.addEvent(conference["title"], conference["full_title"], conference["location"], conference["submission"], conference["submission"]);
      cal.download();
      return false;
    }
  }
}

function arrayObjectIndexOf(myArray, searchTerm, property) {
  for(var i = 0, len = myArray.length; i < len; i++) {
    if (myArray[i] != undefined){
      if (myArray[i][property] === searchTerm) return i;
    }
  }
  return -1;
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
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

var contents =
'<table class="infoboks table"><tbody>'+
'<tr>'+
  '<td>Title</td><td>'+ conference["title"] +'</td>'+
'</tr>'+
'<tr>'+
  '<td>Full Title</td><td>'+ conference["full_title"] +'</td>'+
'</tr>'+
'<tr>'+
  '<td>Deadline</td>' + '<td>'+ conference["submission"] +'</td>'+
'</tr>'+
'<tr>'+
  '<td>Location</td>' + '<td>'+ conference["location"] +'</td>'+
'</tr>'+
'<tr>'+
  '<td>Date</td>' + '<td>'+ conference["date"] +'</td>'+
'</tr>'+
'<tr>'+
  '<td>Action</td>' + '<td>'+
    '<a target="_blank" href="'+ conference["url"] + '">LINK</a>'+
    '&nbsp;&nbsp;&nbsp;'+
    '<a href="javascript:void(0)" onclick="javascript:calendarEvent(\''+conference["title"]+'\')">Add to Calendar</a>'
  +'</td>'+
'</tr>'+
'<tr>'+
  '<td>Categories</td><td>'+ conference["categories"] +'</td>'+
'</tr>'
+'</tbody></table>';

  if (conference["lat"] == 0 && conference["lng"] == 0) {
    conference["contents"] = contents;
    addToList(conference);
    return;
  }

  return new google.maps.Marker({
    position: conference["geoLocation"],
    icon: "https://maps.google.com/mapfiles/ms/icons/" + icons[iconType],
    title: conference["title"].trim().toLowerCase(),
    desc: contents
  });
}

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
  oms.addListener('click', function(marker) {
    iw.setContent(marker.desc);
    iw.open(map, marker);
  });
}

$(document).ready(function() {
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

  $.getJSON( "db.json", function( data ) {
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
