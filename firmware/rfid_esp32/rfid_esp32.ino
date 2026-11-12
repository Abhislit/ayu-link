#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>

const char *WIFI_SSID = "YOUR_WIFI_SSID";
const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char *API_BASE = "http://192.168.1.50:8000";
const char *DEVICE_KEY = "dev-device-key-1";
const char *UID_OVERRIDE = "";

const uint8_t SS_PIN = 5;
const uint8_t RST_PIN = 22;
const unsigned long DUPLICATE_WINDOW_MS = 3000;
const unsigned long WIFI_TIMEOUT_MS = 20000;

MFRC522 rfid(SS_PIN, RST_PIN);
String lastUid;
unsigned long lastUidAt = 0;

String readUidHex() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uid += "0";
    }
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected, IP ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection timed out");
  }
}

int postScan(const String &uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi unavailable, scan not sent");
    return -1;
  }
  HTTPClient http;
  http.begin(String(API_BASE) + "/api/rfid/scans");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  int code = http.POST("{\"uid\":\"" + uid + "\"}");
  Serial.print("HTTP ");
  Serial.println(code);
  Serial.println(http.getString());
  http.end();
  return code;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("AYU-LINK RFID reader ready");
  connectWifi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }
  String uid = String(UID_OVERRIDE).length() > 0 ? String(UID_OVERRIDE) : readUidHex();
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  unsigned long now = millis();
  if (uid == lastUid && now - lastUidAt < DUPLICATE_WINDOW_MS) {
    return;
  }
  lastUid = uid;
  lastUidAt = now;
  Serial.print("Card UID ");
  Serial.println(uid);
  int code = postScan(uid);
  if (code <= 0) {
    Serial.println("Retrying scan");
    delay(500);
    postScan(uid);
  }
}
