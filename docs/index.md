# Harpoon PoC Edition Documentation

**AI Orchestration Platform - HostedAI Integration Proof of Concept**

This is the documentation hub for the Harpoon PoC Edition, a streamlined version of the Harpoon AI orchestration platform designed for HostedAI GPUaaS integration testing.

## Quick Start

- **[Build & Run Guide](../WARP.md)** - Complete setup instructions for developers
- **[What This Does](../WHAT_THIS_DOES.md)** - High-level overview of capabilities
- **[Main README](../README.md)** - Project overview and architecture

## PoC Architecture & Integration

The `hosted-ai-poc/` directory contains comprehensive documentation for the HostedAI integration:

### Core Documentation
- **[HostedAI PoC Overview](hosted-ai-poc/README.md)** - Integration summary and approach
- **[PoC Architecture](hosted-ai-poc/poc-architecture.md)** - Technical architecture and system design
- **[HostedAI Integration Index](hosted-ai-poc/INDEX.md)** - Complete documentation index

### Implementation Details
- **[Multi-Tenant Architecture](hosted-ai-poc/multi-tenant-architecture.md)** - Scalable deployment patterns
- **[Enterprise Compliance](hosted-ai-poc/enterprise-compliance-formalization.md)** - Security and audit framework
- **[Billing Implementation](hosted-ai-poc/billing-implementation-plan.md)** - Usage tracking and cost management

## Current Status

**PoC Implementation**: The current codebase implements core orchestration with HostedAI integration points:

- ✅ **Service Layer**: HTTP API with health endpoints and request routing
- ✅ **Covenant System**: Work definition and multi-repo coordination
- ✅ **Strike Operations**: Coordinated execution across repositories
- ✅ **Deployment Modes**: Native (MLX) and HostedAI targeting
- ✅ **Mock Multi-Tenancy**: Tenant management framework with usage tracking
- ⚠️  **HostedAI Integration**: API structure ready, waiting for full specification

## Crate Documentation

Individual crate documentation is available in each `crates/*/README.md`:

- **[service](../crates/service/README.md)** - HTTP API server
- **[orchestrator](../crates/orchestrator/README.md)** - Core orchestration engine  
- **[harpoon_bridge](../crates/harpoon_bridge/README.md)** - Unified orchestration interface
- **[harpoon-core](../crates/harpoon-core/README.md)** - Core fusion primitives
- **[resources](../crates/resources/README.md)** - MCP resource management

## Key Concepts

### Covenant-Strike-Cable Paradigm
- **Covenant**: Work definitions and capability contracts
- **Strike**: Coordinated execution across repositories
- **Cable**: Cross-repository linkage and state management

### Fusion Processing
Fragment-based code analysis with hygiene scoring and anchor deduplication for quality assurance.

### Deployment Targets
- **Native**: Local MLX inference on Apple Silicon
- **HostedAI**: Cloud GPU inference via HostedAI GPUaaS

## Development

This PoC edition focuses on HostedAI integration readiness while maintaining the core Harpoon architecture. The codebase includes:

- Lightweight service deployment (no Python dependencies by default)
- Mock implementations for enterprise features
- Production-ready Docker and Railway deployment configurations
- Comprehensive test coverage for core functionality

For questions about the PoC or integration approach, please refer to the detailed documentation in the `hosted-ai-poc/` directory.