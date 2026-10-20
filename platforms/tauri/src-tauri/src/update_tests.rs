use base64::{engine::general_purpose::STANDARD, Engine};
use minisign_verify::{PublicKey,Signature};
#[test]
fn updater_signature_accepts_original_and_rejects_tampering() {
    // Ephemeral fixture key; the private key was discarded, not committed.
    let fixture:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/signature.json")).unwrap();
    let decode=|key:&str|String::from_utf8(STANDARD.decode(fixture[key].as_str().unwrap()).unwrap()).unwrap();
    let key=PublicKey::decode(&decode("pubkey")).unwrap();
    let signature=Signature::decode(&decode("signature")).unwrap();
    assert!(key.verify(fixture["payload"].as_str().unwrap().as_bytes(),&signature,true).is_ok());
    assert!(key.verify(b"tampered installer",&signature,true).is_err());
}

#[test]
#[ignore = "Runs against the signed artifact produced by CI packaging"]
fn verify_packaged_update() {
    let path=std::env::var("TOKENPLAN_VERIFY_ARTIFACT").expect("artifact path");
    let config:serde_json::Value=serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
    let decode=|value:&str|String::from_utf8(STANDARD.decode(value.trim()).unwrap()).unwrap();
    let key=PublicKey::decode(&decode(config["plugins"]["updater"]["pubkey"].as_str().unwrap())).unwrap();
    let signature=Signature::decode(&decode(&std::fs::read_to_string(format!("{path}.sig")).unwrap())).unwrap();
    let data=std::fs::read(path).unwrap();
    key.verify(&data,&signature,true).expect("packaged artifact must match the configured public key");
}
