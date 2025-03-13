slipway wit > ./wit/slipway.wit
cargo build --target wasm32-wasip2 --release
rm -rf components
mkdir -p components/component_wasm
cp target/wasm32-wasip2/release/slipway_givenergy_cloud.wasm components/component_wasm/run.wasm
cp slipway_component.json components/component_wasm/slipway_component.json
# slipway package components/component_wasm

mkdir -p components/component_js_parallel
cp js_parallel/* components/component_js_parallel
cp slipway_component.json components/component_js_parallel/slipway_component.json
slipway package components/component_js_parallel

mkdir -p components/component_js_serial
cp js_serial/* components/component_js_serial
cp slipway_component.json components/component_js_serial/slipway_component.json
# slipway package components/component_js_serial
