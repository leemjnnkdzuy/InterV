#!/bin/sh
set -eu

tunnel_pid=""
app_pid=""

cleanup() {
  if [ -n "$app_pid" ]; then
    kill "$app_pid" 2>/dev/null || true
  fi
  if [ -n "$tunnel_pid" ]; then
    kill "$tunnel_pid" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

if [ -n "${DEV_TUNNEL_ID:-}" ]; then
  /usr/local/bin/devtunnel connect "$DEV_TUNNEL_ID" >/tmp/devtunnel.log 2>&1 &
  tunnel_pid=$!

  tunnel_ready=0
  attempt=0
  while [ "$attempt" -lt 60 ]; do
    if node -e 'const net=require("node:net"); const socket=net.createConnection(50051,"127.0.0.1"); socket.setTimeout(1000); socket.on("connect",()=>{socket.destroy();process.exit(0)}); socket.on("error",()=>process.exit(1)); socket.on("timeout",()=>{socket.destroy();process.exit(1)})'; then
      tunnel_ready=1
      break
    fi
    if ! kill -0 "$tunnel_pid" 2>/dev/null; then
      cat /tmp/devtunnel.log >&2 || true
      exit 1
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  if [ "$tunnel_ready" -ne 1 ]; then
    cat /tmp/devtunnel.log >&2 || true
    echo "Dev Tunnel did not open local port 50051" >&2
    exit 1
  fi

  if [ -z "${AI_BACKEND_GRPC_TLS_CA_PEM:-}" ] && [ -f /app/certs/interv-backend.crt ]; then
    AI_BACKEND_GRPC_TLS_CA_PEM="$(base64 < /app/certs/interv-backend.crt | tr -d '\n')"
    export AI_BACKEND_GRPC_TLS_CA_PEM
  fi
fi

node node_modules/next/dist/bin/next start &
app_pid=$!
wait "$app_pid"
