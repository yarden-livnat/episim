/**
 * Created by yarden on 1/25/16.
 */

var AGE_GROUPS = [
  '     < 1 Infants',
  ' 1 -  5 Toddlers',
  ' 6 -12 Kids',
  '13-18 Teens',
  '19-64 Adults',
  '   +64  Elderly'];

var PREFIX = 'ca';

var countyPop = {};
var data;
var day = 0;
var age_visibility = [true, true, true, true, true, true];

var color = d3.scale.threshold()
  .domain([0.01, 0.02, 0.03, 0.04])
  .range(["#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"]);

/*
 * Map
 */
var geojson;

//var baseURL = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
var baseURL = 'https://api.tiles.mapbox.com/v4/{mapid}/{z}/{x}/{y}.png?access_token={apikey}';

var options = {
  apikey: 'pk.eyJ1IjoieWFyZGVuIiwiYSI6ImM5NzdkZTdhZTBlOWFmNDlkM2M1MmEyY2M1NjkzOTg3In0.VZytH8boHpDX-J9PaxDjpA',
  mapid: 'yarden.mi9kei3m'
};

var base = L.tileLayer(baseURL, options);

var map = L.map('map', {layers: [base]})
  .fitBounds([[32.0, -124], [42, -114]]);
  //.setView([37.8, -96], 4);

L.control.scale().addTo(map);

var info = L.control();

info.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
  this.update();
  return this._div;
};

// method that we will use to update the control based on feature properties passed
info.update = function (id) {
  this._div.innerHTML = '<h4>Infected people</h4>';

  if (!id || !data[day].counties[id]) {
    //this._div.innerHTML += Hover over a county';
  } else {
    var county = data[day].counties[id];
    var pop = countyPop[id];
    var rate = county && pop && county.cases / pop || 0;

    this._div.innerHTML += '<b>' + id + '</b><br />' + county.cases + ' of ' + pop;
  }
};

info.addTo(map);

var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
  var div = L.DomUtil.create('div', 'info legend');
  var domain = color.domain();
  var range = color.range();
  var n = domain.length;

  div.innerHTML += '<b>Rate</b><br>';
  for (var i = 0; i < n+1; i++) {
    div.innerHTML += '<i style="background:' + range[i] +'"></i> '
      + (i == 0   ? '< '+domain[i] :
        i == n ? '+ '+ domain[i-1] :
        domain[i-1] + ' - ' + domain[i])
      + '<br>';
  }

  return div;
};

legend.addTo(map);

var total_line = {
  color: 'gray',
  value: 0,
  width: 1,
  events: {

  }
};

var max_rate = 0;


function highlightFeature(e) {
  var layer = e.target;

  //console.log(e.latlng);
  layer.setStyle({
    weight: 1,
    //color: '#666',
    dashArray: '',
    //fillOpacity: 0.7
  });

  if (!L.Browser.ie && !L.Browser.opera) {
    layer.bringToFront();
  }

  info.update(layer.feature.id);
}

function resetHighlight(e) {
  geojson.resetStyle(e.target);
  info.update();
}

function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });
}

function style(feature) {
  var county = data[day].counties[feature.id];
  var pop = countyPop[feature.id];

  var rate = 0;
  if (county && pop) {
    var n = 0;
    for (var i = 0; i < AGE_GROUPS.length; i++) {
      if (age_visibility[i])
        n += county.age[i];
    }
    rate =  n / pop;
  }

  //if (rate > max_rate) {
  //  max_rate = rate;
  //  console.log('rate: ',max_rate);
  //}

  return {
    fillColor: color(rate),
    weight: 0.25,
    opacity: rate && 1 || 0,
    color: 'gray',
    //dashArray: '3',
    fillOpacity: rate && 0.7 || 0
  };
}

/*
 * Chart
 */
var chart = new Highcharts.Chart({
  chart: {
    renderTo: document.querySelector('#chart'),
    type: 'area',
    height: 250,
    width: 700
  },
  title: null,
  xAxis: {
    title: { text: 'day'},
    tickInterval: 1,
    plotLines: [total_line]
  },
  yAxis: {
    title: {text: '# cases'}
  },
  legend: {
    layout: 'vertical',
    align: 'right',
    verticalAlign: 'middle',
    //borderWidth: 0
    itemStyle: {
      whiteSpace: 'pre'
    }
  },
  plotOptions: {
    area: {
      stacking: 'normal',
      lineColor: '#666666',
      lineWidth: 1,
      marker: {
        lineWidth: 1,
        lineColor: '#666666'
      }
    },
    series: {
      events: {
        legendItemClick: function (event) {
          age_visibility[6-event.target._i] = !age_visibility[6-event.target._i];
          geojson.setStyle(style);
        }
      }
    }
  },

  series: []
});

/*
 * Data
 */
queue()
  .defer(d3.json, 'assets/us.json')
  .defer(d3.json, 'assets/'+PREFIX+'-cases_per_day.json')
  .defer(d3.csv,  'assets/'+PREFIX+'-county_pop.csv', function(d) { countyPop[+d.county] = +d.pop; })

  .await( function(error, topology, list) {
    if (error) throw error;

    data = list;

    var last = 0;
    var max = 0;
    var total_series = [];
    var age_series = [[], [], [], [], [], []];
    var i, j, k;

    for (i in data) {
      var n = data[i].cases;
      total_series[i] = n;
      if (n > max) max = n;
      if (i > last) last = i;

      var counts = [0, 0, 0, 0, 0, 0];
      var counties = data[i].counties;
      for (j in counties) {
        var groups = counties[j].age;
        for ( k=0; k<6; k++) {
          counts[k] += groups[k] || 0;
        }
      }
      for (k=0; k<6; k++) {
        age_series[k].push(counts[k]);
      }
    }

    chart.addSeries({name:'Total', type: 'line', data:total_series});
    for (k=0; k<6; k++) {
      chart.addSeries({name: AGE_GROUPS[5-k], data: age_series[5-k]})
    }

    chart.yAxis[0].setExtremes(0, max);

    d3.select('#day').property('max', last);
    geojson = L.geoJson(topojson.feature(topology, topology.objects.counties).features, {style: style, onEachFeature: onEachFeature}).addTo(map);

    d3.select('#day');
  });


d3.select('#day')
  .on('input', function () {
    var d = +this.value;
    d3.select('#day-value').text(d);

    show_day(d);
  })
  .property('value', 0);


function show_day(current) {
  day = current;
  total_line.value = day;
  chart.xAxis[0].update();
  geojson.setStyle(style);

  var n = 0;
  var counties = data[day].counties;
  for (var i in counties) {
    n += counties[i].cases;
  }
  d3.select('#cases').text(n);
}
