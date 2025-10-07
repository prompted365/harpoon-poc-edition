# Configuration Files

This directory contains all configuration files for the Harpoon project.

## 📁 Configuration Files

### Environment Configuration
- **`.env.example`** - Template environment variables file
  - Copy to `.env` and customize for your deployment
  - Contains API keys, service URLs, and feature flags

### Application Configuration  
- **`homeskillet.yaml`** - Main application configuration
  - Model settings, service ports, logging levels
  - Used by the orchestrator service

### Infrastructure Configuration
- **`docker-compose.yml`** - Standard Docker Compose setup
- **`docker-compose.poc.yml`** - Proof-of-concept Docker setup with additional services
- **`prometheus.yml`** - Prometheus monitoring configuration
- **`compliance.yaml`** - Compliance framework configuration

### Legacy/Specialized Configuration
- **`config.example.yaml`** - Alternative YAML configuration format
- **`qoq.manifest.json`** - QoQ (Quality of Quality) manifest
- **`qoq.manifest.schema.json`** - JSON schema for QoQ manifest validation

## 🚀 Quick Setup

### 1. Environment Setup
```bash
# Copy environment template
cp configs/.env.example .env

# Edit with your specific values
nano .env
```

### 2. Docker Deployment
```bash
# Standard deployment
docker-compose -f configs/docker-compose.yml up -d

# Development/PoC deployment with additional services
docker-compose -f configs/docker-compose.poc.yml up -d
```

### 3. Native Deployment
```bash
# Copy configuration to expected location
cp configs/homeskillet.yaml ~/.orchestrator/config.yaml

# Or set custom config path
export HARPOON_CONFIG_PATH=./configs/homeskillet.yaml
```

## 🔧 Configuration Hierarchy

The application loads configuration in this order (later values override earlier ones):

1. **Default values** (hardcoded in application)
2. **Configuration files** (`homeskillet.yaml` or `config.example.yaml`)
3. **Environment variables** (`.env` file or system environment)
4. **Command-line arguments** (when applicable)

## 📝 Environment Variables

Key environment variables (see `.env.example` for complete list):

### Core Service
- `SERVICE_PORT` - HTTP API port (default: 8080)
- `SERVICE_HOST` - Bind address (default: 0.0.0.0)
- `RUST_LOG` - Logging level (default: info)

### Cloud GPU Integration
- `HOSTED_AI_BASE_URL` - HostedAI API endpoint
- `HOSTED_AI_API_KEY` - API authentication key
- `HOSTED_AI_POOL_ID` - GPU pool identifier

### Feature Flags
- `HARPOON_FEATURE_HOSTEDAI` - Enable/disable HostedAI integration
- `HARPOON_GPU_REQUIRED` - Fail if GPU backend unavailable
- `DEPLOYMENT_MODE` - Deployment mode (mock, cpu, mlx, hostedai)

### Authentication
- `GITHUB_CLIENT_ID` - GitHub OAuth application ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth secret

## 🔐 Security Notes

- **Never commit `.env` files** to version control
- **Rotate API keys regularly** in production
- **Use environment-specific configurations** for different deployments
- **Validate configuration** on application startup

## 🆘 Troubleshooting

### Common Configuration Issues

1. **Service won't start**: Check `SERVICE_PORT` isn't already in use
2. **HostedAI connection fails**: Verify `HOSTED_AI_*` environment variables
3. **GitHub OAuth errors**: Ensure callback URLs match `GITHUB_CLIENT_ID` settings
4. **Feature flags not working**: Check boolean values (0/1, true/false, on/off)

### Validation Commands

```bash
# Test configuration loading
cargo run -p service -- --validate-config

# Check environment variables
env | grep -E "(HARPOON|HOSTED_AI|GITHUB)" | sort

# Validate YAML syntax
yamllint configs/homeskillet.yaml
```