slipway wit > ./wit/slipway.wit
cargo build --target wasm32-wasip2 --release
rm -rf artifacts
mkdir -p artifacts/component_wasm
cp target/wasm32-wasip2/release/slipway_givenergy_cloud.wasm artifacts/component_wasm/slipway_component.wasm
cp slipway_component.json artifacts/component_wasm/slipway_component.json
# slipway package artifacts/component_wasm

mkdir -p artifacts/component_js_parallel
cp js_parallel/* artifacts/component_js_parallel
cp slipway_component.json artifacts/component_js_parallel/slipway_component.json
slipway package artifacts/component_js_parallel

mkdir -p artifacts/component_js_serial
cp js_serial/* artifacts/component_js_serial
cp slipway_component.json artifacts/component_js_serial/slipway_component.json
# slipway package artifacts/component_js_serial
