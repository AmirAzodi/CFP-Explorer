var db;
var staticConferenceDB;
var cal;
var map;
var markers = [];
var oms;
var markerCluster;
var globalMaxDate;
var globalMinDate;
var defaultMaxDate;
var defaultMinDate;
var selectedStartTime;
var selectedStopTime;
var icons = {
  UNKNOWN: 'pink.png',
  KNOWN: 'blue.png',
  OK: 'yellow.png',
  GOOD: 'orange.png',
  TOP: 'green.png',
  WORKSHOP: 'W.png',
  SYMPOSIUM: 'S.png',
};

function getToday() {
  return moment.utc().startOf("day");
}

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
  var info;
  // console.log(conference["type"]);
  if (staticConferenceDB[title] != undefined) {
    var confInfo = staticConferenceDB[title];
    info = 'Publisher: ' + confInfo.type + '<br>Ranking: ' + confInfo.ranking + '<br>Tier: ' + confInfo.tier;
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
    info = 'Publisher: Unknown' + '<br>Ranking: Unknown' + '<br>Tier: Unknown';
  }
  if (conference["type"] === "Workshop") {
    iconType = "WORKSHOP";
  }
  if (conference["type"] === "Symposium") {
    iconType = "SYMPOSIUM";
  }
var contents =
'<div class="panel panel-default"><div class="panel-heading"><b>'+ conference["title"] +'</b></div>' +
'<table class="infoboks table table-condensed"><tbody>'+
'<tr>'+
  '<td><b>Info</b></td><td>'+ info +'</td>'+
'</tr>'+
'<tr>'+
  '<td><b>Full Title</b></td><td>'+ conference["full_title"] +'</td>'+
'</tr>'+
'<tr>'+
  '<td><b>Deadline</b></td>' + '<td>'+ conference["submission"] +'</td>'+
'</tr>'+
'<tr>'+
  '<td><b>Location</b></td>' + '<td>'+ conference["location"] +'</td>'+
'</tr>'+
'<tr>'+
  '<td><b>Date</b></td>' + '<td>'+ conference["date"] +'</td>'+
'</tr>'+
'<tr>'+
  '<td><b>Action</b></td>' + '<td>'+
    '<a target="_blank" href="'+ conference["url"] + '">LINK</a>'+
    '&nbsp;&nbsp;&nbsp;'+
    '<a href="javascript:void(0)" onclick="javascript:calendarEvent(\''+conference["title"]+'\')">Add to Calendar</a>'
  +'</td>'+
'</tr>'+
'<tr>'+
  '<td><b>Categories</b></td><td>'+ conference["categories"] +'</td>'+
'</tr>'
+'</tbody></table></div>';

  if (conference["lat"] == 0 && conference["lng"] == 0) {
    conference["contents"] = contents;
    addToList(conference);
    return;
  }

  return new google.maps.Marker({
    position: conference["geoLocation"],
    icon: "libs/img/" + icons[iconType],
    title: conference["title"].trim().toLowerCase(),
    desc: contents
  });
}

function placeMarkers(and) {
  var newMarkers = [];
  var type;
  var e1List = [];

  if (typeof markerCluster === 'undefined') {
    return;
  }

  $("#e1").select2("val").forEach(function(item) {
      item.split(',').forEach(function(subItem) {
        for (var key in db.conferences) {
          conference = db.conferences[key];
          if (!!~db.conferences[key].categories.indexOf(subItem)) {
            conf_location = conference["location"].toLowerCase();
            type = "Conference"
            if (conf_location === 'n/a' || conf_location === "publication" || conf_location === "online" || conf_location === "special issue") {
              type = "Journal"
            } else if (conference["full_title"].toLowerCase().indexOf("workshop") != -1) {
              type = "Workshop";
            } else if (conference["full_title"].toLowerCase().indexOf("symposium") != -1) {
              type = "Symposium";
            }
            conference["geoLocation"] = new google.maps.LatLng(conference["lat"], conference["lng"]);
            conference["type"] = type;
            e1List.push(conference);
          }
        }
      });
  });

  var e2List = [];
  $("#e2").select2("val").forEach(function(item) {
    conference = db.conferences[item.toLowerCase()];
    conf_location = conference["location"].toLowerCase();
    type = "Conference"
    if (conf_location === 'n/a' || conf_location === "publication" || conf_location === "online" || conf_location === "special issue") {
      type = "Journal"
    } else if (conference["full_title"].toLowerCase().indexOf("workshop") != -1) {
      type = "Workshop"
    } else if (conference["full_title"].toLowerCase().indexOf("symposium") != -1) {
      type = "Symposium";
    }
    conference["geoLocation"] = new google.maps.LatLng(conference["lat"], conference["lng"]);
    conference["type"] = type;
    e2List.push(conference);
  });

  var e3List = [];
  $("#e3").select2("val").forEach(function(item) {
    for (var key in db.conferences) {
      var conference = db.conferences[key];
      if (conference.country === item) {
        conf_location = conference["location"].toLowerCase();
        type = "Conference"
        if (conf_location === 'n/a' || conf_location === "publication" || conf_location === "online" || conf_location === "special issue") {
          type = "Journal"
        } else if (conference["full_title"].toLowerCase().indexOf("workshop") != -1) {
          type = "Workshop"
        } else if (conference["full_title"].toLowerCase().indexOf("symposium") != -1) {
          type = "Symposium";
        }
        conference["geoLocation"] = new google.maps.LatLng(conference["lat"], conference["lng"]);
        conference["type"] = type;
        e3List.push(conference);
      }
    }
  });

  if (and) {
    newConfs = e1List.filter( function( el ) {
      if (el != undefined) {
        return arrayObjectIndexOf(e3List, el.title, "title") != -1;
      }
    }).concat(e2List);
  } else {
    newConfs = e1List.concat(e2List).concat(e3List);
  }

  var newMinDate = undefined;
  var newMaxDate = undefined;

  if (newConfs.length > 0) {
    newConfs.forEach(function(item) {
      if (newMaxDate == undefined || newMaxDate.isBefore(item.submissionDate)) {
          newMaxDate = item.submissionDate;
      }

      if (newMinDate == undefined || item.submissionDate.isBefore(newMinDate)) {
        newMinDate = item.submissionDate;
      }
    });

    var currentDate = getToday();

    if (newMinDate.isBefore(currentDate)) {
      newMinDate = currentDate;
    }

    if (!globalMinDate.isSame(newMinDate) || !globalMaxDate.isSame(newMaxDate)) {
      udpateDateSliderRange(newMinDate, newMaxDate);
    }
  } else {
    if (!globalMinDate.isSame(defaultMinDate) || !globalMaxDate.isSame(defaultMaxDate)) {
      udpateDateSliderRange(defaultMinDate, defaultMaxDate);
    }
  }

  newConfs = newConfs.filter(function (el) {
    return (el.submissionDate.isAfter(selectedStartTime) || el.submissionDate.isSame(selectedStartTime)) && (el.submissionDate.isBefore(selectedStopTime) || el.submissionDate.isSame(selectedStopTime));
  });

  newConfs.forEach(function(item) {
    if (arrayObjectIndexOf(newMarkers, item.title.trim().toLowerCase(), "title") == -1) {
      newMarkers.push(makeMarker(item));
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
    markerCluster.addMarker(m);
  });

  depMarkers = [];
  markers.filter( function( el ) {
    if (el != undefined) {
      return arrayObjectIndexOf(newMarkers, el.title, "title") < 0;
    }
  }).forEach(function(m){
      m.setMap(null);
      delete markers[arrayObjectIndexOf(markers, m.title, "title")];
      oms.removeMarker(m);
      depMarkers.push(m);
  });
  markerCluster.removeMarkers(depMarkers);
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
          $.fancybox(conference["contents"]);
        }
      )
    );
  }
  $("#cool").show();
}

function updateDateRange(startTime, stopTime) {
  selectedStartTime = startTime;
  selectedStopTime = stopTime;

  $("#cool div").empty();
  if ($('#toAND').is(":checked"))
  {
    placeMarkers(true);
    $("#cool").hide();
  } else {
    placeMarkers(false);
  }

  $("#date_slider_label").text(startTime.format("MMM D YYYY") + " - " + stopTime.format("MMM D YYYY"));
}

function udpateDateSliderRange(startTime, stopTime) {
  globalMinDate = startTime;
  globalMaxDate = stopTime;

  if (defaultMinDate == undefined) {
    defaultMinDate = globalMinDate;
    defaultMaxDate = globalMaxDate;
  }

  var currentDate = getToday();

  var selectionStartTime = startTime;
  var selectionMaxTime = stopTime;

  if (selectedStopTime != undefined) {
    if (selectedStopTime.isBefore(selectionMaxTime)) {
      selectionMaxTime = selectedStopTime;
    }
  }

  if (selectedStartTime != undefined) {
    if (selectedStartTime.isAfter(selectionStartTime)) {
      selectionStartTime = selectedStartTime;
    }
  }

  var startTimeSpan = moment.duration(currentDate.diff(startTime));
  var maxTimeSpan = moment.duration(stopTime.diff(currentDate));

  var selectedStartTimeSpan = moment.duration(selectionStartTime.diff(currentDate));
  var selectedMaxTimeSpan = moment.duration(selectionMaxTime.diff(currentDate));

  $("#date_slider").slider({
      range: true,
      min: 0,
      max: maxTimeSpan.asDays() ,
      values: [ selectedStartTimeSpan.asDays(), selectedMaxTimeSpan.asDays() ],
      slide: function( event, ui ) {
        var start = ui.values[0];
        var stop = ui.values[1];
        var startTime = getToday();
        var stopTime = getToday();

        startTime = startTime.add(start, 'days');
        stopTime = stopTime.add(stop, 'days');

        updateDateRange(startTime, stopTime);
      }
    });

    updateDateRange(selectionStartTime, selectionMaxTime);
}

function initialize() {
  var mapCanvas = document.getElementById('map_canvas');
  var mapOptions = {
    center: new google.maps.LatLng(38.150160, 12.728289),
    zoom:3,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    styles: [{"featureType":"all","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"administrative.country","elementType":"labels","stylers":[{"visibility":"on"}]},{"featureType":"administrative.province","elementType":"labels.text","stylers":[{"visibility":"off"}]},{"featureType":"administrative.locality","elementType":"labels.text","stylers":[{"visibility":"simplified"}]},{"featureType":"landscape","elementType":"all","stylers":[{"visibility":"on"},{"color":"#f3f4f4"}]},{"featureType":"landscape.man_made","elementType":"geometry","stylers":[{"weight":0.9},{"visibility":"off"}]},{"featureType":"poi.park","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#83cead"}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"on"},{"color":"#ffffff"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"on"},{"color":"#fee379"}]},{"featureType":"road.arterial","elementType":"all","stylers":[{"visibility":"on"},{"color":"#fee379"}]},{"featureType":"water","elementType":"all","stylers":[{"visibility":"on"},{"color":"#7fc8ed"}]}]
  };

  map = new google.maps.Map(mapCanvas, mapOptions)

  oms = new OverlappingMarkerSpiderfier(map, {
    keepSpiderfied: true,
    circleSpiralSwitchover: Infinity,
    markersWontMove: true,
    markersWontHide: true
  });

  // var mcOptions = {};
  var mcOptions = {gridSize: 10, maxZoom: 5,zoomOnClick: false,enableRetinaIcons:true};
  markerCluster = new MarkerClusterer(map, [], mcOptions);

  var iw = new google.maps.InfoWindow();
  oms.addListener('click', function(marker) {
    iw.setContent(marker.desc);
    iw.open(map, marker);
  });
}

$(document).ready(function() {
  google.maps.event.addDomListener(window, 'load', initialize);

  $("#inline-faq").click(function() {
    $.get("faq.html", function(data) {
      $.fancybox(data, {
        title : 'FAQ'
      });
    });
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

      var submissionDate = moment.utc(db.conferences[key].submission, "MMM D, YYYY");
      var minDate;
      var maxDate;

      db.conferences[key].submissionDate = submissionDate;

      if (maxDate == undefined || maxDate.isBefore(submissionDate)) {
        maxDate = submissionDate;
      }

      if (minDate == undefined || submissionDate.isBefore(minDate)) {
        minDate = submissionDate;
      }
    }

    var currentDate = getToday();

    if (minDate.isBefore(currentDate)) {
      minDate = currentDate;
    }

    udpateDateSliderRange(minDate, maxDate);

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
    if ($('#toAND').is(":checked"))
    {
      placeMarkers(true);
      $("#cool").hide();
    } else {
      placeMarkers(false);
    }
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });

  $("#e2").click(function() {
    if ($('#toAND').is(":checked"))
    {
      placeMarkers(true);
      $("#cool").hide();
    } else {
      placeMarkers(false);
    }
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });

  $("#e3").click(function() {
    if ($('#toAND').is(":checked"))
    {
      placeMarkers(true);
      $("#cool").hide();
    } else {
      placeMarkers(false);
    }
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });

  $("#listClose").click(function() {
    $("#cool").hide();
  });

  $("#toAND").change(function() {
    if ($("#toAND").is(":checked")) {
      placeMarkers(true);
      $("#cool").hide();
    } else {
      placeMarkers(false);
    }
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });
});