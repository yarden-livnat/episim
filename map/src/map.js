/**
 * Created by yarden on 1/25/16.
 */

//var AGE_GROUPS = [
//  '     < 1 Infants',
//  ' 1 -  5 Toddlers',
//  ' 6 -12 Kids',
//  '13-18 Teens',
//  '19-64 Adults',
//  '   +64  Elderly'];

var AGE_GROUPS = [
  '     < 1',
  ' 1 -  5',
  ' 6 -12',
  '13-18',
  '19-64',
  '   +64'];

var PREFIX = 'W';
var PLAY_INTERNAL = 200;

var countyPop = {};
var data;
var day = 0;
var play = false;
var age_visibility = [true, true, true, true, true, true];
//var svgsaver = new SvgSaver();

var day_format = d3.format('>3d');
var cases_format = d3.format('>9,d');

var CMAP_MAX_RATE = 0.03;
var CMAP_LEVELS = 7;
var CMAP_COLORS = colorbrewer.YlOrRd;
var CMAP = CMAP_COLORS[CMAP_LEVELS];

var color = d3.scale.threshold()
    .range(CMAP);

var bin = d3.scale.threshold()
  .range(d3.range(9));

function update_cmap(levels) {
  CMAP_LEVELS = levels;
  CMAP = CMAP_COLORS[CMAP_LEVELS];
  var f = CMAP_MAX_RATE/(levels-1);
  color.domain(d3.range(f, CMAP_MAX_RATE+f, f)).range(CMAP);
  bin.domain(color.domain()).range(d3.range(color.domain().length+1));
}

function update_legend(div) {
  div = div || legend._container;
  var n = CMAP.length;

  div.innerHTML = '<b>Rate (%)</b><br>';
  var values = color.domain().map(function(v) { return Math.floor(10000*v)/100});
  values.push(values[values.length-1]);
  for (var i = values.length-1; i >= 0 ; i--) {
    div.innerHTML += '<i style="background:' + CMAP[i] +'"></i> '
      + (i == 0   ? '< ' + values[0] :
        i == values.length-1 ?  '+ ' + values[i-1]  :
        values[i-1] + ' - ' + values[i])
      + '<br>';
  }
}

update_cmap(CMAP_LEVELS);

d3.select('#levels')
  .on('change', function() {
    console.log('change:', this.value);
    update_cmap(this.value);
    update_legend();
    geojson.setStyle(style);
    update_distribution();
  });

d3.select("#maxRate")
  .on('change', function() {
    console.log('max rate:', this.value/100);
    CMAP_MAX_RATE = this.value/100;
    update_cmap(CMAP_LEVELS);
    update_legend();
    geojson.setStyle(style);
    update_distribution();
  });

d3.select('#day-value').text(day_format(0));

var interval;

d3.select('#play')
  .on('click', function() {
    play = !play;
    d3.select('#play').classed({"fa-play": !play, "fa-pause": play});
    if (play) {
      var max = +d3.select('#day').property('max');
      console.log('max', max);
      interval = setInterval(function() {
        var d = +d3.select('#day').property('value') + 1;
        if (d < max) {
          d3.select('#day').property('value', d);
          d3.select('#day-value').text(d);
          show_day(d);
        } else {
          clearInterval(interval);
          play = !play;
          d3.select('#play').classed({"fa-play": !play, "fa-pause": play});
        }
      }, PLAY_INTERNAL);
    } else {
      clearInterval(interval);
    }
  });

d3.select('#save')
  .on('click', function() {
    //var el = document.querySelector('#map')
    //svgsaver.asPng(el);
    //console.log('Save complete');

    leafletImage(map, function(err, canvas) {
      // now you have canvas
      // example thing to do with that canvas:
      var img = document.createElement('img');
      var dimensions = map.getSize();
      img.width = dimensions.x;
      img.height = dimensions.y;
      img.src = canvas.toDataURL();
      document.getElementById('images').innerHTML = '';
      document.getElementById('images').appendChild(img);
    });
  });

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
  if (!id || !data || !data[day] || !data[day].counties[id]) {
    d3.select(this._div).style('visibility', 'hidden');
  } else {
    this._div.innerHTML = '<h4>Infected people</h4>';
    var county = data[day].counties[id];
    var pop = countyPop[id];
    var rate = county && pop && county.cases / pop || 0;

    this._div.innerHTML += '<b>' + id + '</b> pop:' + pop+'<br/>cases:' + county.cases + ' rate: ' + Math.floor(1000*county.cases/pop)/10 + '%';
    d3.select(this._div).style('visibility', 'visible');
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
    height: 200,
    width: 600
  },
  title: {text: null},
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
    height:200,
    width: 400
  },
  title: {text: null},
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

//var histogramChart = new Highcharts.Chart({
//  chart: {
//    renderTo: document.querySelector('#histogram-chart'),
//    type: 'column',
//    zoomType: 'x',
//    height:150,
//    width: 300
//  },
//  title: {text: null},
//  xAxis: {
//    title: { text: 'Rate'}
//  },
//  yAxis: {
//    min: 0,
//    title: {text: '# of counties'}
//    //tickInterval: 1
//  },
//  //tooltip: {
//  //  crosshairs: true,
//  //  shared: true,
//  //  valueSuffix: '%',
//  //  formatter: function () {
//  //    var s = '<b>Day ' + this.x + '</b>';
//  //    this.points.forEach( function (p) {
//  //      s += '<br/>' + p.series.name + ': ' + Math.floor(10*p.y)/10 + '%';
//  //    });
//  //
//  //    return s;
//  //  }
//  //},
//
//  plotOptions: {
//    column: {
//      pointPadding: 0.2,
//      borderWidth: 0,
//      animation: false
//    }
//  },
//  legend: {
//    enabled: false
//  },
//  series: []
//});

var distributionChart = new Highcharts.Chart({
  chart: {
    renderTo: document.querySelector('#distribution-chart'),
    type: 'area',
    zoomType: 'x',
    height: 200,
    width: 580
  },
  title: {text: null},
  xAxis: {
    title: { text: 'day'},
    tickInterval: 1,
    plotLines: [total_line]
  },
  yAxis: {
    title: {text: '# counties'}
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
    //},
    //series: {
    //  events: {
    //    legendItemClick: function (event) {
    //      age_visibility[6-event.target._i] = !age_visibility[6-event.target._i];
    //      geojson.setStyle(style);
    //    }
    //  }
    }
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
  d3.select('#play').property('disabled', true);
  d3.select('#day').property('disabled', true);
  d3.select('#spinner').style('visibility', 'visible').classed('fa-spin', true);
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
        if (+i > last) last = +i;

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
          if (countyPop[j]) {
            var r = counties[j].cases/countyPop[j];

            if (r > county_max_rate) county_max_rate = r;
            if (r > 0) {
              county_avg_rate += r;
              county_avg_n++;
            }
          }
        }

        if (county_max_rate > max_rate) max_rate = county_max_rate;
        county_rate_series.push(100*county_max_rate);
        county_avg_series.push(100*county_avg_rate/county_avg_n);

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

      update_distribution();

      d3.select('#day').attr('max', last).property('value', 0);
      d3.select('#play').property('disabled', false);
      d3.select('#day').property('disabled', false);
      d3.select('#spinner').style('visibility', 'hidden').classed('fa-spin', false);

      d3.select('#day-value').text(day_format(0));
      show_day(0);
    })
}

function update_distribution() {
  var i, j, k, n = bin.range().length;
  var distribution_series = d3.range(n).map(function() { return [];});


  for (i in data) {
    var bins = Array(n).fill(0);
    var counties = data[i].counties;

    for (j in counties) {
      if (counties[j].cases && countyPop[j]) {
        var r = counties[j].cases/countyPop[j];
        if (r > 0) bins[bin(r)]++;
      }
    }
    for (k=0; k<n; k++) {
      distribution_series[k].push([i, bins[k]]);
    }
  }

  for (i=distributionChart.series.length-1; i>= 0; i--) {
    distributionChart.series[i].remove();
  }

  var d = bin.domain();
  for (k = n-1; k >= 0; k--) {
    var name = k == n-1 ? '+ '+Math.floor(10000*d[k-1])/100 : Math.floor(10000*d[k])/100;
    distributionChart.addSeries({name: name, color: color.range()[k], data: distribution_series[k]});
  }
}

d3.select('#dataset').on('change', function() { load(this.value); });

d3.select('#day')
  .on('input', function () {
    var d = +this.value;
    d3.select('#day-value').text(day_format(d));
    show_day(d);
  })
  .property('value', 0);

function show_day(current) {
  day = current;
  total_line.value = day;
  chart.xAxis[0].update();
  rateChart.xAxis[0].update();
  distributionChart.xAxis[0].update();
  geojson.setStyle(style);

  var n = 0;
  var counties = data[day].counties;
  for (var i in counties) {
    n += counties[i].cases;
  }
  d3.select('#cases').text(cases_format(n));

  //show_histogram();
}

function show_histogram() {
  var counties = data[day].counties;
  var rates = [];
  for (var i in counties) {
    var c = counties[i].cases;
    if (countyPop[i])
      rates.push(c/countyPop[i]);
  }

  var bins = Array(8).fill(0);
  rates.forEach(function(rate) {
    if (rate > 0)
      bins[bin(rate)]++;
  });

  var d = bin.domain();
  bins = bins.map(function(v, i) {
    return {x:d[i], y:v};
  });

  //console.log('bins:', bins);

  if (histogramChart.series.length > 0)
    histogramChart.series[0].remove();

  histogramChart.addSeries({name: 'histogram', data: bins, color: '#steelblue'});
}

function show_distribution() {
}


// screenshot save
function save() {

}



