# Infra Gluten Free

Infraestructura y servicios compartidos del proyecto E-commerce Gluten Free, separados de los repos de aplicación (`api-ecommerce-gluten-free`, `front-ecommerce-gluten-free`) porque no pertenecen 100% al ecommerce: son piezas de plataforma que cualquier otro servicio del cluster también podría usar.

## Qué contiene

| Carpeta | Qué es | Namespace |
|---|---|---|
| `k8s/infra/` | Chart de Helm: PostgreSQL, Seq (logging) y MinIO (almacenamiento S3-compatible) | `infra` |
| `k8s/cloudflare/` | Cloudflare Tunnel (expone servicios sin abrir puertos en el router) + Worker de mantenimiento | `cloudflare` |
| `k8s/monitoring/` | Ingress de Grafana | `monitoring` |

## Infraestructura

- **Kubernetes (K3s)** self-hosted, con **ingress-nginx** como Ingress Controller
- **GitHub Actions** (self-hosted runner) dispara el deploy de cada carpeta según qué cambió (`paths` filter por workflow)
- El release de Grafana en sí (Helm) se instaló manualmente en el cluster — este repo solo gestiona su `Ingress`

## Deploy

Cada carpeta bajo `k8s/` tiene su propio workflow en `.github/workflows/`, disparado solo cuando cambian sus archivos:

- `deploy-infra.yml` → `helm upgrade --install infra ./k8s/infra`
- `deploy-cloudflare.yml` → `kubectl apply -f k8s/cloudflare/cloudflared.yaml`
- `deploy-monitoring.yml` → `kubectl apply -f k8s/monitoring/`

## Secrets requeridos (GitHub Actions)

- `DB_PASSWORD`
- `SEQ_ADMIN_PASSWORD_HASH`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `CLOUDFLARE_TUNNEL_CREDENTIALS`

## Seq: password inicial en Windows

`Seq` toma la clave inicial del administrador desde el secret de GitHub `SEQ_ADMIN_PASSWORD_HASH`, que el pipeline (`deploy-infra.yml`) publica en el secret de Kubernetes `infra-secrets` y el chart consume como `SEQ_FIRSTRUN_ADMINPASSWORDHASH`.

En Windows, no generes ese hash con este patrón en PowerShell:

```powershell
$seqPassword = 'GlutenFree2026'
$seqHash = $seqPassword | docker run --rm -i datalust/seq config hash
```

Ese pipe puede enviar `CRLF` al contenedor y terminar generando el hash de `password + salto de linea`, lo que deja un login invalido aunque el secret se haya actualizado correctamente.

Usa este flujo exacto para generar el hash sin newline:

```powershell
$seqPassword = 'GlutenFree2026'
$tmp = Join-Path $env:TEMP 'seq-password-no-newline.txt'
[System.IO.File]::WriteAllText($tmp, $seqPassword, (New-Object System.Text.UTF8Encoding($false)))
$seqHash = cmd /c "docker run --rm -i datalust/seq config hash < `"$tmp`""
[System.IO.File]::WriteAllText("$env:TEMP\seq_admin_password_hash_clean.txt", $seqHash.Trim(), (New-Object System.Text.UTF8Encoding($false)))
gh secret set SEQ_ADMIN_PASSWORD_HASH --repo <owner>/infra < "$env:TEMP\seq_admin_password_hash_clean.txt"
```

Si `Seq` ya habia arrancado con un PVC previo, cambiar el secret no alcanza. Hay que recrear los recursos de `Seq` para que vuelva a aplicar el password de primer arranque:

```powershell
kubectl scale deploy seq -n infra --replicas=0
kubectl delete pvc seq-pvc -n infra
kubectl delete deploy seq -n infra
kubectl delete svc seq -n infra
kubectl delete ingress infra-ingress-seq -n infra
```

Luego hay que volver a correr el CI/CD para que:

1. publique el hash nuevo en `infra-secrets`
2. recree `seq-pvc`
3. recree `deployment/seq`, `service/seq` e `ingress`
