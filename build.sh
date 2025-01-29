cargo build --target wasm32-wasip2 --release
rm -rf artifacts
mkdir -p artifacts/component
cp target/wasm32-wasip2/release/slipway_givenergy_cloud.wasm artifacts/component/slipway_component.wasm
cp slipway_component.json artifacts/component/slipway_component.json
slipway package artifacts/component