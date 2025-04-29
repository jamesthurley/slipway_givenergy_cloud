publisher := "jamesthurley"
name := "givenergy_cloud"

build:
  rm -rf components
  mkdir -p components/{{publisher}}.{{name}}
  cp -r src/* components/{{publisher}}.{{name}}
  slipway package components/{{publisher}}.{{name}}
