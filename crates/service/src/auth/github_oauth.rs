use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use reqwest::Client;
use tokio::time::sleep;

/// GitHub OAuth Device Flow implementation
pub struct GitHubDeviceFlow {
    client_id: String,
    client: Client,
}

#[derive(Serialize, Deserialize)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub scope: String,
}

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
pub enum PollResponse {
    Success(TokenResponse),
    Pending {
        error: String,
        error_description: Option<String>,
    },
}

impl GitHubDeviceFlow {
    pub fn new(client_id: String) -> Self {
        Self {
            client_id,
            client: Client::new(),
        }
    }
    
    /// Start the device flow authorization
    pub async fn start_device_flow(&self) -> Result<DeviceCodeResponse> {
        let params = [
            ("client_id", &self.client_id),
            ("scope", &"repo read:user user:email".to_string()),
        ];
        
        let response = self.client
            .post("https://github.com/login/device/code")
            .header("Accept", "application/json")
            .form(&params)
            .send()
            .await?;
            
        let device_response: DeviceCodeResponse = response.json().await?;
        Ok(device_response)
    }
    
    /// Poll for the access token
    pub async fn poll_for_token(&self, device_code: &str, interval: u64) -> Result<TokenResponse> {
        let params = [
            ("client_id", &self.client_id),
            ("device_code", device_code),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ];
        
        loop {
            sleep(Duration::from_secs(interval)).await;
            
            let response = self.client
                .post("https://github.com/login/oauth/access_token")
                .header("Accept", "application/json")
                .form(&params)
                .send()
                .await?;
                
            let poll_response: PollResponse = response.json().await?;
            
            match poll_response {
                PollResponse::Success(token) => return Ok(token),
                PollResponse::Pending { error, .. } => {
                    match error.as_str() {
                        "authorization_pending" => continue,
                        "slow_down" => {
                            // GitHub asks us to slow down
                            sleep(Duration::from_secs(5)).await;
                            continue;
                        }
                        _ => return Err(anyhow::anyhow!("OAuth error: {}", error)),
                    }
                }
            }
        }
    }
    
    /// Get user information
    pub async fn get_user(&self, access_token: &str) -> Result<serde_json::Value> {
        let response = self.client
            .get("https://api.github.com/user")
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "homeskillet-mcp")
            .send()
            .await?;
            
        let user_info = response.json().await?;
        Ok(user_info)
    }
}

/// Mock-first test module (London School TDD)
#[cfg(test)]
mod tests {
    use super::*;
    use mockito::{mock, Matcher};
    
    #[tokio::test]
    async fn test_start_device_flow() {
        let _m = mock("POST", "/login/device/code")
            .match_header("Accept", "application/json")
            .match_body(Matcher::AllOf(vec![
                Matcher::UrlEncoded("client_id".into(), "test_client".into()),
                Matcher::UrlEncoded("scope".into(), "repo read:user user:email".into()),
            ]))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{
                "device_code": "test_device_code",
                "user_code": "TEST-CODE",
                "verification_uri": "https://github.com/login/device",
                "expires_in": 900,
                "interval": 5
            }"#)
            .create();
            
        let flow = GitHubDeviceFlow::new("test_client".to_string());
        let result = flow.start_device_flow().await.unwrap();
        
        assert_eq!(result.device_code, "test_device_code");
        assert_eq!(result.user_code, "TEST-CODE");
        assert_eq!(result.interval, 5);
    }
}