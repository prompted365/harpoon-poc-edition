# Codebase Analysis Report

Generated: 2025-10-05T20:37:23.133496

## Summary
- **Total files analyzed**: 69
- **Total functions**: 382
- **Total exports**: 194
- **Total lines of code**: 18,220

### File Type Distribution
- `.js`: 3 files
- `.py`: 15 files
- `.rs`: 55 files
- `.ts`: 4 files
- `.tsx`: 8 files

## File Tree
```
    ├── Cargo.toml (1.2KB)
    ├── Dockerfile (980B)
    ├── Makefile (3.0KB)
    ├── crates/
    │   ├── engine_pymlx/
    │   │   ├── Cargo.toml (202B)
    │   │   └── src/
    │   │       └── lib.rs (2.6KB)
    │   ├── harpoon-core/
    │   │   ├── Cargo.toml (1.2KB)
    │   │   └── src/
    │   │       └── lib.rs (21.2KB)
    │   ├── harpoon_bridge/
    │   │   ├── Cargo.toml (845B)
    │   │   └── src/
    │   │       ├── covenant.rs (4.8KB)
    │   │       ├── fusion.rs (3.9KB)
    │   │       ├── lib.rs (7.4KB)
    │   │       └── strike.rs (5.7KB)
    │   ├── mcp_server/
    │   │   ├── Cargo.toml (1.3KB)
    │   │   └── src/
    │   │       ├── cli.rs (4.9KB)
    │   │       ├── handlers.rs (10.3KB)
    │   │       ├── lib.rs (9.5KB)
    │   │       ├── protocol.rs (2.1KB)
    │   │       ├── transport/
    │   │       │   ├── http.rs (4.3KB)
    │   │       │   ├── stdio.rs (3.1KB)
    │   │       │   └── websocket.rs (7.1KB)
    │   │       └── transport.rs (86B)
    │   ├── orchestrator/
    │   │   ├── Cargo.toml (1.7KB)
    │   │   ├── src/
    │   │   │   ├── bin/
    │   │   │   │   └── homeskillet-orchestrator.rs (1.5KB)
    │   │   │   ├── config.rs (11.7KB)
    │   │   │   ├── hosted_ai.rs (16.4KB)
    │   │   │   ├── lib.rs (9.3KB)
    │   │   │   ├── metrics.rs (8.3KB)
    │   │   │   ├── server.rs (11.4KB)
    │   │   │   ├── tenant.rs (11.9KB)
    │   │   │   └── types.rs (3.2KB)
    │   │   └── tests/
    │   │       └── hosted_ai_integration.rs (7.6KB)
    │   ├── pyffi/
    │   │   ├── Cargo.toml (454B)
    │   │   └── src/
    │   │       └── lib.rs (2.1KB)
    │   ├── resources/
    │   │   ├── Cargo.toml (431B)
    │   │   └── src/
    │   │       ├── lib.rs (5.9KB)
    │   │       ├── prompts/
    │   │       │   ├── agent.rs (2.4KB)
    │   │       │   ├── covenant.rs (2.9KB)
    │   │       │   ├── fusion.rs (1.5KB)
    │   │       │   └── strike.rs (3.0KB)
    │   │       ├── prompts.rs (112B)
    │   │       ├── sampling.rs (6.8KB)
    │   │       ├── schemas/
    │   │       │   ├── agent.rs (5.6KB)
    │   │       │   ├── covenant.rs (5.3KB)
    │   │       │   ├── fusion.rs (1.9KB)
    │   │       │   └── strike.rs (2.9KB)
    │   │       ├── schemas.rs (122B)
    │   │       ├── tools/
    │   │       │   ├── covenant.rs (1.6KB)
    │   │       │   ├── fusion.rs (1.8KB)
    │   │       │   ├── github.rs (4.1KB)
    │   │       │   └── mlx.rs (3.4KB)
    │   │       └── tools.rs (101B)
    │   ├── service/
    │   │   ├── Cargo.toml (800B)
    │   │   └── src/
    │   │       ├── auth/
    │   │       │   ├── github_oauth.rs (4.5KB)
    │   │       │   └── mod.rs (21B)
    │   │       ├── config.rs (3.2KB)
    │   │       ├── main.rs (6.7KB)
    │   │       └── mock_engine.rs (711B)
    │   └── wasm_classifier/
    │       ├── Cargo.toml (400B)
    │       └── src/
    │           └── lib.rs (3.2KB)
    ├── scripts/
    │   ├── analysis/
    │   │   └── generate-project-analysis.py (8.9KB)
    │   ├── analyze_codebase.py (17.7KB)
    │   ├── analyze_codebase_simple.py (20.4KB)
    │   ├── compliance/
    │   │   ├── audit-trail-generator.py (27.5KB)
    │   │   ├── compliance-dashboard.py (17.4KB)
    │   │   ├── compliance-scanner.py (29.9KB)
    │   │   └── generate-policy-templates.py (21.2KB)
    │   ├── comprehensive_analysis.py (10.6KB)
    │   ├── generate_comprehensive_network_graph.py (8.2KB)
    │   ├── generate_high_signal_graph.py (20.9KB)
    │   ├── generate_network_graph.py (55.9KB)
    │   ├── generate_network_graph_enhanced.py (26.1KB)
    │   ├── generate_network_graph_qoq.py (13.2KB)
    │   ├── generate_unified_analysis.py (21.0KB)
    │   └── qoq_emit.py (3.7KB)
    ├── tests/
    │   ├── e2e/
    │   │   └── full_system_test.rs (10.0KB)
    │   ├── integration/
    │   │   ├── covenant_cocreation_test.rs (13.3KB)
    │   │   ├── github_oauth_test.rs (2.5KB)
    │   │   ├── hosted_ai_test.rs (3.3KB)
    │   │   ├── qoq_integration_test.rs (3.3KB)
    │   │   ├── wasm_classifier_test.rs (2.9KB)
    │   │   └── websocket_mcp_test.rs (5.8KB)
    │   └── mocks/
    │       └── mod.rs (5.6KB)
    └── web-ui/
        ├── app/
        │   ├── api/
        │   │   └── github/
        │   │       ├── device/
        │   │       │   ├── poll/
        │   │       │   │   └── route.ts (2.0KB)
        │   │       │   └── start/
        │   │       │       └── route.ts (1.4KB)
        │   │       └── me/
        │   │           └── route.ts (1006B)
        │   ├── layout.tsx (431B)
        │   └── page.tsx (1.2KB)
        ├── components/
        │   ├── ConnectForm.tsx (1.8KB)
        │   ├── GitHubAuth.tsx (3.3KB)
        │   ├── McpClientProvider.tsx (4.2KB)
        │   ├── QoQViewer.tsx (3.6KB)
        │   ├── SessionLog.tsx (1.4KB)
        │   └── ToolList.tsx (3.1KB)
        ├── next.config.js (258B)
        ├── package.json (598B)
        ├── postcss.config.js (81B)
        └── tailwind.config.js (252B)
```

## Functions by File

### `crates/engine_pymlx/src/lib.rs`
- 🔓 **new**
- 🔓 **generate**
- 🔒 **ensure_loaded**

### `crates/harpoon-core/src/lib.rs`
- 🔓 **get_absorbed**
- 🔓 **get_pending**
- 🔓 **get_events**
- 🔓 **get_iterations**
- 🔓 **get_anchors**
- 🔓 **as_dict**
- 🔓 **as_dict**
- 🔓 **as_dict**
- 🔓 **new_native**
- 🔓 **run_native_cycle**
- 🔓 **compute_fingerprint**
- 🔓 **thread_count**
- 🔓 **configured_thread_count**
- 🔓 **new**
- 🔓 **envelope_cycle**
- 🔓 **fingerprint**
- 🔓 **fragment_hash**
- 🔓 **new**
- 🔓 **envelope_cycle**
- 🔓 **fragment_hash**
- 🔒 **from**
- 🔒 **extract_bound**
- 🔒 **new**
- 🔒 **to_report**
- 🔒 **from_data**
- 🔒 **new**
- 🔒 **compute_states**
- 🔒 **compute_states**
- 🔒 **configured_threads**
- 🔒 **thread_count**
- 🔒 **run_cycle**
- 🔒 **compute_anchor_hash**
- 🔒 **compute_fingerprint**
- 🔒 **detect_language**
- 🔒 **hygiene_score**
- 🔒 **compute_indent_balance**
- 🔒 **compute_comment_ratio**
- 🔒 **path**
- 🔒 **idx**
- 🔒 **lines**
- 🔒 **hash**
- 🔒 **hygiene_score**
- 🔒 **language**
- 🔒 **fingerprint**
- 🔒 **body_len**
- 🔒 **event**
- 🔒 **path**
- 🔒 **idx**
- 🔒 **lines**
- 🔒 **hash**
- 🔒 **hygiene_score**
- 🔒 **anchor_prev**
- 🔒 **anchor_next**
- 🔒 **language**
- 🔒 **fingerprint**
- 🔒 **iteration_index**
- 🔒 **absorbed**
- 🔒 **pending**
- 🔒 **events**
- 🔒 **iterations**
- 🔒 **anchors**
- 🔒 **threads**
- 🔒 **configured_threads**
- 🔒 **harpoon_core**
- 🔒 **serde_json_to_py**

### `crates/harpoon_bridge/src/covenant.rs`
- 🔓 **new**
- 🔓 **reality_state**
- 🔓 **target_state**
- 🔓 **add_metadata**
- 🔓 **build**

### `crates/harpoon_bridge/src/fusion.rs`
- 🔓 **new**
- 🔓 **process_fragment** `async`
- 🔓 **process_fragments** `async`
- 🔓 **stats**
- 🔒 **process_fragment**
- 🔒 **process_fragments**
- 🔒 **main**

### `crates/harpoon_bridge/src/lib.rs`
- 🔓 **new**
- 🔓 **create_covenant** `async`
- 🔓 **process** `async`
- 🔓 **execute_strike** `async`
- 🔒 **create_covenant**
- 🔒 **process**
- 🔒 **process_with_hosted_ai**
- 🔒 **run_with_hosted_ai**
- 🔒 **execute_strike**

### `crates/harpoon_bridge/src/strike.rs`
- 🔓 **execute_strike** `async`
- 🔓 **monitor_strike** `async`
- 🔒 **execute_strike**
- 🔒 **select_strike_targets**
- 🔒 **create_pr_for_target**
- 🔒 **monitor_strike**

### `crates/mcp_server/src/cli.rs`
- 🔒 **new**
- 🔒 **generate**
- 🔒 **main**
- 🔒 **example_client**

### `crates/mcp_server/src/handlers.rs`
- 🔓 **handle_tool_call**
- 🔓 **handle_resource_read**
- 🔓 **handle_sampling**
- 🔒 **handle_classify**
- 🔒 **handle_inference**
- 🔒 **handle_create_pr**
- 🔒 **handle_analyze_repo**
- 🔒 **handle_covenant_resource**
- 🔒 **handle_strike_resource**
- 🔒 **handle_agents_resource**
- 🔒 **handle_qoq_index**
- 🔒 **handle_qoq_status**
- 🔒 **handle_qoq_locate**
- 🔒 **handle_covenant_evaluate**

### `crates/mcp_server/src/lib.rs`
- 🔓 **new**
- 🔓 **handle_request** `async`
- 🔓 **add_connection**
- 🔓 **remove_connection**
- 🔒 **initialize**
- 🔒 **list_tools**
- 🔒 **call_tool**
- 🔒 **list_resources**
- 🔒 **read_resource**
- 🔒 **list_prompts**
- 🔒 **get_prompt**
- 🔒 **sample**
- 🔒 **handle_request**
- 🔒 **initialize**
- 🔒 **list_tools**
- 🔒 **call_tool**
- 🔒 **list_resources**
- 🔒 **read_resource**
- 🔒 **list_prompts**
- 🔒 **get_prompt**
- 🔒 **sample**

### `crates/mcp_server/src/transport/http.rs`
- 🔓 **new**
- 🔓 **router**
- 🔓 **run** `async`
- 🔒 **run**
- 🔒 **handle_health**
- 🔒 **handle_post**
- 🔒 **handle_sse**
- 🔒 **check_needs_sse**

### `crates/mcp_server/src/transport/stdio.rs`
- 🔓 **new**
- 🔓 **run** `async`
- 🔒 **run**

### `crates/mcp_server/src/transport/websocket.rs`
- 🔓 **new** `async`
- 🔓 **run** `async`
- 🔓 **load_manifest** `async`
- 🔓 **refresh_manifest** `async`
- 🔒 **new**
- 🔒 **run**
- 🔒 **handle_session**
- 🔒 **load_manifest**
- 🔒 **refresh_manifest**

### `crates/orchestrator/src/bin/homeskillet-orchestrator.rs`
- 🔒 **main**

### `crates/orchestrator/src/config.rs`
- 🔓 **load**
- 🔓 **load_from_file**
- 🔓 **save_to_file**
- 🔓 **new**
- 🔓 **with_server**
- 🔓 **with_hosted_ai**
- 🔓 **with_cache**
- 🔓 **with_monitoring**
- 🔓 **build**
- 🔒 **default**
- 🔒 **find_config_file**
- 🔒 **apply_env_overrides**
- 🔒 **validate**

### `crates/orchestrator/src/hosted_ai.rs`
- 🔓 **new**
- 🔓 **request_vgpu** `async`
- 🔓 **inference** `async`
- 🔓 **release** `async`
- 🔓 **get_allocation**
- 🔓 **list_allocations**
- 🔓 **get_metrics**
- 🔓 **health_check** `async`
- 🔒 **default_timeout**
- 🔒 **default_max_retries**
- 🔒 **request_vgpu**
- 🔒 **inference**
- 🔒 **release**
- 🔒 **health_check**
- 🔒 **post_with_retry**
- 🔒 **delete_with_retry**
- 🔒 **make_post_request**
- 🔒 **make_delete_request**
- 🔒 **handle_response**

### `crates/orchestrator/src/lib.rs`
- 🔓 **new**
- 🔓 **new**
- 🔓 **classify**
- 🔓 **run**
- 🔓 **classify_async** `async`
- 🔓 **generate_direct** `async`
- 🔒 **example**
- 🔒 **convert_gen_options**
- 🔒 **generate**
- 🔒 **generate**
- 🔒 **generate**
- 🔒 **generate**
- 🔒 **classify_async**
- 🔒 **generate_direct**
- 🔒 **run_gemma**
- 🔒 **run_qwen**

### `crates/orchestrator/src/metrics.rs`
- 🔓 **new**
- 🔓 **observe_duration**
- 🔓 **init_metrics**
- 🔓 **record_allocation_attempt**
- 🔓 **update_active_allocations**
- 🔓 **record_inference_request**
- 🔓 **record_inference_metrics**
- 🔓 **update_circuit_breaker**
- 🔓 **record_api_request**
- 🔓 **update_gpu_utilization**
- 🔓 **track_inference_cost**
- 🔓 **new**
- 🔓 **gather**
- 🔓 **render**

### `crates/orchestrator/src/server.rs`
- 🔓 **create_router**
- 🔓 **start_server** `async`
- 🔒 **into_response**
- 🔒 **health_handler**
- 🔒 **ready_handler**
- 🔒 **metrics_handler**
- 🔒 **classify_handler**
- 🔒 **inference_handler**
- 🔒 **list_models_handler**
- 🔒 **start_server**
- 🔒 **create_metrics_router**

### `crates/orchestrator/src/tenant.rs`
- 🔓 **new**
- 🔓 **new**
- 🔒 **get_tenant**
- 🔒 **get_context_from_api_key**
- 🔒 **check_permission**
- 🔒 **update_usage**
- 🔒 **check_limits**
- 🔒 **record_event**
- 🔒 **get_usage_summary**
- 🔒 **get_current_usage**
- 🔒 **get_tenant**
- 🔒 **get_context_from_api_key**
- 🔒 **check_permission**
- 🔒 **update_usage**
- 🔒 **check_limits**
- 🔒 **record_event**
- 🔒 **get_usage_summary**
- 🔒 **get_current_usage**

### `crates/orchestrator/src/types.rs`
- 🔓 **new**
- 🔓 **classify** `async`
- 🔓 **run** `async`
- 🔒 **classify**
- 🔒 **run**

### `crates/orchestrator/tests/hosted_ai_integration.rs`
- 🔒 **get_test_config**

### `crates/pyffi/src/lib.rs`
- 🔓 **init**
- 🔓 **classify**
- 🔓 **run**
- 🔒 **homeskillet_oa4_rs**

### `crates/resources/src/lib.rs`
- 🔓 **register_prompt**
- 🔓 **register_tool**
- 🔓 **register_schema**
- 🔓 **get_prompt**
- 🔓 **get_tool**
- 🔓 **get_schema**
- 🔓 **prompts_for_agent**
- 🔓 **export_json**
- 🔓 **render_prompt**
- 🔒 **load_builtin_resources**

### `crates/resources/src/prompts/agent.rs`
- 🔓 **agent_communication_prompt**
- 🔓 **task_delegation_prompt**

### `crates/resources/src/prompts/covenant.rs`
- 🔓 **creation_prompt**
- 🔓 **review_prompt**

### `crates/resources/src/prompts/fusion.rs`
- 🔓 **hygiene_prompt**

### `crates/resources/src/prompts/strike.rs`
- 🔓 **delegation_prompt**
- 🔓 **pr_creation_prompt**

### `crates/resources/src/sampling.rs`
- 🔓 **architect**
- 🔓 **foreman**
- 🔓 **worker**
- 🔓 **new**
- 🔓 **register_strategy**
- 🔓 **should_sample**
- 🔓 **record_sample**
- 🔓 **get_samples_for_validation**
- 🔓 **sample_from_array**
- 🔒 **default**

### `crates/resources/src/schemas/agent.rs`
- 🔓 **delegation_plan_schema**
- 🔓 **agent_message_schema**

### `crates/resources/src/schemas/covenant.rs`
- 🔓 **covenant_schema**

### `crates/resources/src/schemas/fusion.rs`
- 🔓 **fusion_trail_schema**

### `crates/resources/src/schemas/strike.rs`
- 🔓 **strike_order_schema**

### `crates/resources/src/tools/covenant.rs`
- 🔓 **create_covenant_tool**

### `crates/resources/src/tools/fusion.rs`
- 🔓 **process_fragments_tool**

### `crates/resources/src/tools/github.rs`
- 🔓 **create_pr_tool**
- 🔓 **analyze_repo_tool**

### `crates/resources/src/tools/mlx.rs`
- 🔓 **classify_tool**
- 🔓 **inference_tool**

### `crates/service/src/auth/github_oauth.rs`
- 🔓 **new**
- 🔓 **start_device_flow** `async`
- 🔓 **poll_for_token** `async`
- 🔓 **get_user** `async`
- 🔒 **start_device_flow**
- 🔒 **poll_for_token**
- 🔒 **get_user**

### `crates/service/src/config.rs`
- 🔓 **from_env**
- 🔓 **validate**
- 🔒 **load_hosted_ai_config**

### `crates/service/src/main.rs`
- 🔒 **main**
- 🔒 **health**
- 🔒 **classify_legacy**
- 🔒 **run_legacy**
- 🔒 **process_unified**
- 🔒 **create_covenant**
- 🔒 **execute_strike**

### `crates/service/src/mock_engine.rs`
- 🔓 **new**
- 🔒 **generate**

### `crates/wasm_classifier/src/lib.rs`
- 🔓 **classify_task**
- 🔓 **get_version**
- 🔓 **init**

### `scripts/analyze_codebase.py`
- 🔓 **setup_git_hook**
- 🔓 **main**

### `scripts/analyze_codebase_simple.py`
- 🔓 **setup_git_hook**
- 🔓 **main**

### `scripts/compliance/audit-trail-generator.py`
- 🔓 **main** `async`

### `scripts/compliance/compliance-dashboard.py`
- 🔓 **main** `async`

### `scripts/compliance/compliance-scanner.py`
- 🔓 **main** `async`

### `scripts/compliance/generate-policy-templates.py`
- 🔓 **main**

### `scripts/comprehensive_analysis.py`
- 🔓 **run_command**
- 🔓 **count_lines_of_code**
- 🔓 **count_files**
- 🔓 **analyze_rust_crates**
- 🔓 **analyze_python_components**
- 🔓 **analyze_gtm_documentation**
- 🔓 **analyze_ai_agents**
- 🔓 **analyze_web_components**
- 🔓 **analyze_infrastructure**
- 🔓 **main**

### `scripts/generate_comprehensive_network_graph.py`
- 🔓 **draw_arrow**

### `scripts/generate_high_signal_graph.py`
- 🔓 **main**

### `scripts/generate_network_graph.py`
- 🔓 **main**

### `scripts/generate_network_graph_enhanced.py`
- 🔓 **main**

### `scripts/generate_network_graph_qoq.py`
- 🔓 **main**

### `scripts/generate_unified_analysis.py`
- 🔓 **main**

### `scripts/qoq_emit.py`
- 🔓 **git_hash**
- 🔓 **build_tree**
- 🔓 **list_symbols_and_flows**
- 🔓 **load_contracts**

### `tests/e2e/full_system_test.rs`
- 🔒 **smoke_test_mcp_protocol**
- 🔒 **smoke_test_unified_request**

### `tests/integration/github_oauth_test.rs`
- 🔓 **mock_github_responses**

### `tests/integration/qoq_integration_test.rs`
- 🔓 **test_function**

### `tests/integration/websocket_mcp_test.rs`
- 🔒 **start_test_server**
- 🔒 **shutdown**

### `tests/mocks/mod.rs`
- 🔓 **new**
- 🔓 **connect**
- 🔓 **disconnect**
- 🔓 **send**
- 🔓 **received_messages**
- 🔓 **new**
- 🔓 **start_device_flow** `async`
- 🔓 **poll_for_token** `async`
- 🔓 **new**
- 🔓 **generate**
- 🔓 **set_manifest**
- 🔓 **new**
- 🔓 **allocate_gpu** `async`
- 🔓 **inference** `async`
- 🔓 **release** `async`
- 🔓 **new**
- 🔓 **classify**
- 🔒 **start_device_flow**
- 🔒 **poll_for_token**
- 🔒 **allocate_gpu**
- 🔒 **inference**
- 🔒 **release**

### `web-ui/app/api/github/device/poll/route.ts`
- 🔓 **POST** `async`

### `web-ui/app/api/github/device/start/route.ts`
- 🔓 **POST** `async`

### `web-ui/app/api/github/me/route.ts`
- 🔓 **GET** `async`

### `web-ui/components/ConnectForm.tsx`
- 🔓 **ConnectForm**

### `web-ui/components/GitHubAuth.tsx`
- 🔓 **GitHubAuth**

### `web-ui/components/McpClientProvider.tsx`
- 🔓 **McpClientProvider**
- 🔓 **useMcp**

### `web-ui/components/QoQViewer.tsx`
- 🔓 **QoQViewer**

### `web-ui/components/SessionLog.tsx`
- 🔓 **SessionLog**

### `web-ui/components/ToolList.tsx`
- 🔓 **ToolList**

## Exports by File

### `crates/engine_pymlx/src/lib.rs`
- 📦 **GenOptions** (struct)
- 📦 **PythonMlxEngine** (struct)

### `crates/harpoon-core/src/lib.rs`
- 📦 **FragmentInput** (struct)
- 📦 **FragmentInputSerde** (struct)
- 📦 **FragmentState** (struct)
- 📦 **FragmentReport** (struct)
- 📦 **CycleEvent** (struct)
- 📦 **HarpoonCycle** (struct)
- 📦 **HarpoonEngine** (struct)
- 📦 **EngineCore** (struct)
- 📦 **HarpoonCycleData** (struct)
- 📦 **WasmHarpoonEngine** (struct)
- 📦 **FragmentStatus** (enum)
- 📦 **EngineError** (enum)

### `crates/harpoon_bridge/src/covenant.rs`
- 📦 **Covenant** (struct)
- 📦 **RealityState** (struct)
- 📦 **TargetState** (struct)
- 📦 **RepoMetadata** (struct)
- 📦 **RepoAnalysis** (struct)
- 📦 **FunctionRef** (struct)
- 📦 **ComplexityAssessment** (struct)
- 📦 **AgentTier** (struct)
- 📦 **CovenantBuilder** (struct)
- 📦 **HarmonyReview** (struct)
- 📦 **StrikeTarget** (struct)
- 📦 **DelegationPlan** (struct)
- 📦 **ForemanAssignment** (struct)
- 📦 **WorkerPool** (struct)
- 📦 **TargetRole** (enum)

### `crates/harpoon_bridge/src/fusion.rs`
- 📦 **FusionOrchestrator** (struct)
- 📦 **FusionState** (struct)
- 📦 **FusionResult** (struct)
- 📦 **FusionStats** (struct)

### `crates/harpoon_bridge/src/lib.rs`
- 📦 **UnifiedOrchestrator** (struct)
- 📦 **UnifiedRequest** (struct)
- 📦 **FragmentContext** (struct)
- 📦 **UnifiedResponse** (struct)
- 📦 **DeploymentTarget** (enum)

### `crates/harpoon_bridge/src/strike.rs`
- 📦 **StrikeResult** (struct)
- 📦 **PullRequestInfo** (struct)
- 📦 **CableState** (struct)
- 📦 **PrStatus** (enum)
- 📦 **CableType** (enum)
- 📦 **StrikeStatus** (enum)

### `crates/mcp_server/src/cli.rs`
- 📦 **EngineWrapper** (struct)
- 📦 **Args** (struct)

### `crates/mcp_server/src/lib.rs`
- 📦 **McpServer** (struct)
- 📦 **ConnectionInfo** (struct)
- 📦 **McpRpcImpl** (struct)
- 📦 **TransportType** (enum)
- 📦 **defining** (trait)
- 📦 **McpRpc** (trait)

### `crates/mcp_server/src/protocol.rs`
- 📦 **McpRequest** (struct)
- 📦 **McpResponse** (struct)
- 📦 **RpcError** (struct)
- 📦 **McpNotification** (struct)
- 📦 **InitializeParams** (struct)
- 📦 **ClientInfo** (struct)
- 📦 **ToolCallParams** (struct)
- 📦 **ResourceReadParams** (struct)
- 📦 **PromptGetParams** (struct)
- 📦 **SamplingParams** (struct)
- 📦 **SamplingMethodParam** (enum)

### `crates/mcp_server/src/transport/http.rs`
- 📦 **HttpTransport** (struct)
- 📦 **McpBatch** (struct)

### `crates/mcp_server/src/transport/stdio.rs`
- 📦 **StdioTransport** (struct)

### `crates/mcp_server/src/transport/websocket.rs`
- 📦 **WebSocketTransport** (struct)
- 📦 **WebSocketSession** (struct)
- 📦 **QoQManifest** (struct)

### `crates/orchestrator/src/config.rs`
- 📦 **OrchestratorConfig** (struct)
- 📦 **ServerConfig** (struct)
- 📦 **ModelsConfig** (struct)
- 📦 **ModelConfig** (struct)
- 📦 **MonitoringConfig** (struct)
- 📦 **SafetyConfig** (struct)
- 📦 **CacheConfig** (struct)
- 📦 **ConfigBuilder** (struct)

### `crates/orchestrator/src/hosted_ai.rs`
- 📦 **HostedAiConfig** (struct)
- 📦 **GpuAllocationRequest** (struct)
- 📦 **ResourceRequirements** (struct)
- 📦 **GpuAllocationResponse** (struct)
- 📦 **HostedInferenceRequest** (struct)
- 📦 **InferenceParameters** (struct)
- 📦 **HostedInferenceResponse** (struct)
- 📦 **ApiError** (struct)
- 📦 **Metrics** (struct)
- 📦 **HostedAiConnector** (struct)

### `crates/orchestrator/src/lib.rs`
- 📦 **DefaultEngine** (struct)
- 📦 **GenOptions** (struct)
- 📦 **ModelConfig** (struct)
- 📦 **ObsidianConfig** (struct)
- 📦 **SafetyConfig** (struct)
- 📦 **Config** (struct)
- 📦 **Models** (struct)
- 📦 **MyEngine** (struct)
- 📦 **Classification** (struct)
- 📦 **Homeskillet** (struct)
- 📦 **must** (trait)
- 📦 **InferenceEngine** (trait)

### `crates/orchestrator/src/metrics.rs`
- 📦 **Timer** (struct)
- 📦 **MetricsExporter** (struct)
- 📦 **CircuitBreakerState** (enum)

### `crates/orchestrator/src/server.rs`
- 📦 **AppState** (struct)
- 📦 **HealthResponse** (struct)
- 📦 **ReadyResponse** (struct)
- 📦 **InferenceRequest** (struct)
- 📦 **InferenceResponse** (struct)
- 📦 **ClassificationRequest** (struct)
- 📦 **ErrorResponse** (struct)

### `crates/orchestrator/src/tenant.rs`
- 📦 **TenantConfig** (struct)
- 📦 **ResourceLimits** (struct)
- 📦 **BillingConfig** (struct)
- 📦 **PaymentTerms** (struct)
- 📦 **BrandingConfig** (struct)
- 📦 **TenantContext** (struct)
- 📦 **Permissions** (struct)
- 📦 **UsageEvent** (struct)
- 📦 **UsageSummary** (struct)
- 📦 **UsageBreakdown** (struct)
- 📦 **CurrentUsage** (struct)
- 📦 **MockTenantManager** (struct)
- 📦 **MockUsageTracker** (struct)
- 📦 **DeploymentMode** (enum)
- 📦 **TenantStatus** (enum)
- 📦 **PriorityTier** (enum)
- 📦 **BillingProvider** (enum)
- 📦 **UsageEventType** (enum)
- 📦 **TenantManager** (trait)
- 📦 **UsageTracker** (trait)

### `crates/orchestrator/src/types.rs`
- 📦 **ClassifyRequest** (struct)
- 📦 **ClassifyResponse** (struct)
- 📦 **RunRequest** (struct)
- 📦 **RunResponse** (struct)
- 📦 **Orchestrator** (struct)

### `crates/pyffi/src/lib.rs`
- 📦 **TextIn** (struct)
- 📦 **ClassOut** (struct)
- 📦 **RunOut** (struct)

### `crates/resources/src/lib.rs`
- 📦 **ResourceRegistry** (struct)
- 📦 **PromptTemplate** (struct)
- 📦 **ToolDefinition** (struct)
- 📦 **DataSchema** (struct)
- 📦 **AgentType** (enum)

### `crates/resources/src/sampling.rs`
- 📦 **SamplingConfig** (struct)
- 📦 **MidTurnSample** (struct)
- 📦 **SamplingCoordinator** (struct)
- 📦 **ToolOutputSample** (struct)
- 📦 **SamplingStrategy** (enum)
- 📦 **SamplingMethod** (enum)

### `crates/service/src/auth/github_oauth.rs`
- 📦 **GitHubDeviceFlow** (struct)
- 📦 **DeviceCodeResponse** (struct)
- 📦 **TokenResponse** (struct)
- 📦 **PollResponse** (enum)

### `crates/service/src/config.rs`
- 📦 **AppConfig** (struct)
- 📦 **GitHubConfig** (struct)
- 📦 **HostedAiConfig** (struct)
- 📦 **McpConfig** (struct)
- 📦 **ServiceConfig** (struct)

### `crates/service/src/main.rs`
- 📦 **AppState** (struct)
- 📦 **TextIn** (struct)
- 📦 **ClassOut** (struct)
- 📦 **RunOut** (struct)
- 📦 **CreateCovenantRequest** (struct)
- 📦 **CreateCovenantResponse** (struct)
- 📦 **ExecuteStrikeRequest** (struct)
- 📦 **HealthResponse** (struct)

### `crates/service/src/mock_engine.rs`
- 📦 **MockEngine** (struct)

### `crates/wasm_classifier/src/lib.rs`
- 📦 **Classification** (struct)

### `scripts/analyze_codebase.py`
- 📦 **CodebaseAnalyzer** (class)

### `scripts/analyze_codebase_simple.py`
- 📦 **SimpleCodebaseAnalyzer** (class)

### `scripts/compliance/audit-trail-generator.py`
- 📦 **AuditEventType** (class)
- 📦 **AuditEvent** (class)
- 📦 **AuditTrailGenerator** (class)

### `scripts/compliance/compliance-dashboard.py`
- 📦 **ComplianceMetric** (class)
- 📦 **ComplianceDashboard** (class)

### `scripts/compliance/compliance-scanner.py`
- 📦 **ComplianceFramework** (class)
- 📦 **ComplianceCheck** (class)
- 📦 **ComplianceResult** (class)
- 📦 **ComplianceScanner** (class)

### `scripts/compliance/generate-policy-templates.py`
- 📦 **PolicyTemplateGenerator** (class)

### `scripts/generate_high_signal_graph.py`
- 📦 **HighSignalVisualizer** (class)

### `scripts/generate_network_graph.py`
- 📦 **CodebaseNetworkVisualizer** (class)

### `scripts/generate_network_graph_enhanced.py`
- 📦 **EnhancedNetworkVisualizer** (class)

### `scripts/generate_network_graph_qoq.py`
- 📦 **QoQNetworkVisualizer** (class)

### `scripts/generate_unified_analysis.py`
- 📦 **UnifiedAnalyzer** (class)

### `tests/integration/covenant_cocreation_test.rs`
- 📦 **implementation** (trait)
- 📦 **mappings** (trait)

### `tests/integration/qoq_integration_test.rs`
- 📦 **TestStruct** (struct)

### `tests/integration/websocket_mcp_test.rs`
- 📦 **TestServer** (struct)

### `tests/mocks/mod.rs`
- 📦 **MockWebSocketConnection** (struct)
- 📦 **MockGitHubClient** (struct)
- 📦 **MockQoQGenerator** (struct)
- 📦 **MockHostedAiClient** (struct)
- 📦 **MockGpuAllocation** (struct)
- 📦 **MockWasmClassifier** (struct)

## Import Dependencies

### `anyhow`
Used by 22 files:
- crates/harpoon_bridge/src/strike.rs
- crates/mcp_server/src/lib.rs
- crates/mcp_server/src/transport/http.rs
- crates/mcp_server/src/transport/websocket.rs
- crates/service/src/config.rs
- ... and 17 more

### `async_trait`
Used by 2 files:
- crates/orchestrator/src/tenant.rs
- tests/mocks/mod.rs

### `asyncio`
Used by 3 files:
- scripts/compliance/audit-trail-generator.py
- scripts/compliance/compliance-dashboard.py
- scripts/compliance/compliance-scanner.py

### `axum`
Used by 3 files:
- crates/mcp_server/src/transport/http.rs
- crates/orchestrator/src/server.rs
- crates/service/src/main.rs

### `boto3`
Used by 2 files:
- scripts/compliance/audit-trail-generator.py
- scripts/compliance/compliance-scanner.py

### `collections`
Used by 8 files:
- scripts/analyze_codebase.py
- scripts/analyze_codebase_simple.py
- scripts/generate_high_signal_graph.py
- scripts/generate_network_graph_enhanced.py
- scripts/generate_unified_analysis.py
- ... and 3 more

### `crate`
Used by 22 files:
- crates/harpoon_bridge/src/strike.rs
- crates/mcp_server/src/transport/http.rs
- crates/mcp_server/src/transport/websocket.rs
- crates/resources/src/prompts/covenant.rs
- tests/integration/github_oauth_test.rs
- ... and 17 more

### `dataclasses`
Used by 3 files:
- scripts/compliance/audit-trail-generator.py
- scripts/compliance/compliance-dashboard.py
- scripts/compliance/compliance-scanner.py

### `datetime`
Used by 8 files:
- scripts/analyze_codebase.py
- scripts/analyze_codebase_simple.py
- scripts/compliance/audit-trail-generator.py
- scripts/compliance/compliance-dashboard.py
- scripts/comprehensive_analysis.py
- ... and 3 more

### `engine_pymlx`
Used by 3 files:
- crates/mcp_server/src/cli.rs
- crates/orchestrator/src/lib.rs
- tests/integration/websocket_mcp_test.rs

### `enum`
Used by 2 files:
- scripts/compliance/audit-trail-generator.py
- scripts/compliance/compliance-scanner.py

### `futures_util`
Used by 2 files:
- crates/mcp_server/src/transport/websocket.rs
- tests/integration/websocket_mcp_test.rs

### `harpoon_bridge`
Used by 6 files:
- crates/mcp_server/src/cli.rs
- crates/mcp_server/src/handlers.rs
- crates/mcp_server/src/lib.rs
- tests/e2e/full_system_test.rs
- tests/integration/websocket_mcp_test.rs
- ... and 1 more

### `hashlib`
Used by 2 files:
- scripts/compliance/audit-trail-generator.py
- scripts/compliance/compliance-scanner.py

### `json`
Used by 15 files:
- scripts/analyze_codebase.py
- scripts/compliance/audit-trail-generator.py
- scripts/generate_comprehensive_network_graph.py
- scripts/generate_high_signal_graph.py
- scripts/generate_unified_analysis.py
- ... and 10 more

### `logging`
Used by 3 files:
- scripts/compliance/audit-trail-generator.py
- scripts/compliance/compliance-dashboard.py
- scripts/compliance/compliance-scanner.py

### `math`
Used by 4 files:
- scripts/generate_high_signal_graph.py
- scripts/generate_network_graph.py
- scripts/generate_network_graph_enhanced.py
- scripts/generate_network_graph_qoq.py

### `matplotlib.patches`
Used by 6 files:
- scripts/analysis/generate-project-analysis.py
- scripts/generate_comprehensive_network_graph.py
- scripts/generate_high_signal_graph.py
- scripts/generate_network_graph_enhanced.py
- scripts/generate_network_graph_qoq.py
- ... and 1 more

### `matplotlib.pyplot`
Used by 6 files:
- scripts/analysis/generate-project-analysis.py
- scripts/generate_comprehensive_network_graph.py
- scripts/generate_high_signal_graph.py
- scripts/generate_network_graph_enhanced.py
- scripts/generate_network_graph_qoq.py
- ... and 1 more

### `mcp_server`
Used by 2 files:
- crates/mcp_server/src/cli.rs
- tests/integration/websocket_mcp_test.rs

### `networkx`
Used by 3 files:
- scripts/analyze_codebase.py
- scripts/generate_high_signal_graph.py
- scripts/generate_network_graph_enhanced.py

### `numpy`
Used by 6 files:
- scripts/analysis/generate-project-analysis.py
- scripts/generate_comprehensive_network_graph.py
- scripts/generate_high_signal_graph.py
- scripts/generate_network_graph_enhanced.py
- scripts/generate_network_graph_qoq.py
- ... and 1 more

### `once_cell`
Used by 2 files:
- crates/harpoon-core/src/lib.rs
- crates/resources/src/lib.rs

### `orchestrator`
Used by 9 files:
- crates/harpoon_bridge/src/lib.rs
- crates/orchestrator/src/bin/homeskillet-orchestrator.rs
- crates/orchestrator/src/lib.rs
- crates/orchestrator/tests/hosted_ai_integration.rs
- tests/integration/hosted_ai_test.rs
- ... and 4 more

### `os`
Used by 5 files:
- scripts/analysis/generate-project-analysis.py
- scripts/analyze_codebase.py
- scripts/analyze_codebase_simple.py
- scripts/comprehensive_analysis.py
- scripts/qoq_emit.py

### `parking_lot`
Used by 6 files:
- crates/harpoon_bridge/src/fusion.rs
- crates/harpoon_bridge/src/lib.rs
- crates/mcp_server/src/lib.rs
- crates/orchestrator/src/hosted_ai.rs
- tests/mocks/mod.rs
- ... and 1 more

### `pathlib`
Used by 13 files:
- scripts/analyze_codebase.py
- scripts/analyze_codebase_simple.py
- scripts/generate_high_signal_graph.py
- scripts/generate_network_graph_enhanced.py
- scripts/generate_unified_analysis.py
- ... and 8 more

### `psycopg2`
Used by 2 files:
- scripts/compliance/audit-trail-generator.py
- scripts/compliance/compliance-scanner.py

### `pyo3`
Used by 3 files:
- crates/engine_pymlx/src/lib.rs
- crates/harpoon-core/src/lib.rs
- crates/pyffi/src/lib.rs

### `re`
Used by 4 files:
- scripts/analyze_codebase.py
- scripts/analyze_codebase_simple.py
- scripts/generate_unified_analysis.py
- scripts/qoq_emit.py

### `react`
Used by 7 files:
- web-ui/components/ConnectForm.tsx
- web-ui/components/GitHubAuth.tsx
- web-ui/components/QoQViewer.tsx
- web-ui/components/SessionLog.tsx
- web-ui/components/ToolList.tsx
- ... and 2 more

### `redis`
Used by 3 files:
- scripts/compliance/audit-trail-generator.py
- scripts/compliance/compliance-dashboard.py
- scripts/compliance/compliance-scanner.py

### `reqwest`
Used by 2 files:
- crates/orchestrator/src/hosted_ai.rs
- crates/service/src/auth/github_oauth.rs

### `resources`
Used by 3 files:
- crates/mcp_server/src/handlers.rs
- crates/mcp_server/src/lib.rs
- tests/e2e/full_system_test.rs

### `serde`
Used by 22 files:
- crates/harpoon_bridge/src/strike.rs
- crates/mcp_server/src/lib.rs
- crates/mcp_server/src/transport/websocket.rs
- crates/orchestrator/src/types.rs
- crates/service/src/config.rs
- ... and 17 more

### `serde_json`
Used by 13 files:
- crates/mcp_server/src/handlers.rs
- crates/resources/src/schemas/covenant.rs
- crates/resources/src/schemas/strike.rs
- crates/resources/src/tools/github.rs
- tests/integration/covenant_cocreation_test.rs
- ... and 8 more

### `std`
Used by 31 files:
- crates/harpoon_bridge/src/strike.rs
- crates/mcp_server/src/lib.rs
- crates/mcp_server/src/transport/websocket.rs
- crates/orchestrator/tests/hosted_ai_integration.rs
- tests/integration/covenant_cocreation_test.rs
- ... and 26 more

### `subprocess`
Used by 6 files:
- scripts/analyze_codebase.py
- scripts/analyze_codebase_simple.py
- scripts/compliance/compliance-scanner.py
- scripts/comprehensive_analysis.py
- scripts/generate_unified_analysis.py
- ... and 1 more

### `super`
Used by 14 files:
- crates/harpoon_bridge/src/fusion.rs
- crates/harpoon_bridge/src/lib.rs
- crates/mcp_server/src/transport/websocket.rs
- crates/service/src/auth/github_oauth.rs
- tests/e2e/full_system_test.rs
- ... and 9 more

### `sys`
Used by 2 files:
- scripts/generate_unified_analysis.py
- scripts/qoq_emit.py

### `the`
Used by 2 files:
- crates/harpoon_bridge/src/strike.rs
- tests/integration/github_oauth_test.rs

### `time`
Used by 2 files:
- scripts/compliance/audit-trail-generator.py
- scripts/qoq_emit.py

### `tokio`
Used by 8 files:
- crates/mcp_server/src/transport/websocket.rs
- crates/orchestrator/src/hosted_ai.rs
- crates/orchestrator/tests/hosted_ai_integration.rs
- crates/service/src/auth/github_oauth.rs
- tests/e2e/full_system_test.rs
- ... and 3 more

### `tokio_tungstenite`
Used by 2 files:
- crates/mcp_server/src/transport/websocket.rs
- tests/integration/websocket_mcp_test.rs

### `tower_http`
Used by 3 files:
- crates/mcp_server/src/transport/http.rs
- crates/orchestrator/src/server.rs
- crates/service/src/main.rs

### `tracing`
Used by 8 files:
- crates/harpoon_bridge/src/fusion.rs
- crates/harpoon_bridge/src/lib.rs
- crates/mcp_server/src/cli.rs
- crates/mcp_server/src/transport/websocket.rs
- crates/orchestrator/src/hosted_ai.rs
- ... and 3 more

### `tracing_subscriber`
Used by 2 files:
- crates/orchestrator/src/bin/homeskillet-orchestrator.rs
- crates/service/src/main.rs

### `typing`
Used by 11 files:
- scripts/analyze_codebase.py
- scripts/analyze_codebase_simple.py
- scripts/compliance/audit-trail-generator.py
- scripts/generate_high_signal_graph.py
- scripts/generate_unified_analysis.py
- ... and 6 more

### `uuid`
Used by 3 files:
- crates/harpoon_bridge/src/covenant.rs
- crates/orchestrator/src/hosted_ai.rs
- crates/orchestrator/src/tenant.rs

### `wasm_bindgen`
Used by 2 files:
- crates/harpoon-core/src/lib.rs
- crates/wasm_classifier/src/lib.rs

### `yaml`
Used by 3 files:
- scripts/compliance/compliance-dashboard.py
- scripts/compliance/compliance-scanner.py
- scripts/compliance/generate-policy-templates.py

