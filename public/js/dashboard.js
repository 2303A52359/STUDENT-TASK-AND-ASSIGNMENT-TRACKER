document.addEventListener("DOMContentLoaded", () => {
  const monthCanvas = document.getElementById("tasksPerMonthChart");
  const priorityCanvas = document.getElementById("tasksByPriorityChart");
  const textColor = "#172033";
  const mutedTextColor = "#5b6478";
  const gridColor = "rgba(214, 222, 234, 0.75)";

  if (monthCanvas && window.Chart) {
    const labels = JSON.parse(monthCanvas.dataset.labels);
    const values = JSON.parse(monthCanvas.dataset.values);
    const context = monthCanvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 0, 320);

    gradient.addColorStop(0, "rgba(45, 91, 255, 0.95)");
    gradient.addColorStop(1, "rgba(96, 165, 250, 0.45)");

    new Chart(monthCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Tasks",
            data: values,
            backgroundColor: gradient,
            borderColor: "#1e40af",
            borderWidth: 1,
            borderRadius: 12,
            borderSkipped: false,
            maxBarThickness: 34
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "#101a36",
            titleColor: "#ffffff",
            bodyColor: "#dbeafe",
            padding: 12,
            displayColors: false,
            callbacks: {
              label(contextValue) {
                const count = contextValue.raw;
                return `${count} item${count === 1 ? "" : "s"}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: mutedTextColor
            }
          },
          y: {
            beginAtZero: true,
            grace: 1,
            ticks: {
              color: mutedTextColor,
              precision: 0,
              stepSize: 1
            },
            grid: {
              color: gridColor,
              drawBorder: false
            }
          }
        }
      }
    });
  }

  if (priorityCanvas && window.Chart) {
    const labels = JSON.parse(priorityCanvas.dataset.labels);
    const values = JSON.parse(priorityCanvas.dataset.values);
    const total = values.reduce((sum, value) => sum + value, 0);

    new Chart(priorityCanvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ["#ef4444", "#f59e0b", "#10b981"],
            borderColor: "#ffffff",
            borderWidth: 6,
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "#101a36",
            titleColor: "#ffffff",
            bodyColor: "#dbeafe",
            padding: 12,
            callbacks: {
              label(contextValue) {
                const value = contextValue.raw;
                const percentage = total ? Math.round((value / total) * 100) : 0;
                return `${contextValue.label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      },
      plugins: [
        {
          id: "centerText",
          afterDraw(chart) {
            const { ctx } = chart;
            const meta = chart.getDatasetMeta(0);

            if (!meta || !meta.data || !meta.data.length) {
              return;
            }

            const x = meta.data[0].x;
            const y = meta.data[0].y;

            ctx.save();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = mutedTextColor;
            ctx.font = "600 14px Segoe UI";
            ctx.fillText("Total", x, y - 12);
            ctx.fillStyle = textColor;
            ctx.font = "700 28px Segoe UI";
            ctx.fillText(String(total), x, y + 14);
            ctx.restore();
          }
        }
      ]
    });
  }
});
