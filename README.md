# `jamesthurley.givenergy_cloud`

A [Slipway](https://slipway.co/) Component which uses a [GivEnergy](https://givenergy.co.uk/)
Inverter ID and GivEnergy APIToken  to render
the last two days of solar, battery and power usage as a chart.

The output is an ECharts definition, which can be rendered using the [`slipwayhq.echarts` Component](https://github.com/slipwayhq/slipway_echarts).

## Suggested Permissions

### `--allow-http-prefix "https://api.givenergy.cloud/"`

This component will need to access the GivEnergy servers to fetch your data.

### `--allow-env-prefix "GIVENERGY_"`

If supplying your Inverter ID and GivEnergy API Token as `GIVENERGY_INVERTER_ID` and
`GIVENERGY_API_TOKEN` environment variables,
this component will require access to those environment variables.

Alternatively you can supply the Inverter ID and API Token as part of the input
using the `inverter_id` and `api_token` properties.

## Example Usage

Test the component by running the following command and pasting in the input when prompted:
```
slipway run-component "jamesthurley.givenergy_cloud.0.5.0" --allow-http-prefix "https://api.givenergy.cloud/"
```

Input:
```json
{
  "inverter_id": "<your_inverter_id>",
  "api_token": "<your_api_token>"
}
```

Output:
```json
{
  "chart": {
    "grid": {
      "bottom": 30,
      "left": 70,
      "right": 50
    },
    "legend": {
      "data": [
        "Consumption",
        "Battery",
        "Solar",
        "Grid",
        "Battery %"
      ],
      "itemStyle": {
        "opacity": 0
      }
    },
    "series": [
      {
        "data": [
          [
            1745967816000.0,
            207.0
          ],
          [
            1745968118000.0,
            208.0
          ],
          [
            1745968419000.0,
            228.0
          ],
// etc...
```