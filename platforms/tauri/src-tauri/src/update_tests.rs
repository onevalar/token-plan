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
