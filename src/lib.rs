use std::{fmt::Display, vec};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use slipway_host::{RequestError, RequestOptions};

wit_bindgen::generate!({
    world: "slipway",
});

struct Component;

export!(Component);

impl Guest for Component {
    fn run(input_string: String) -> Result<String, ComponentError> {
        let input: Input = serde_json::from_str(&input_string)
            .map_err(|e| ComponentError::for_error("Failed to deserialize input.", e))?;

        let api_token = match input.api_token {
            Some(token) => Ok(token),
            None => {
                match slipway_host::env("GIVENERGY_API_TOKEN") {
                    Some(token) => Ok(token),
                    None => Err(ComponentError::new("No API token provided. Use the input field or the GIVENERGY_API_TOKEN environment variable.")),
                }
            }
        }?;

        let inverter_id = match input.inverter_id {
            Some(id) => Ok(id),
            None => {
                match slipway_host::env("GIVENERGY_INVERTER_ID") {
                    Some(id) => Ok(id),
                    None => Err(ComponentError::new("No inverter ID provided. Use the input field or the GIVENERGY_INVERTER_ID environment variable.")),
                }
            }
        }?;

        let request_options = RequestOptions {
            method: Some("GET".to_string()),
            body: None,
            headers: Some(vec![
                (
                    "Authorization".to_string(),
                    format!("Bearer {}", &api_token),
                ),
                ("Content-Type".to_string(), "application/json".to_string()),
                ("Accept".to_string(), "application/json".to_string()),
            ]),
            timeout_ms: None,
        };

        let result = slipway_host::fetch_text(
                &format!(
                    "https://api.givenergy.cloud/v1/inverter/{inverter_id}/data-points/2024-12-15?page=1"
                ),
                Some(&request_options),
            )?;

        let mut body: PartialDataResponse = serde_json::from_str(&result.body).unwrap();

        let mut all_data = body.data;

        while let Some(next) = body.links.next {
            slipway_host::log_info(&format!("Calling: {next}"));

            let result = slipway_host::fetch_text(&next, Some(&request_options))?;
            body = serde_json::from_str(&result.body).unwrap();
            all_data.extend(body.data);
        }

        slipway_host::log_info(&format!("Got {} data points.", all_data.len()));

        let output = Output {
            chart: build_echarts_json(&all_data),
        };

        let output_string = serde_json::to_string(&output)
            .map_err(|e| ComponentError::for_error("Failed to serialize output.", e))?;

        Ok(output_string)
    }
}

fn build_echarts_json(data: &[PartialDataPoint]) -> serde_json::Value {
    // Convert each "time" field into a millisecond timestamp so ECharts can treat it as a time axis
    let times: Vec<serde_json::Value> = data
        .iter()
        .map(|d| {
            // Adjust format if your time string differs
            let dt: DateTime<Utc> = d
                .time
                .parse()
                .unwrap_or_else(|e| panic!("Failed to parse date/time: {}\n{:#?}", &d.time, e));
            serde_json::json!(dt.timestamp_millis())
        })
        .collect();

    let solar: Vec<f32> = data.iter().map(|d| d.power.solar.power).collect();
    let grid: Vec<f32> = data.iter().map(|d| d.power.grid.power).collect();
    let battery: Vec<f32> = data.iter().map(|d| d.power.battery.power).collect();
    let battery_percent: Vec<f32> = data.iter().map(|d| d.power.battery.percent).collect();
    let consumption: Vec<f32> = data.iter().map(|d| d.power.consumption.power).collect();

    serde_json::json!({
        "backgroundColor": "#ffffff",
        "legend": {
            "data": ["Solar", "Grid", "Battery", "Battery %", "Consumption"]
        },
        "xAxis": {
            "type": "time",
            // Format the label to only show HH:mm
            "axisLabel": {
                "formatter": "{HH}:{mm}"
            }
        },
        "yAxis": [
            {
                "type": "value",
                "name": "Power (W)",
                "splitLine": { "show": true }
            },
            {
                "type": "value",
                "name": "Battery %",
                "splitLine": { "show": false }
            }
        ],
        "series": [
            {
                "name": "Solar",
                "type": "line",
                "showSymbol": false,
                // Each data point becomes [time, value] for a time axis
                "data": times.iter().zip(solar.iter())
                    .map(|(t, &v)| serde_json::json!([t, v]))
                    .collect::<Vec<_>>()
            },
            {
                "name": "Grid",
                "type": "line",
                "showSymbol": false,
                "data": times.iter().zip(grid.iter())
                    .map(|(t, &v)| serde_json::json!([t, v]))
                    .collect::<Vec<_>>()
            },
            {
                "name": "Battery",
                "type": "line",
                "showSymbol": false,
                "data": times.iter().zip(battery.iter())
                    .map(|(t, &v)| serde_json::json!([t, v]))
                    .collect::<Vec<_>>()
            },
            {
                "name": "Battery %",
                "type": "line",
                // Link this series to the second y-axis
                "showSymbol": false,
                "yAxisIndex": 1,
                "data": times.iter().zip(battery_percent.iter())
                    .map(|(t, &v)| serde_json::json!([t, v]))
                    .collect::<Vec<_>>()
            },
            {
                "name": "Consumption",
                "type": "line",
                "showSymbol": false,
                "data": times.iter().zip(consumption.iter())
                    .map(|(t, &v)| serde_json::json!([t, v]))
                    .collect::<Vec<_>>()
            }
        ]
    })
}

#[derive(Deserialize)]
struct PartialDataResponse {
    data: Vec<PartialDataPoint>,
    links: Links,
}

#[derive(Deserialize)]
struct Links {
    next: Option<String>,
}

#[derive(Deserialize)]
struct PartialDataPoint {
    time: String,
    power: PartialPowerResponse,
}

#[derive(Deserialize)]
struct PartialPowerResponse {
    solar: PartialSolarPower,
    grid: PartialGridPower,
    battery: PartialBatteryPower,
    consumption: PartialConsumptionPower,
}

#[derive(Deserialize)]
struct PartialSolarPower {
    power: f32,
}

#[derive(Deserialize)]
struct PartialGridPower {
    power: f32,
}

#[derive(Deserialize)]
struct PartialBatteryPower {
    percent: f32,
    power: f32,
}

#[derive(Deserialize)]
struct PartialConsumptionPower {
    power: f32,
}

#[derive(Deserialize)]
struct Input {
    inverter_id: Option<String>,
    api_token: Option<String>,
}

#[derive(Serialize)]
struct Output {
    chart: serde_json::Value,
}

impl ComponentError {
    fn new(message: &str) -> Self {
        ComponentError {
            message: message.to_string(),
            inner: vec![],
        }
    }

    fn for_error(message: &str, error: impl Display) -> Self {
        ComponentError {
            message: message.to_string(),
            inner: vec![error.to_string()],
        }
    }
}

impl From<RequestError> for ComponentError {
    fn from(error: RequestError) -> Self {
        let mut inner = error.inner;
        if let Some(response) = error.response {
            inner.push(format!(
                "{:?}",
                String::from_utf8(response.body).expect("Body should be a string")
            ));
        }
        ComponentError {
            message: error.message,
            inner,
        }
    }
}
