run(input);

async function run(input) {
  // Gather inverter_id and api_token from the input or from environment variables
  const apiToken = input.api_token ?? slipway_host.env("GIVENERGY_API_TOKEN");
  if (!apiToken) {
    throw new Error("No API token provided. Use the input field or the GIVENERGY_API_TOKEN environment variable.");
  }

  const inverterId = input.inverter_id ?? slipway_host.env("GIVENERGY_INVERTER_ID");
  if (!inverterId) {
    throw new Error("No inverter ID provided. Use the input field or the GIVENERGY_INVERTER_ID environment variable.");
  }

  // Construct request options
  const requestOptions = {
    method: "GET",
    body: null,
    headers: [
      ["Authorization", `Bearer ${apiToken}`],
      ["Content-Type", "application/json"],
      ["Accept", "application/json"],
    ],
    timeout_ms: null
  };

  // Prepare day strings (yesterday & today) in YYYY-MM-DD
  const now = new Date();
  const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const localYesterday = new Date(localToday);
  localYesterday.setDate(localYesterday.getDate() - 1);

  const todayStr = localToday.toISOString().split("T")[0];
  const yesterdayStr = localYesterday.toISOString().split("T")[0];

  // Accumulate data
  const allData = [];
  for (const dayStr of [yesterdayStr, todayStr]) {
    let next = `https://api.givenergy.cloud/v1/inverter/${inverterId}/data-points/${dayStr}?page=1`;
    while (next) {
      slipway_host.log_info(`Calling: ${next}`);
      const result = await slipway_host.fetch_text(next, requestOptions);
      const body = JSON.parse(result.body);
      allData.push(...body.data);
      next = body.links.next;
    }
  }

  slipway_host.log_info(`Got ${allData.length} data points.`);

  // Build ECharts JSON
  const chartJson = buildEchartsJson(allData);

  // Return our final JSON object
  return { chart: chartJson };
}

function buildEchartsJson(data) {
  // Timestamps in ms
  const times = data.map(d => new Date(d.time).getTime());
  const solar = data.map(d => d.power.solar.power);
  const grid = data.map(d => d.power.grid.power);
  const battery = data.map(d => d.power.battery.power);
  const batteryPercent = data.map(d => d.power.battery.percent);
  const consumption = data.map(d => d.power.consumption.power);

  return {
    backgroundColor: "#ffffff",
    legend: {
      data: ["Consumption", "Grid", "Battery", "Solar", "Battery %"],
      itemStyle: { opacity: 0 }
    },
    grid: {
      bottom: 30,
      left: 70,
      right: 50,
    },
    xAxis: {
      type: "time",
      axisLabel: { formatter: "{dd}/{MM} {HH}:{mm}" },
      position: "bottom",
      axisLine: { onZero: false },
      axisTick: {
        show: true,
        lineStyle: { width: 1, color: "#000" }
      },
      splitLine: {
        show: true,
        lineStyle: { color: "#000", type: [1, 8] }
      }
    },
    yAxis: [
      {
        type: "value",
        name: "Power (W)",
        splitLine: {
          lineStyle: { color: "#000", type: [1, 8] }
        }
      },
      {
        type: "value",
        name: "Battery %",
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: "Consumption",
        type: "line",
        showSymbol: false,
        data: times.map((t, i) => [t, consumption[i]]),
        lineStyle: { type: "solid" }
      },
      {
        name: "Grid",
        type: "line",
        showSymbol: false,
        data: times.map((t, i) => [t, grid[i]]),
        lineStyle: { type: "dashed" }
      },
      {
        name: "Battery",
        type: "line",
        showSymbol: false,
        data: times.map((t, i) => [t, battery[i]]),
        lineStyle: { type: "dotted" }
      },
      {
        name: "Solar",
        type: "line",
        showSymbol: false,
        data: times.map((t, i) => [t, solar[i]]),
        lineStyle: { type: [8, 4, 2, 4] }
      },
      {
        name: "Battery %",
        type: "line",
        showSymbol: false,
        yAxisIndex: 1,
        data: times.map((t, i) => [t, batteryPercent[i]]),
        lineStyle: { type: [8, 4, 4, 4] }
      },
    ]
  };
}