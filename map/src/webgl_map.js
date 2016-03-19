/**
 * Created by yarden on 1/25/16.
 */

var STATE = 'ca';

var value = 1;
var day = -1;
var radius = 2500;
var max_pop = 200000;
var countyPop = {};
var county_cases = {};
var geojson;

var color = d3.scale.threshold()
  .domain([0.0001, 0.01, 0.02, 0.03, 0.04, 0.05])
  .range(['white', "#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"]);

//var baseURL = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
var baseURL = 'https://api.tiles.mapbox.com/v4/{mapid}/{z}/{x}/{y}.png?access_token={apikey}';

var options = {
  apikey: 'pk.eyJ1IjoieWFyZGVuIiwiYSI6ImM5NzdkZTdhZTBlOWFmNDlkM2M1MmEyY2M1NjkzOTg3In0.VZytH8boHpDX-J9PaxDjpA',
  mapid: 'yarden.mi9kei3m'
};

var base = L.tileLayer(baseURL, options);

var map = L.map('map', {layers: [base]}).setView([41.1459, -104.833], 6);

L.control.scale().addTo(map);

//custom size for this example, and autoresize because map style has a percentage width
var heatmap = new L.WebGLHeatMap({
  size: radius,
  //autoresize: true,
  alphaRange: 1,
  units: 'm',
  intensityToAlpha:true,
  //gradientTexture: true,
  //gradientTexture:'assets/deep-sea-gradient.png'
  //gradientTexture: 'assets/skyline-gradient.png'
});


//var popmap = new L.WebGLHeatMap({
//  size: 5000,
//  //autoresize: true,
//  alphaRange: 0.001,
//  units: 'm'
//  //gradientTexture: true
//});
//map.addLayer(popmap);

var cases = {};
var zip2county = {};

queue()
  .defer(d3.json, 'assets/us.json')
  //.defer(d3.csv, 'data/'+STATE+'-cases.csv')
  .defer(d3.csv, 'assets/zip_county.csv', function(d) { zip2county[d.zip] = +d.county;})
  .defer(d3.csv, 'data/'+STATE+'-county_pop.csv', function(d) { countyPop[+d.county] = +d.pop; max_pop = Math.max(max_pop, +d.pop); })

  .await( function(error, topology, list) {
    if (error) throw error;

    //list.forEach(function (row) {
    //  var t = Math.floor((+row.time) / 86400);
    //  var day_list = cases[t];
    //  if (!day_list) {
    //    cases[t] = day_list = [];
    //  }
    //  day_list.push([+row.lat, +row.lon, row.zip]);
    //});

    geojson = L.geoJson(topojson.feature(topology, topology.objects.counties).features, {style: style}).addTo(map);
    map.addLayer(heatmap);

    console.log('ready');

    d3.select('#day');
});

//d3.csv('assets/county_pop.csv', function(row) {
//    row.pop = +row.pop;
//    return row;
//  },
//  function (rows) {
//    popmap.setData(rows);
//  }
//);


d3.select('#day')
  .on('input', function () {
    var d = +this.value;
    d3.select('#day-value').text(d);

    show_day(d);
  })
  .property('value', 1);

d3.select('#value')
  .property('value', value*100)
  .on('input', function () {
    value = +this.value/100;
    d3.select('#value-value').text(value);
    redraw();
  });

d3.select('#radius')
  .property('value', radius)
  .on('input', function () {
    var size = +this.value;
    d3.select('#radius-value').text(size);
    heatmap.options.size = size;
    redraw();
  });


var cache = {};

function get_cases(day) {
  //var id = 10*Math.floor(day/10), to = from+10;
  var id = day;
  var p = cache[id] || (cache[id] = new Promise(function(resolve, reject) {
    if (cases[day]) {
      resolve(cases[day]);
    } else {
      console.log('loading ', 'data/'+STATE+'-cases-'+id+'.csv');
      d3.csv('data/'+STATE+'-cases-'+id+'.csv', function(rows) {
        cases[day] = [];
        if (rows) {
          rows.forEach(function (row) {
            //d = Math.floor((+row.time) / 86400);
            cases[day].push([+row.lat, +row.lon, row.zip, +row.county]);
          });
        }
        resolve(cases[day]);
      });
    }
  }));
  return p;
}

function show_day(current) {
  if (current != day) {
    day = current;

    get_cases(current).then(function (list) {
      if (day == current) {
        county_cases = {};
        if (cases[current]) {
          cases[current].forEach(function (d) {
            //var county = zip2county[d[2]];
            var county = d[3];
            if (county) {
              county_cases[county] = (county_cases[county] || 0) + 1;
            }
          });
        }
        d3.select('#cases').text(cases[current].length);
        console.log('day:', current, ' cases:', cases[current].length);
        geojson.setStyle(style);
        redraw();
      }
    });
  }
}

var max_rate = 0;

function redraw() {
  if (cases[day]) {
    max_rate =0;
    heatmap.clear();
    cases[day].forEach(function (a) {
      heatmap.addDataPoint(a[0], a[1], value);// intensity);
    });
    heatmap.draw();
    //heatmap.setData(cases[day])
  }
}


function style(feature) {
  var rate = (county_cases[feature.id] || 0) / (countyPop[feature.id] || 1);

  if (rate > max_rate) {
    max_rate = rate;
    console.log('rate: ',max_rate);
  }
  //if (feature.id == "06037"/*56041*/) {
  //  console.log('country: ', feature.id, rate, //color(countyPop[feature.id] / max_pop),
  //    ' cases:', county_cases[feature.id], 'pop:', countyPop[feature.id], (county_cases[feature.id] || 0) / (countyPop[feature.id] || 1));
  //}

  return {
    fillColor: color(rate), //color((countyPop[feature.id] || 1) / max_pop),
    weight: 1,
    opacity: 0,
    color: 'black',
    //dashArray: '3',
    fillOpacity: rate < 0.0005 ? 0 : 0.7
  };
}
