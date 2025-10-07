use std::collections::VecDeque;
use std::sync::Arc;

use base64::{engine::general_purpose::STANDARD_NO_PAD, Engine as _};
use once_cell::sync::Lazy;
use rayon::prelude::*;
use regex::Regex;
use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};
use thiserror::Error;

#[cfg(not(target_arch = "wasm32"))]
use rayon::ThreadPool;

#[cfg(feature = "python")]
use pyo3::exceptions::PyValueError;
#[cfg(feature = "python")]
use pyo3::prelude::*;
#[cfg(feature = "python")]
use pyo3::types::PyAny;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[derive(Clone)]
pub struct FragmentInput {
    pub path: String,
    pub idx: u32,
    pub lines: String,
    pub body: String,
}

#[derive(Clone, Serialize, Deserialize)]
struct FragmentInputSerde {
    path: String,
    idx: u32,
    lines: String,
    body: String,
}

impl From<FragmentInputSerde> for FragmentInput {
    fn from(value: FragmentInputSerde) -> Self {
        Self {
            path: value.path,
            idx: value.idx,
            lines: value.lines,
            body: value.body,
        }
    }
}

#[cfg(feature = "python")]
impl<'py> FromPyObject<'py> for FragmentInput {
    fn extract_bound(obj: &pyo3::Bound<'py, PyAny>) -> PyResult<Self> {
        Ok(Self {
            path: obj.get_item("path")?.extract()?,
            idx: obj.get_item("idx")?.extract()?,
            lines: obj.get_item("lines")?.extract()?,
            body: obj.get_item("body")?.extract()?,
        })
    }
}

#[derive(Clone)]
struct FragmentState {
    input: FragmentInput,
    hash: String,
    fingerprint: String,
    language: String,
    hygiene_score: Option<f32>,
    status: FragmentStatus,
}

impl FragmentState {
    fn new(input: FragmentInput) -> Self {
        let hash = compute_anchor_hash(&input.body);
        let fingerprint = compute_fingerprint(&input.body);
        let language = detect_language(&input.path, &input.body);
        Self {
            input,
            hash,
            fingerprint,
            language,
            hygiene_score: None,
            status: FragmentStatus::Pending,
        }
    }

    fn to_report(&self) -> FragmentReport {
        FragmentReport {
            path: self.input.path.clone(),
            idx: self.input.idx,
            lines: self.input.lines.clone(),
            hash: self.hash.clone(),
            hygiene_score: self.hygiene_score,
            language: self.language.clone(),
            fingerprint: self.fingerprint.clone(),
            body_len: self.input.body.len(),
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum FragmentStatus {
    Pending,
    Requeued,
    Absorbed,
}

#[cfg_attr(feature = "python", pyclass(module = "harpoon_core"))]
#[derive(Clone, Serialize)]
pub struct FragmentReport {
    pub path: String,
    pub idx: u32,
    pub lines: String,
    pub hash: String,
    pub hygiene_score: Option<f32>,
    pub language: String,
    pub fingerprint: String,
    pub body_len: usize,
}

#[cfg_attr(feature = "python", pyclass(module = "harpoon_core"))]
#[derive(Clone, Serialize)]
pub struct CycleEvent {
    event: String,
    path: String,
    idx: u32,
    lines: String,
    hash: String,
    hygiene_score: f32,
    anchor_prev: Option<String>,
    anchor_next: Option<String>,
    language: String,
    fingerprint: String,
    iteration_index: usize,
}

#[cfg_attr(feature = "python", pyclass(module = "harpoon_core"))]
#[derive(Clone, Serialize)]
pub struct HarpoonCycle {
    absorbed: Vec<FragmentReport>,
    pending: Vec<FragmentReport>,
    events: Vec<CycleEvent>,
    iterations: usize,
    anchors: Vec<String>,
}

impl HarpoonCycle {
    fn from_data(data: HarpoonCycleData) -> Self {
        Self {
            absorbed: data.absorbed,
            pending: data.pending,
            events: data.events,
            iterations: data.iterations,
            anchors: data.anchors,
        }
    }
    
    // Public accessors for Rust usage - prefixed to avoid conflicts with Python getters
    pub fn get_absorbed(&self) -> &[FragmentReport] {
        &self.absorbed
    }
    
    pub fn get_pending(&self) -> &[FragmentReport] {
        &self.pending
    }
    
    pub fn get_events(&self) -> &[CycleEvent] {
        &self.events
    }
    
    pub fn get_iterations(&self) -> usize {
        self.iterations
    }
    
    pub fn get_anchors(&self) -> &[String] {
        &self.anchors
    }
}

#[cfg_attr(feature = "python", pyclass(module = "harpoon_core"))]
pub struct HarpoonEngine {
    inner: Arc<EngineCore>,
}

struct EngineCore {
    max_batch: usize,
    configured_threads: Option<usize>,
    #[cfg(not(target_arch = "wasm32"))]
    pool: Arc<ThreadPool>,
}

#[derive(Debug, Error)]
enum EngineError {
    #[error("thread pool requires at least one thread")]
    ZeroThreads,
    #[error("failed to build rayon thread pool: {0}")]
    ThreadPoolBuild(String),
}

impl EngineCore {
    fn new(max_batch: usize, num_threads: Option<usize>) -> Result<Self, EngineError> {
        if matches!(num_threads, Some(0)) {
            return Err(EngineError::ZeroThreads);
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            let mut builder = rayon::ThreadPoolBuilder::new();
            if let Some(threads) = num_threads {
                builder = builder.num_threads(threads);
            }
            let pool = builder
                .build()
                .map_err(|err| EngineError::ThreadPoolBuild(err.to_string()))?;
            Ok(Self {
                max_batch: max_batch.max(1),
                configured_threads: num_threads,
                pool: Arc::new(pool),
            })
        }
        #[cfg(target_arch = "wasm32")]
        {
            Ok(Self {
                max_batch: max_batch.max(1),
                configured_threads: num_threads,
            })
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    fn compute_states(&self, fragments: Vec<FragmentInput>) -> Vec<FragmentState> {
        self.pool.install(move || {
            fragments
                .into_par_iter()
                .with_min_len(self.max_batch)
                .map(FragmentState::new)
                .collect()
        })
    }

    #[cfg(target_arch = "wasm32")]
    fn compute_states(&self, fragments: Vec<FragmentInput>) -> Vec<FragmentState> {
        fragments.into_iter().map(FragmentState::new).collect()
    }

    fn configured_threads(&self) -> Option<usize> {
        self.configured_threads
    }

    fn thread_count(&self) -> usize {
        #[cfg(not(target_arch = "wasm32"))]
        {
            self.pool.current_num_threads()
        }
        #[cfg(target_arch = "wasm32")]
        {
            1
        }
    }

    fn run_cycle(
        &self,
        fragments: Vec<FragmentInput>,
        hygiene_threshold: f32,
        max_iterations: Option<usize>,
    ) -> HarpoonCycleData {
        if fragments.is_empty() {
            return HarpoonCycleData::default();
        }

        let mut states: Vec<FragmentState> = self.compute_states(fragments);

        let mut queue: VecDeque<usize> = (0..states.len()).collect();
        let mut anchors: Vec<String> = Vec::new();
        let mut events: Vec<CycleEvent> = Vec::new();
        let mut absorbed_indices: Vec<usize> = Vec::new();
        let mut iterations: usize = 0;
        let mut last_anchor: Option<String> = None;

        while let Some(idx) = queue.pop_front() {
            if let Some(limit) = max_iterations {
                if iterations >= limit {
                    queue.push_front(idx);
                    break;
                }
            }

            iterations += 1;

            let state = states.get_mut(idx).expect("index in range");
            let score = hygiene_score(&state.input.body, &state.language);
            state.hygiene_score = Some(score);

            if score >= hygiene_threshold {
                state.status = FragmentStatus::Absorbed;
                anchors.push(state.hash.clone());
                absorbed_indices.push(idx);
                let event = CycleEvent {
                    event: "fragment_absorbed".to_string(),
                    path: state.input.path.clone(),
                    idx: state.input.idx,
                    lines: state.input.lines.clone(),
                    hash: state.hash.clone(),
                    hygiene_score: score,
                    anchor_prev: last_anchor.clone(),
                    anchor_next: Some(state.hash.clone()),
                    language: state.language.clone(),
                    fingerprint: state.fingerprint.clone(),
                    iteration_index: iterations,
                };
                last_anchor = Some(state.hash.clone());
                events.push(event);
            } else {
                state.status = FragmentStatus::Requeued;
                let event = CycleEvent {
                    event: "fragment_requeued".to_string(),
                    path: state.input.path.clone(),
                    idx: state.input.idx,
                    lines: state.input.lines.clone(),
                    hash: state.hash.clone(),
                    hygiene_score: score,
                    anchor_prev: last_anchor.clone(),
                    anchor_next: last_anchor.clone(),
                    language: state.language.clone(),
                    fingerprint: state.fingerprint.clone(),
                    iteration_index: iterations,
                };
                events.push(event);
                queue.push_back(idx);
            }
        }

        let absorbed = absorbed_indices
            .into_iter()
            .map(|idx| states[idx].to_report())
            .collect();

        let pending = queue.iter().map(|idx| states[*idx].to_report()).collect();

        HarpoonCycleData {
            absorbed,
            pending,
            events,
            iterations,
            anchors,
        }
    }
}

#[derive(Default, Clone, Serialize)]
struct HarpoonCycleData {
    absorbed: Vec<FragmentReport>,
    pending: Vec<FragmentReport>,
    events: Vec<CycleEvent>,
    iterations: usize,
    anchors: Vec<String>,
}

fn compute_anchor_hash(body: &str) -> String {
    let mut hasher = Sha3_256::new();
    hasher.update(body.as_bytes());
    let digest = hasher.finalize();
    hex::encode(digest)
}

fn compute_fingerprint(body: &str) -> String {
    let mut hasher = Sha3_256::new();
    hasher.update(body.as_bytes());
    let digest = hasher.finalize();
    let preview = &digest[..12.min(digest.len())];
    STANDARD_NO_PAD.encode(preview)
}

static PY_KEYWORDS: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?m)^\s*(def |class |async |from |import )").expect("python regex compile")
});

static RUST_KEYWORDS: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?m)^\s*(pub |fn |impl |use |struct |enum )").expect("rust regex compile")
});

static JS_KEYWORDS: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?m)^\s*(export |import |const |let |async |function )").expect("js regex compile")
});

fn detect_language(path: &str, body: &str) -> String {
    let lower = path.to_ascii_lowercase();
    if lower.ends_with(".py") || PY_KEYWORDS.is_match(body) {
        "python".to_string()
    } else if lower.ends_with(".rs") || RUST_KEYWORDS.is_match(body) {
        "rust".to_string()
    } else if lower.ends_with(".ts")
        || lower.ends_with(".tsx")
        || lower.ends_with(".js")
        || JS_KEYWORDS.is_match(body)
    {
        "typescript".to_string()
    } else if lower.ends_with(".json") || lower.ends_with(".yaml") || lower.ends_with(".yml") {
        "config".to_string()
    } else {
        "text".to_string()
    }
}

fn hygiene_score(body: &str, language: &str) -> f32 {
    let line_count = body.lines().count().max(1) as f32;
    let char_count = body.chars().count().max(1) as f32;
    let token_count = body.split_whitespace().count().max(1) as f32;
    let indent_balance = compute_indent_balance(body);
    let comment_ratio = compute_comment_ratio(body, language);
    let structure_bonus = match language {
        "python" | "rust" | "typescript" => 0.1,
        "config" => 0.05,
        _ => 0.0,
    };

    let token_density = (token_count / line_count / 8.0).clamp(0.0, 1.0);
    let char_density = (char_count / line_count / 120.0).clamp(0.0, 1.0);
    let indent_quality = indent_balance.clamp(0.0, 1.0);
    let comment_penalty = (1.0 - comment_ratio.clamp(0.0, 0.8) / 0.8).clamp(0.0, 1.0);

    let mut score = 0.25 * token_density
        + 0.25 * char_density
        + 0.25 * indent_quality
        + 0.15 * comment_penalty
        + structure_bonus;
    if score > 1.0 {
        score = 1.0;
    }
    if score < 0.0 {
        score = 0.0;
    }
    (score * 10000.0).round() / 10000.0
}

fn compute_indent_balance(body: &str) -> f32 {
    let mut depths = Vec::new();
    for line in body.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let depth = line.chars().take_while(|c| *c == ' ' || *c == '\t').count();
        depths.push(depth as f32);
    }
    if depths.is_empty() {
        return 0.5;
    }
    let avg = depths.iter().sum::<f32>() / depths.len() as f32;
    let variance = depths.iter().map(|d| (d - avg).powi(2)).sum::<f32>() / depths.len() as f32;
    let stability = (1.0 / (1.0 + variance / 16.0)).clamp(0.0, 1.0);
    stability
}

fn compute_comment_ratio(body: &str, language: &str) -> f32 {
    let mut comment_lines = 0usize;
    let mut total_lines = 0usize;
    for line in body.lines() {
        if line.trim().is_empty() {
            continue;
        }
        total_lines += 1;
        let trimmed = line.trim();
        let is_comment = match language {
            "python" => trimmed.starts_with('#'),
            "rust" => trimmed.starts_with("//") || trimmed.starts_with("/*"),
            "typescript" => trimmed.starts_with("//") || trimmed.starts_with("/*"),
            "config" => trimmed.starts_with('#') || trimmed.starts_with("//"),
            _ => trimmed.starts_with('#') || trimmed.starts_with("//"),
        };
        if is_comment {
            comment_lines += 1;
        }
    }
    if total_lines == 0 {
        0.0
    } else {
        comment_lines as f32 / total_lines as f32
    }
}

#[cfg(feature = "python")]
#[pymethods]
impl FragmentReport {
    #[getter]
    fn path(&self) -> &str {
        &self.path
    }

    #[getter]
    fn idx(&self) -> u32 {
        self.idx
    }

    #[getter]
    fn lines(&self) -> &str {
        &self.lines
    }

    #[getter]
    fn hash(&self) -> &str {
        &self.hash
    }

    #[getter]
    fn hygiene_score(&self) -> Option<f32> {
        self.hygiene_score
    }

    #[getter]
    fn language(&self) -> &str {
        &self.language
    }

    #[getter]
    fn fingerprint(&self) -> &str {
        &self.fingerprint
    }

    #[getter]
    fn body_len(&self) -> usize {
        self.body_len
    }

    pub fn as_dict(&self, py: Python<'_>) -> PyResult<PyObject> {
        let payload =
            serde_json::to_value(self).map_err(|err| PyValueError::new_err(err.to_string()))?;
        serde_json_to_py(py, payload)
    }
}

#[cfg(feature = "python")]
#[pymethods]
impl CycleEvent {
    #[getter]
    fn event(&self) -> &str {
        &self.event
    }

    #[getter]
    fn path(&self) -> &str {
        &self.path
    }

    #[getter]
    fn idx(&self) -> u32 {
        self.idx
    }

    #[getter]
    fn lines(&self) -> &str {
        &self.lines
    }

    #[getter]
    fn hash(&self) -> &str {
        &self.hash
    }

    #[getter]
    fn hygiene_score(&self) -> f32 {
        self.hygiene_score
    }

    #[getter]
    fn anchor_prev(&self) -> Option<String> {
        self.anchor_prev.clone()
    }

    #[getter]
    fn anchor_next(&self) -> Option<String> {
        self.anchor_next.clone()
    }

    #[getter]
    fn language(&self) -> &str {
        &self.language
    }

    #[getter]
    fn fingerprint(&self) -> &str {
        &self.fingerprint
    }

    #[getter]
    fn iteration_index(&self) -> usize {
        self.iteration_index
    }

    pub fn as_dict(&self, py: Python<'_>) -> PyResult<PyObject> {
        let payload =
            serde_json::to_value(self).map_err(|err| PyValueError::new_err(err.to_string()))?;
        serde_json_to_py(py, payload)
    }
}

#[cfg(feature = "python")]
#[pymethods]
impl HarpoonCycle {
    #[getter]
    fn absorbed(&self) -> Vec<FragmentReport> {
        self.absorbed.clone()
    }

    #[getter]
    fn pending(&self) -> Vec<FragmentReport> {
        self.pending.clone()
    }

    #[getter]
    fn events(&self) -> Vec<CycleEvent> {
        self.events.clone()
    }

    #[getter]
    fn iterations(&self) -> usize {
        self.iterations
    }

    #[getter]
    fn anchors(&self) -> Vec<String> {
        self.anchors.clone()
    }

    pub fn as_dict(&self, py: Python<'_>) -> PyResult<PyObject> {
        let payload =
            serde_json::to_value(self).map_err(|err| PyValueError::new_err(err.to_string()))?;
        serde_json_to_py(py, payload)
    }
}

// Native Rust implementation - always available
impl HarpoonEngine {
    /// Constructor for direct Rust usage (non-Python)
    pub fn new_native(max_batch: Option<usize>, num_threads: Option<usize>) -> Result<Self, String> {
        let batch = max_batch.unwrap_or(64);
        let core = EngineCore::new(batch, num_threads)
            .map_err(|err| err.to_string())?;
        Ok(Self {
            inner: Arc::new(core),
        })
    }
    
    /// Run cycle directly without Python
    pub fn run_native_cycle(
        &self,
        fragments: Vec<FragmentInput>,
        hygiene_threshold: f32,
        max_iterations: Option<usize>,
    ) -> Result<HarpoonCycle, String> {
        let data = self.inner.run_cycle(fragments, hygiene_threshold, max_iterations);
        Ok(HarpoonCycle::from_data(data))
    }
    
    /// Compute fingerprint for content
    pub fn compute_fingerprint(&self, body: &str) -> String {
        compute_fingerprint(body)
    }
    
    /// Get thread count
    pub fn thread_count(&self) -> usize {
        self.inner.thread_count()
    }
    
    /// Get configured thread count
    pub fn configured_thread_count(&self) -> Option<usize> {
        self.inner.configured_threads()
    }
}

#[cfg(feature = "python")]
#[pymethods]
impl HarpoonEngine {
    #[new]
    #[pyo3(signature = (max_batch=None, num_threads=None))]
    pub fn new(max_batch: Option<usize>, num_threads: Option<usize>) -> PyResult<Self> {
        let batch = max_batch.unwrap_or(64);
        let core = EngineCore::new(batch, num_threads)
            .map_err(|err| PyValueError::new_err(err.to_string()))?;
        Ok(Self {
            inner: Arc::new(core),
        })
    }

    #[pyo3(signature = (fragments, hygiene_threshold, max_iterations=None))]
    pub fn envelope_cycle(
        &self,
        py: Python<'_>,
        fragments: Vec<FragmentInput>,
        hygiene_threshold: f32,
        max_iterations: Option<usize>,
    ) -> PyResult<HarpoonCycle> {
        let inner = self.inner.clone();
        let data =
            py.allow_threads(|| inner.run_cycle(fragments, hygiene_threshold, max_iterations));
        Ok(HarpoonCycle::from_data(data))
    }

    pub fn fingerprint(&self, body: &str) -> String {
        compute_fingerprint(body)
    }

    #[getter]
    fn threads(&self) -> usize {
        self.inner.thread_count()
    }

    #[getter]
    fn configured_threads(&self) -> Option<usize> {
        self.inner.configured_threads()
    }
}

#[cfg(feature = "python")]
#[pyfunction]
pub fn fragment_hash(body: &str) -> String {
    compute_anchor_hash(body)
}

#[cfg(feature = "python")]
#[pymodule]
fn harpoon_core(_py: Python<'_>, m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<HarpoonEngine>()?;
    m.add_class::<HarpoonCycle>()?;
    m.add_class::<FragmentReport>()?;
    m.add_class::<CycleEvent>()?;
    m.add_function(wrap_pyfunction!(fragment_hash, m)?)?;
    m.add(
        "__doc__",
        "Rust fusion envelope primitives exposed via PyO3",
    )?;
    Ok(())
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub struct WasmHarpoonEngine {
    inner: Arc<EngineCore>,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl WasmHarpoonEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(
        max_batch: Option<usize>,
        num_threads: Option<usize>,
    ) -> Result<WasmHarpoonEngine, JsValue> {
        let batch = max_batch.unwrap_or(64);
        let core = EngineCore::new(batch, num_threads)
            .map_err(|err| JsValue::from_str(&err.to_string()))?;
        Ok(WasmHarpoonEngine {
            inner: Arc::new(core),
        })
    }

    #[wasm_bindgen]
    pub fn envelope_cycle(
        &self,
        fragments: JsValue,
        hygiene_threshold: f32,
        max_iterations: Option<u32>,
    ) -> Result<JsValue, JsValue> {
        let payload: Vec<FragmentInputSerde> = serde_wasm_bindgen::from_value(fragments)?;
        let fragments: Vec<FragmentInput> = payload.into_iter().map(FragmentInput::from).collect();
        let data = self.inner.run_cycle(
            fragments,
            hygiene_threshold,
            max_iterations.map(|v| v as usize),
        );
        Ok(serde_wasm_bindgen::to_value(&data)?)
    }

    #[wasm_bindgen]
    pub fn fragment_hash(&self, body: &str) -> String {
        compute_anchor_hash(body)
    }
}

#[cfg(feature = "python")]
fn serde_json_to_py(py: Python<'_>, value: serde_json::Value) -> PyResult<PyObject> {
    let json =
        serde_json::to_string(&value).map_err(|err| PyValueError::new_err(err.to_string()))?;
    let module = PyModule::import_bound(py, "json")?;
    let obj = module.call_method1("loads", (json,))?;
    Ok(obj.into())
}
