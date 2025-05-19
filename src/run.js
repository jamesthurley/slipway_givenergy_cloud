export async function run(input) {
  // Gather inverter_id and api_token
  const apiToken = input.api_token ?? slipway_host.env("GIVENERGY_API_TOKEN");
  if (!apiToken) {
    throw new Error("No API token provided. Use the input field or the GIVENERGY_API_TOKEN environment variable.");
  }

  const inverterId = input.inverter_id ?? slipway_host.env("GIVENERGY_INVERTER_ID");
  if (!inverterId) {
    throw new Error("No inverter ID provided. Use the input field or the GIVENERGY_INVERTER_ID environment variable.");
  }

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

  const tz = process.env.TZ;
  console.log(`Timezone: ${tz}`);
  console.log(`Now: ${Temporal.Now.plainDateTimeISO(tz).toString()}`);
  
  // Prepare day strings (yesterday & today) in YYYY-MM-DD
  const todayStr = Temporal.Now.plainDateISO(tz).toString();
  console.log(`Today: ${todayStr}`);

  const yesterdayStr = Temporal.Now.plainDateISO(tz)
    .subtract({ days: 1 })
    .toString();
    console.log(`Yesterday: ${yesterdayStr}`);

  // Fetch both days' data in parallel
  const [yesterdayData, todayData] = await Promise.all([
    gatherDayData(yesterdayStr, inverterId, requestOptions),
    gatherDayData(todayStr, inverterId, requestOptions),
  ]);

  // Combine data in the correct order
  let allData = [...yesterdayData, ...todayData];
  console.log(`Got ${allData.length} data points.`);

  if (input.hours_to_show) {
    allData = filterDataToLastHours(allData, input.hours_to_show);
    console.log(`Filtered to ${allData.length} data points.`);
  }
  
  // Build ECharts JSON
  const chart = buildEchartsJson(allData, input.max_axis_power);
  const theme = createTheme(input.theme);

  return { 
    chart,
    theme
  };
}

function filterDataToLastHours(items, hours) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const recentItems = items.filter(item => new Date(item.time) >= twentyFourHoursAgo);
  return recentItems;
}

function createTheme(theme) {
  if (theme === "monochrome") {
    return {
      "color": ["#000"],
      "backgroundColor": "#FFF",
      "textStyle": { "color": "#000" },
      "title": {
        "textStyle": { "color": "#000" },
        "subtextStyle": { "color": "#000" }
      },
      "axisLine": {
        "lineStyle": { "color": "#000" }
      },
      "axisTick": {
        "lineStyle": { "color": "#000" }
      },
      "axisLabel": { "color": "#000" },
      "splitLine": {
        "lineStyle": { 
          "color": "#000",
          "type": "dashed"
        }
      },
      "splitArea": {
        "areaStyle": { "color": ["#FFF", "#FFF"] }
      },
      "toolbox": {
        "iconStyle": { "borderColor": "#000" }
      },
      "legend": {
        "textStyle": { "color": "#000" }
      }
    }
  }

  // Default to color theme.
  return {
    "backgroundColor": "#FFF"
  };
}

// Fetch the first page for a given day, then parallelize the rest of the pages
async function gatherDayData(dayStr, inverterId, requestOptions) {
  // Fetch page 1 first so we know how many pages there are
  const page1Url = `https://api.givenergy.cloud/v1/inverter/${inverterId}/data-points/${dayStr}?page=1`;
  console.log(`Calling: ${page1Url}`);
  const page1Result = await slipway_host.fetch_text(page1Url, requestOptions);
  const page1Body = JSON.parse(page1Result.body);

  // Start our array of data with the first page
  const allData = [...page1Body.data];

  // If there's only one page, we're done
  const meta = page1Body.meta;
  if (!meta || !meta.last_page || meta.last_page === 1) {
    return allData;
  }

  // Otherwise, fetch pages 2..last_page in parallel
  const path = meta.path;        // Base path without ?page=...
  const lastPage = meta.last_page;

  const promises = [];
  for (let page = 2; page <= lastPage; page++) {
    promises.push(fetchPage(path, requestOptions, page));
  }

  // Wait for all parallel fetches, then merge them in ascending page order
  const pageResults = await Promise.all(promises);
  pageResults.sort((a, b) => a.page - b.page);
  for (const p of pageResults) {
    allData.push(...p.body.data);
  }

  return allData;
}

// Helper to fetch a specific page, returning { page, body }
function fetchPage(path, requestOptions, page) {
  const url = `${path}?page=${page}`;
  console.log(`Calling: ${url}`);
  return slipway_host.fetch_text(url, requestOptions).then(result => {
    return {
      page,
      body: JSON.parse(result.body),
    };
  });
}

function buildEchartsJson(data, power_axis_limit) {
  const times = data.map(d => new Date(d.time).getTime());
  const solar = data.map(d => d.power.solar.power);
  const grid = data.map(d => d.power.grid.power);
  const battery = data.map(d => d.power.battery.power);
  const batteryPercent = data.map(d => d.power.battery.percent);
  const consumption = data.map(d => d.power.consumption.power);

  let power_axis_max = Math.max(...solar, ...grid, ...battery, ...consumption);
  let power_axis_min = Math.min(...solar, ...grid, ...battery, ...consumption);

  if (power_axis_limit) {
    if (power_axis_max > power_axis_limit) {
      power_axis_max = power_axis_limit;
    }
    if (power_axis_min < -power_axis_limit) {
      power_axis_min = -power_axis_limit;
    }
  }

  let definition = {
    legend: {
      data: ["Consumption", "Battery", "Solar", "Grid", "Battery %"],
      itemStyle: { opacity: 0 }
    },
    grid: { bottom: 30, left: 70, right: 50 },
    xAxis: {
      type: "time",
      axisLabel: { formatter: "{dd}/{MM} {HH}:{mm}" },
      position: "bottom",
      axisLine: { onZero: false },
      axisTick: {
        show: true,
        lineStyle: { width: 1 }
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
        max: power_axis_max,
        min: power_axis_min,
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
        name: "Grid",
        type: "line",
        showSymbol: false,
        data: times.map((t, i) => [t, grid[i]]),
        lineStyle: { type: "dashed" }
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

  return definition;
}
