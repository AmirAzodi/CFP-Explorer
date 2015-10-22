var db;
var staticConferenceDB;
var cal;
var map;
var markers = [];
var Lmarkers = L.markerClusterGroup({
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: true,
  zoomToBoundsOnClick: true
});

var icons = {
  UNKNOWN: ['c','#FF7468'],
  KNOWN: ['c','#9079FC'],
  OK: ['c','#FCF357'],
  GOOD: ['c','#FFB100'],
  TOP: ['c','#65BA4A'],
  WORKSHOP: ['w','#BCBCBC'],
  SYMPOSIUM: ['s','#8FBBE4']
};



window.addEventListener("beforeunload", function (e) {
    var confirmationMessage = 'Warning: If you leave this page, your CFP searches will be lost.';

    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
});

function getToday() {
  return moment.utc().startOf("day");
}

var resizeMap = function() {
  $('div#open_street_map').css('margin-top', ($('nav').height()) + 'px');
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
  for (var i = 0, len = myArray.length; i < len; i++) {
    if (myArray[i] != undefined) {
      if (myArray[i][property] === searchTerm) return i;
    }
  }
  return -1;
}

function arrayObjectIndexOfwithOptions(myArray, searchTerm, property) {
  for (var i = 0, len = myArray.length; i < len; i++) {
    if (myArray[i] != undefined) {
      if (myArray[i]["options"][property] === searchTerm) return i;
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
  if (staticConferenceDB[title] != undefined) {
    var confInfo = staticConferenceDB[title];
    info = 'Publisher: ' + confInfo.type + '<br>Ranking: ' + confInfo.ranking + '<br>Tier: ' + confInfo.tier;
    if (confInfo.tier === "A") {
      iconType = "TOP";
    } else if (confInfo.tier === "B") {
      iconType = "GOOD";
    } else if (confInfo.tier === "C") {
      iconType = "OK";
    } else if (confInfo.ranking != "Unknown") {
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
    '<div class="panel panel-default"><div class="panel-heading"><b>' + conference["title"] + '</b></div>' +
    '<table class="infoboks table table-condensed"><tbody>' +
    '<tr>' +
    '<td><b>Info</b></td><td>' + info + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>Full Title</b></td><td>' + conference["full_title"] + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>Deadline</b></td>' + '<td>' + conference["submission"] + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>Location</b></td>' + '<td>' + conference["location"] + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>Date</b></td>' + '<td>' + conference["date"] + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>Action</b></td>' + '<td>' +
    '<a target="_blank" href="' + conference["url"] + '">LINK</a>' +
    '&nbsp;&nbsp;&nbsp;' +
    '<a href="javascript:void(0)" onclick="javascript:calendarEvent(\'' + conference["title"] + '\')">Add to Calendar</a>' + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>Categories</b></td><td>' + conference["categories"] + '</td>' +
    '</tr>' + '</tbody></table></div>';

  if (conference["lat"] == 0 && conference["lng"] == 0) {
    conference["contents"] = contents;
    addToList(conference);
    return;
  }

  return Lmarker = L.marker(conference["geoLocation"], {
    icon: L.mapbox.marker.icon({
      'marker-size': 'large',
      'marker-symbol': icons[iconType][0],
      'marker-color': icons[iconType][1]
    }),
    title: title
  }).bindPopup(contents);
}

function placeMarkers(and) {
  var newMarkers = [];
  var type;

  var e1List = [];
  var e1vals = $("#e1").val() || [];
  var e2List = [];
  var e2vals = $("#e2").val() || [];
  var e3List = [];
  var e3vals = $("#e3").val() || [];

  e1vals.forEach(function(item) {
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
          conference["geoLocation"] = [conference["lat"], conference["lng"]];
          conference["type"] = type;
          e1List.push(conference);
        }
      }
    });
  });

  e2vals.forEach(function(item) {
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
    conference["geoLocation"] = [conference["lat"], conference["lng"]];
    conference["type"] = type;
    e2List.push(conference);
  });

  e3vals.forEach(function(item) {
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
        conference["geoLocation"] = [conference["lat"], conference["lng"]];
        conference["type"] = type;
        e3List.push(conference);
      }
    }
  });

  if (and) {
    newConfs = e1List.filter(function(el) {
      if (el != undefined) {
        return arrayObjectIndexOf(e3List, el.title, "title") != -1;
      }
    }).concat(e2List);
  } else {
    newConfs = e1List.concat(e2List).concat(e3List);
  }


  var selectedDate = $('#datetimepicker').data("date");
  if (selectedDate != undefined && selectedDate != "" ) {
    selectedDate = moment.utc(selectedDate, "MMM D, YYYY");
  } else {
    selectedDate = moment.utc("Jan 1, 2020", "MMM D, YYYY");
  }

  newConfs.forEach(function(item) {
    if (arrayObjectIndexOfwithOptions(newMarkers, item.title.trim().toLowerCase(), "title") == -1) {
      var submissionDate = moment.utc(item.submission, "MMM D, YYYY");
      if (submissionDate.isBefore(selectedDate) || submissionDate.isSame(selectedDate)) {
        newMarkers.push(makeMarker(item));
      }
    }
  });

  console.log(newMarkers.length)
  addMarkers = [];
  newMarkers.filter(function(el) {
    return (el != undefined);
  }).forEach(function(m) {
    addMarkers.push(m);
  });

  Lmarkers.clearLayers();
  Lmarkers.addLayers(addMarkers);
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
      .click(function() {
        $.fancybox(conference["contents"]);
      })
    );
  }

  $("#cool").show();
}

function toggleListVisibility(checkbox) {
  if (checkbox.is(":checked")) {
    $("#cool").css('visibility', 'hidden');
  } else {
    $("#cool").css('visibility', 'visible');
  }
}

function init() {
  // Provide your access token
  L.mapbox.accessToken = 'pk.eyJ1IjoiYXNhem9kaSIsImEiOiJjaWZ6YWJlZWcwMmpvdTNsenB3bnduOHc3In0.S0hG0iZ2b6HYki1fIxRceA';
  // Create a map in the div #map
  map = L.mapbox.map('open_street_map', 'mapbox.streets', {
    maxZoom: 5,
    minZoom: 3
  }).setView([40.008279, -12.574008], 3);
  map.addLayer(Lmarkers);
}

$(document).ready(function() {

  $('#datetimepicker').datetimepicker({
    // defaultDate: "Jan 1, 2020",
    format: 'MMM D, YYYY'
  });

  $("#datetimepicker").on("dp.change", function (e) {
    if ($('#toAND').is(":checked")) {
      placeMarkers(true);
      $("#cool").hide();
    } else {
      placeMarkers(false);
    }
  });

  $("#inline-faq").click(function() {
    $.get("faq.html", function(data) {
      $.fancybox(data, {
        title: 'FAQ'
      });
    });
  });

  $("#e1").select2({
    placeholder: "Categories",
    // allowClear: true,
    theme: "bootstrap"
  });

  $("#e2").select2({
    placeholder: "Conferences",
    // allowClear: true,
    theme: "bootstrap"
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
    placeholder: "Countries",
    // allowClear: true,
    theme: "bootstrap"
  });

  $.getJSON("db.json", function(data) {
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
      if (country != undefined && country != "Unknown") {
        listOfCountries.push(country);
      }
    }

    listOfCountries.filter(onlyUnique).forEach(function(country) {
      countrySelector.append(new Option(country, country));
    });
    $("#conference_count").html(count);
  });

  $.getJSON("ui-categories.json", function(data) {
    selector1 = $("#e1");
    for (var key in data["categories"]) {
      selector1.append(new Option(key, data["categories"][key]));
    }
  });

  $.getJSON("conference-repo.json", function(data) {
    staticConferenceDB = data["conferences"];
  });

  $("#e1").on("change", function() {
    $("#cool div").empty();
    if ($('#toAND').is(":checked")) {
      placeMarkers(true);
      $("#cool").hide();
    } else {
      placeMarkers(false);
    }
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });

  $("#e2").on("change", function() {
    if ($('#toAND').is(":checked")) {
      placeMarkers(true);
      $("#cool").hide();
    } else {
      placeMarkers(false);
    }
    if ($("#cool div label").length == 0) {
      $("#cool").hide();
    }
  });

  $("#e3").on("change", function() {
    if ($('#toAND').is(":checked")) {
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

  $('nav').resize(resizeMap);

  $("#hide-list").change(function() {
    toggleListVisibility($(this));
  });
});
