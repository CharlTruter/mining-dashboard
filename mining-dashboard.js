$(document).ready(function () {
  Dashboard.fillCurrencyData();
  Dashboard.loadData();
});

var Dashboard = {
  miningData: null,
  earningChart: null,
  currency: 'ZAR',
  apiUrl: 'https://mining-api.armizael.com/mphstats/armi',
  getQueryParamByName: function(name) {
    var url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  },
  fillCurrencyData: function() {
    var currency = Dashboard.getQueryParamByName('currency');
    var redirectUrl = window.location.href.split("?")[0] + '?currency=usd';

    if (currency && currency.length > 0 && currency.toLowerCase() === 'usd') {
      Dashboard.currency = 'USD';
      Dashboard.apiUrl = 'https://mining-api.armizael.com/mphstats/armi/usd';
      $('#switch-btn').text("Switch to ZAR");
      redirectUrl = window.location.href.split("?")[0];
    }

    
    $('#switch-btn').click(function() {
      window.location = redirectUrl;
    });

    $('#earning-fiat-btn').html(Dashboard.currency);
  },
  loadData: function () {
    $.ajax({
      type: 'GET',
      contentType: 'json',
      url: Dashboard.apiUrl,
    }).done(function (data) {
      Dashboard.miningData = data;
      $('#loader').hide();
      $('#earning-data').show();
      $('#worker-data').show();
      $('#estimation-data').show();
      $('#last-updated-data').show();
      Dashboard.earningGraph.fillLtc();
      Dashboard.workers.fill();
      Dashboard.estimations.fill();
      Dashboard.setLastUpdatedTime();
    }).fail(function (error) {
      $('#loader').hide();
      $('#error-loading').show();
    });
  },
  setLastUpdatedTime: function () {
    if (Dashboard.miningData != null && Dashboard.miningData.cached_time) {
      var time = Dashboard.miningData.cached_time.substring(0, Dashboard.miningData.cached_time.indexOf('GMT') + 3);
      var date = new Date(time);
      $('#last-updated-span').html(date.toLocaleString());
    }
  },
  getLtcWalletEarningHistoryData: function () {
    if (Dashboard.miningData && Dashboard.miningData.wallet_data && Dashboard.miningData.wallet_data.length > 0) {
      var walletData = Dashboard.miningData.wallet_data;

      var ltcWalletData = null;

      for (var q = 0; q < walletData.length; q++) {
        var currentWalletData = walletData[q];
        if (currentWalletData.coin === 'litecoin') {
          ltcWalletData = currentWalletData;
          break;
        }
      }

      if (ltcWalletData != null && ltcWalletData.earning_history && ltcWalletData.earning_history.length > 0) {
        return ltcWalletData.earning_history;
      }
    }

    return null;
  },
  getFiatPerLtc: function () {
    if (Dashboard.miningData != null && Dashboard.miningData.conversion_data &&
      Dashboard.miningData.conversion_data.LTC && Dashboard.miningData.conversion_data.LTC[Dashboard.currency]) {
      return Dashboard.miningData.conversion_data.LTC[Dashboard.currency];
    }

    return null;
  },
  earningGraph: {
    getLabels: function () {
      var earningData = Dashboard.getLtcWalletEarningHistoryData();

      if (earningData != null) {
        var labels = [];

        for (var q = 0; q < earningData.length; q++) {
          var history = earningData[q];

          labels.push(history.date);
        }

        return labels.reverse();
      }

      return null;
    },
    getLtcData: function () {
      var earningData = Dashboard.getLtcWalletEarningHistoryData();

      if (earningData != null) {
        var data = [];

        for (var q = 0; q < earningData.length; q++) {
          var history = earningData[q];

          data.push(history.amount.toFixed(4));
        }

        return data.reverse();
      }

      return null;
    },
    getZarData: function () {
      var earningData = Dashboard.getLtcWalletEarningHistoryData();

      var fiatRate = Dashboard.getFiatPerLtc();

      if (earningData != null && fiatRate != null) {
        var data = [];

        for (var q = 0; q < earningData.length; q++) {
          var history = earningData[q];
          var fiatAmount = fiatRate * history.amount;

          data.push(fiatAmount.toFixed(2));
        }

        return data.reverse();
      }

      return null;
    },
    fill: function (data, label) {
      if (Dashboard.earningChart != null) {
        Dashboard.earningChart.destroy();
      }

      var chartCtx = document.getElementById('ltcEarningChart').getContext('2d');

      Dashboard.earningChart = new Chart(chartCtx, {
        type: 'line',
        data: {
          labels: Dashboard.earningGraph.getLabels(),
          datasets: [{
            label: label,
            backgroundColor: '#e6f8ff',
            borderColor: '#00ace8',
            data: data,
          }]
        },
        options: {
          tooltips: {
            mode: 'index',
            intersect: false,
          },
          hover: {
            mode: 'nearest',
            intersect: true
          },
        }
      });
    },
    fillLtc: function () {
      $('#earning-ltc-btn').addClass('active');
      $('#earning-fiat-btn').removeClass('active');
      var data = Dashboard.earningGraph.getLtcData();

      if (data != null) {
        Dashboard.earningGraph.fill(data, 'LTC');
      }
    },
    fillFiat: function () {
      $('#earning-ltc-btn').removeClass('active');
      $('#earning-fiat-btn').addClass('active');
      var data = Dashboard.earningGraph.getZarData();

      if (data != null) {
        Dashboard.earningGraph.fill(data, Dashboard.currency);
      }
    },
  },
  workers: {
    fill: function () {
      if (Dashboard.miningData != null && Dashboard.miningData.worker_data &&
        Dashboard.miningData.worker_data.length > 0) {
        var tableBody = '';

        for (var q = 0; q < Dashboard.miningData.worker_data.length; q++) {
          var worker = Dashboard.miningData.worker_data[q];
          tableBody += Dashboard.workers.getWorkerRow(worker);
        }

        $('#worker-tbl tbody').html(tableBody);
      } else {
        $('#worker-tbl tbody').html('<tr><td colspan="4">No workers are currently active.</td></tr>');
      }
    },
    getWorkerRow: function (workerInfo) {
      return '<tr><td>' + workerInfo.username + '</td><td>' + workerInfo.pool + '</td><td>' +
        workerInfo.coin + '</td><td>' + workerInfo.hashrate + '</td></tr>';
    },
  },
  estimations: {
    fill: function () {
      if (Dashboard.miningData && Dashboard.miningData.estimates_data &&
        Object.keys(Dashboard.miningData.estimates_data).length > 0) {
        var estData = Dashboard.miningData.estimates_data;
        var estimationRow = '<tr><td>' + estData.last_24_hours.toFixed(2) + ' ' + Dashboard.currency + '</td><td>' +
          estData.hourly.toFixed(2) + ' ' + Dashboard.currency + '</td><td>' + estData.daily.toFixed(2) + ' ' +
          Dashboard.currency + '</td><td>' + estData.weekly.toFixed(2) + ' ' + Dashboard.currency + '</td><td>' +
          estData.monthly.toFixed(2) + ' ' + Dashboard.currency + '</td><td>' + estData.yearly.toFixed(2) +
          ' ' + Dashboard.currency + '</td></tr>';
          $('#estimation-tbl tbody').html(estimationRow);
      } else {
        $("#estimation-tbl tbody").html('<tr><td colspan="6">No estimation data available currently.</td></tr>');
      }
    },
  }
};