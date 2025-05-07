# `jamesthurley.givenergy_cloud`

A [Slipway](https://slipway.co/) Component which uses a [GivEnergy](https://givenergy.co.uk/)
Inverter ID and GivEnergy APIToken  to render
the last two days of solar, battery and power usage as a chart.

The output is a rendered chart as a canvas.

## Suggested Permissions

### `--allow-http-prefix "https://api.givenergy.cloud/"`

This component will need to access the GivEnergy servers to fetch your data.

### `--allow-env-prefix "GIVENERGY_"`

If supplying your Inverter ID and GivEnergy API Token as `GIVENERGY_INVERTER_ID` and
`GIVENERGY_API_TOKEN` environment variables,
this component will require access to those environment variables.

Alternatively you can supply the Inverter ID and API Token as part of the input
using the `inverter_id` and `api_token` properties.

### `--allow-fonts`

This component uses the [`slipwayhq.echarts` Component](https://github.com/slipwayhq/slipway_echarts) component 
to render the chart, which requires fonts to render text.

### `--allow-registry-components`

This component uses the [`slipwayhq.echarts` Component](https://github.com/slipwayhq/slipway_echarts) component,
which itself loads other components, to render the chart.

## Example Usage

Test the component by running the following command and pasting in the input when prompted:
```
slipway run-component "jamesthurley.givenergy_cloud.0.5.0" --allow-http-prefix "https://api.givenergy.cloud/" --allow-fonts --allow-registry-components
```

Input:
```json
{
  "inverter_id": "<your_inverter_id>",
  "api_token": "<your_api_token>",
  "width": 800,
  "height": 600,
  "theme": "color"
}
```

Output:
```json
{
  "canvas": {
    "data": "<encoded_rgba_bytes_omitted>",
    "width": 400,
    "height": 300
  }
}
```