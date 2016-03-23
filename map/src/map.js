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

var PREFIX = 'W';

var countyPop = {};
var data;
var day = 0;
var age_visibility = [true, true, true, true, true, true];

var CMAP_MAX_RATE = 0.02;
var CMAP_LEVELS = 8;
var CMAP_COLORS = colorbrewer.YlOrRd;
var CMAP = CMAP_COLORS[CMAP_LEVELS];

var color = d3.scale.threshold()
    .range(CMAP);

var bin = d3.scale.threshold()
  .range(d3.range(8));

function update_cmap(levels) {
  CMAP_LEVELS = levels;
  CMAP = CMAP_COLORS[CMAP_LEVELS];
  var f = CMAP_MAX_RATE/levels;
  color.domain(d3.range(f, CMAP_MAX_RATE+f, f));
  bin.domain(d3.range(f, CMAP_MAX_RATE+f, f));
}

function update_legend(div) {
  div = div || L.DomUtil.get('.info .legend');
  var n = CMAP.length;

  div.innerHTML += '<b>Rate (%)</b><br>';
  var f = 100*CMAP_MAX_RATE/n;
  var values = d3.range(f, 100*CMAP_MAX_RATE+f, f);
  for (var i = 0; i < values.length; i++) {
    div.innerHTML += '<i style="background:' + CMAP[i] +'"></i> '
      + (i == 0   ? '< ' + values[0] :
        i == values.length-1 ?  '+ ' + values[i-1]  :
        values[i-1] + ' - ' + values[i])
      + '<br>';
  }
}

update_cmap(CMAP_LEVELS);

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
  .fitBounds([[26, -124], [50, -67]]);
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

  if (!id || !data || !data[day] || !data[day].counties[id]) {
    //this._div.innerHTML += Hover over a county';
  } else {
    var county = data[day].counties[id];
    var pop = countyPop[id];
    var rate = county && pop && county.cases / pop || 0;

    this._div.innerHTML += '<b>' + id + '</b> pop:' + pop+'<br/>cases:' + county.cases + ' rate: ' + Math.floor(1000*county.cases/pop)/10 + '%';
  }
};

info.addTo(map);

var legend = L.control({position: 'bottomright'});

function format(v) {
  return Math.floor(1000*v)/10;
}

legend.onAdd = function (map) {
  var div = L.DomUtil.create('div', 'info legend');
  update_legend(div);
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
    dashArray: ''
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
  var rate = 0;
  if (data) {
    var county = data[day].counties[feature.id];
    var pop = countyPop[feature.id];

    if (county && pop) {
      var n = 0;
      for (var i = 0; i < AGE_GROUPS.length; i++) {
        if (age_visibility[i])
          n += county.age[i];
      }
      rate =  n / pop;
    }
  }

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
    renderTo: document.querySelector('#cases-chart'),
    type: 'area',
    zoomType: 'x',
    height: 150,
    width: 600
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
  tooltip: {
    crosshairs: true,
    shared: true
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

var rateChart = new Highcharts.Chart({
  chart: {
    renderTo: document.querySelector('#rate-chart'),
    type: 'line',
    zoomType: 'x',
    height:150,
    width: 300
  },
  title: 'null',
  xAxis: {
    title: { text: 'Day'},
    tickInterval: 1,
    plotLines: [total_line]
  },
  yAxis: {
    title: {text: 'Rate (%)'},
    tickInterval: 1
  },
  tooltip: {
    crosshairs: true,
    shared: true,
    valueSuffix: '%',
    formatter: function () {
      var s = '<b>Day ' + this.x + '</b>';
      this.points.forEach( function (p) {
        s += '<br/>' + p.series.name + ': ' + Math.floor(10*p.y)/10 + '%';
      });

      return s;
    }
  },
  legend: {
    enabled: false
  },
  series: []
});

var histogramChart = new Highcharts.Chart({
  chart: {
    renderTo: document.querySelector('#histogram-chart'),
    type: 'column',
    zoomType: 'x',
    height:150,
    width: 300
  },
  title: 'null',
  xAxis: {
    title: { text: 'Rate'}
  },
  yAxis: {
    min: 0,
    title: {text: '# of counties'}
    //tickInterval: 1
  },
  //tooltip: {
  //  crosshairs: true,
  //  shared: true,
  //  valueSuffix: '%',
  //  formatter: function () {
  //    var s = '<b>Day ' + this.x + '</b>';
  //    this.points.forEach( function (p) {
  //      s += '<br/>' + p.series.name + ': ' + Math.floor(10*p.y)/10 + '%';
  //    });
  //
  //    return s;
  //  }
  //},

  plotOptions: {
    column: {
      pointPadding: 0.2,
      borderWidth: 0,
      animation: false
    }
  },
  legend: {
    enabled: false
  },
  series: []
});

/*
 * Data
 */


queue()
  .defer(d3.json, 'assets/us.json')
  .defer(d3.text, 'assets/datasets.txt')
  .await( function(error, topology, list) {
    if (error) throw error;

    d3.select('#dataset').selectAll('option')
      .data(['choose'].concat(list.trim().split('\n')))
      .enter()
      .append('option')
      .attr('value', function(d) { return d;})
      .text(function(d) { return d;});

    geojson = L.geoJson(topojson.feature(topology, topology.objects.counties).features, {style: style, onEachFeature: onEachFeature}).addTo(map);
  });


function load(file) {
  queue()
    .defer(d3.json, 'data/' + file + '/cases_per_day.json')
    .defer(d3.csv, 'data/' + file + '/county_pop.csv', function (d) {countyPop[+d.county] = +d.pop; })
    .await(function (error, list) {
      if (error) throw error;

      data = list;

      var last = 0;
      var max = 0;
      var max_rate = 0;
      var total_series = [];
      var age_series = [[], [], [], [], [], []];
      var rate_series = [];
      var county_rate_series = [];
      var county_avg_series = [];
      var i, j, k;

      for (i in data) {
        var n = data[i].cases;
        total_series[i] = n;
        if (n > max) max = n;
        if (i > last) last = i;

        var county_max_rate = 0, county_avg_rate = 0, county_avg_n = 0;
        var counts = [0, 0, 0, 0, 0, 0];
        var counties = data[i].counties;
        for (j in counties) {
          // cases
          var groups = counties[j].age;
          for (k = 0; k < 6; k++) {
            counts[k] += groups[k] || 0;
          }

          // rate
          var r = 100*counties[j].cases/countyPop[j];
          if (r > county_max_rate) county_max_rate = r;
          if (r > 0) {
            county_avg_rate += r;
            county_avg_n++;
          }
        }

        if (county_max_rate > max_rate) max_rate = county_max_rate;
        county_rate_series.push(county_max_rate);
        county_avg_series.push(county_avg_rate/county_avg_n);

        for (k = 0; k < 6; k++) {
          age_series[k].push([i, counts[k]]);
        }
      }

      for (i=rateChart.series.length-1; i>= 0; i--) {
        rateChart.series[i].remove();
      }
      rateChart.addSeries({name: 'Max', data: county_rate_series});
      rateChart.addSeries({name: 'Avg', data: county_avg_series});


      for (i=chart.series.length-1; i>= 0; i--) {
        chart.series[i].remove();
      }
      chart.addSeries({name: 'Total', type: 'line', data: total_series});
      for (k = 0; k < 6; k++) {
        chart.addSeries({name: AGE_GROUPS[5 - k], data: age_series[5 - k]})
      }

      chart.yAxis[0].setExtremes(0, max);
      //rateChart.yAxis[0].setExtremes(0, max_rate);

      d3.select('#day').property('max', last);
    });
}

d3.select('#dataset').on('change', function() { load(this.value); });

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
  rateChart.xAxis[0].update();
  geojson.setStyle(style);

  var n = 0;
  var counties = data[day].counties;
  var rates = [];
  for (var i in counties) {
    var c = counties[i].cases;
    n += c;
    if (countyPop[i])
      rates.push(c/countyPop[i]);
  }

  var bins = Array(8).fill(0);
  rates.forEach(function(rate) {
    bins[bin(rate)]++;
  });

  bins = bins.map(function(v, i) {
    return {x:i*CMAP_MAX_RATE/8, y:v};
  });
  if (histogramChart.series.length > 0)
    histogramChart.series[0].remove();

  histogramChart.addSeries({name: 'histogram', data: bins, color: '#000000'});
  d3.select('#cases').text(n);
}
