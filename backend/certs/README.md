# Local backend TLS certificates

The Docker Compose profile binds gRPC on `0.0.0.0:50051` and therefore requires
TLS. Keep the private key and certificate files on this machine; they are ignored
by Git and are never copied into the image.

Generate a certificate whose SAN matches the public hostname or IP that the
frontend uses, for example:

```powershell
openssl req -x509 -newkey rsa:4096 -sha256 -nodes -days 825 `
  -keyout backend\certs\server.key `
  -out backend\certs\server.crt `
  -subj "/CN=be.interv.leemjnnkdzuy.dev" `
  -addext "subjectAltName=DNS:be.interv.leemjnnkdzuy.dev"
```

If the frontend connects directly to a public IP, use that IP as the SAN
instead. Configure the matching certificate PEM as
`AI_BACKEND_GRPC_TLS_CA_PEM` in Coolify. This setup does not require client
certificates (mTLS); the gRPC internal API key remains mandatory for every RPC.
