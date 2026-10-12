    // Replace with your own ThingSpeak Channel ID.
    const CHANNEL_ID = "3532598";

    // The channel must have Public View enabled.
    const API_URL =
      `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=300`;

    const temperatureElement =
      document.getElementById("temperature");

    const updatedElement =
      document.getElementById("updated");

    const chartStatus =
      document.getElementById("chartStatus");

    const ctx =
      document.getElementById("temperatureChart");

    const chart = new Chart(ctx, {
      type: "line",

      data: {
        labels: [],
        datasets: [{
          label: "Temperature",
          data: [],
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56, 189, 248, 0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          borderWidth: 2,
          spanGaps: false
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index"
        },
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            ticks: {
              color: "#94a3b8",
              maxTicksLimit: 8,
              maxRotation: 0
            },
            grid: {
              color: "rgba(148, 163, 184, 0.08)"
            }
          },
          y: {
            ticks: {
              color: "#94a3b8",
              callback: value => value + "°"
            },
            grid: {
              color: "rgba(148, 163, 184, 0.12)"
            }
          }
        }
      }
    });

    async function updateTemperature() {
      try {
        const response = await fetch(API_URL, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }

        const result = await response.json();

        const readings = (result.feeds || [])
          .filter(feed =>
            feed.field1 !== null &&
            feed.field1 !== ""
          )
          .map(feed => ({
            time: new Date(feed.created_at),
            temp: Number(feed.field1)
          }))
          .filter(item =>
            Number.isFinite(item.temp) &&
            !Number.isNaN(item.time.getTime())
          )
          .sort((a, b) => a.time - b.time);

        if (readings.length === 0) {
          temperatureElement.textContent = "--.-°C";
          updatedElement.textContent =
            "No readings yet. Check the ESP32.";
          chartStatus.textContent =
            "No temperature history available.";
          return;
        }

        const latest = readings[readings.length - 1];

        temperatureElement.textContent =
          latest.temp.toFixed(1) + "°C";

        updatedElement.textContent =
          "Last sensor reading: " +
          latest.time.toLocaleString();

        // Show the last 24 hours using the browser's local time.
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;

        const history = readings.filter(item =>
          item.time.getTime() >= cutoff
        );

        chart.data.labels = history.map(item =>
          item.time.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })
        );

        chart.data.datasets[0].data =
          history.map(item => item.temp);

        chart.update();

        chartStatus.textContent =
          history.length +
          " readings in the last 24 hours. " +
          "Website refreshes every minute.";

        // Warn if the sensor has stopped reporting.
        const ageMinutes =
          (Date.now() - latest.time.getTime()) / 60000;

        if (ageMinutes > 15) {
          updatedElement.textContent +=
            " — Warning: no recent reading.";
          updatedElement.classList.add("error");
        } else {
          updatedElement.classList.remove("error");
        }

      } catch (error) {
        console.error("Temperature update failed:", error);
        updatedElement.textContent =
          "Could not load sensor data. Retrying...";
        updatedElement.classList.add("error");
        chartStatus.textContent =
          "Check your internet connection and ThingSpeak channel settings.";
      }
    }

    updateTemperature();

    // Refresh the website data every 60 seconds.
    setInterval(updateTemperature, 60000);