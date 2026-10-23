/* globals Chart:false */

(() => {
  'use strict'

  // Graphs
  const ctx = document.getElementById('myChart')
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      ],
      datasets: [{
        data: [
          15339,
          21345,
          18483,
          24003,
          23489,
          24092,
          12034
        ],
        lineTension: 0,
        backgroundColor: 'transparent',
        borderColor: () => document.documentElement.dataset.bsTheme === 'dark' ? '#fc545c' : '#e31b23',
        borderWidth: 4,
        pointBackgroundColor: () => document.documentElement.dataset.bsTheme === 'dark' ? '#fc545c' : '#e31b23'
      }]
    },
    options: {
      color: () => getComputedStyle(ctx).color,
      borderColor: () => `rgba(${getComputedStyle(ctx).getPropertyValue('--bs-body-color-rgb')}, 0.1)`,
      scales: {
        x: {
          ticks: {
            color: () => getComputedStyle(ctx).color
          },
          grid: {
            color: () => `rgba(${getComputedStyle(ctx).getPropertyValue('--bs-body-color-rgb')}, 0.1)`
          },
          border: {
            color: () => `rgba(${getComputedStyle(ctx).getPropertyValue('--bs-body-color-rgb')}, 0.1)`
          }
        },
        y: {
          ticks: {
            color: () => getComputedStyle(ctx).color
          },
          grid: {
            color: () => `rgba(${getComputedStyle(ctx).getPropertyValue('--bs-body-color-rgb')}, 0.1)`
          },
          border: {
            color: () => `rgba(${getComputedStyle(ctx).getPropertyValue('--bs-body-color-rgb')}, 0.1)`
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(55, 50, 52, 0.8)',
          boxPadding: 3
        }
      }
    }
  })

  new MutationObserver(() => {
    chart.update('none')
    chart.draw()
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bs-theme']
  })
})()
