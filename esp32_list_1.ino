#include <Adafruit_BME280.h>
#include <mbedtls/aes.h>
#include <mbedtls/base64.h>
#include <mbedtls/md.h>
#include <time.h>
#include <WiFiClientSecure.h>

const char *ssid = "your-ssid";
const char *password = "your-password";

const char *ntp_server = "[適当なNTPサーバ]";
const long gmt_offset_sec = 0;
const int daylight_offset_sec = 0;

const char *heroku_host = "[App name].herokuapp.com";
const char *heroku_root_ca = \
  "-----BEGIN CERTIFICATE-----\n" \
  "（略）\n" \
  "-----END CERTIFICATE-----\n";

Adafruit_BME280 bme;

#define DATE_LENGTH 20
#define VALUE_LENGTH 6
#define DIGEST_LENGTH 32
#define PLAIN_LENGTH (VALUE_LENGTH + 1 + DIGEST_LENGTH)
#define CIPHER_LENGTH 48
#define DIGEST_BYTE_LENGTH 16
#define KEY_BYTE_LENGTH 32
const int sensor1_id = [センサー1のID];
const int sensor2_id = [センサー2のID];
const char *sensor1_key_b64 = "[センサー1の共通鍵]";
const char *sensor2_key_b64 = "[センサー2の共通鍵]";
byte sensor1_key[KEY_BYTE_LENGTH], sensor2_key[KEY_BYTE_LENGTH];
const int delay_sec = 1800;

void setup() {
  Serial.begin(115200);
  while (!Serial) {}

  Serial.print("Preparing wifi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(1000);
  }
  Serial.println();

  Serial.print("Preparing bme280");
  while (!bme.begin(0x76)) {
    Serial.print(".");
    delay(1000);
  }
  Serial.println();

  configTime(gmt_offset_sec, daylight_offset_sec, ntp_server);

  size_t olen;
  mbedtls_base64_decode(
    sensor1_key,
    KEY_BYTE_LENGTH,
    &olen,
    (const byte *) sensor1_key_b64,
    strlen(sensor1_key_b64)
  );
  mbedtls_base64_decode(
    sensor2_key,
    KEY_BYTE_LENGTH,
    &olen,
    (const byte *) sensor2_key_b64,
    strlen(sensor2_key_b64)
  );
}

bool get_iso_formatted_date(char date[DATE_LENGTH + 1]) {
  struct tm tminfo;

  if (!getLocalTime(&tminfo)) {
    return false;
  } else {
    sprintf(
      date,
      "%04d-%02d-%02dT%02d:%02d:%02dZ",
      tminfo.tm_year + 1900,
      tminfo.tm_mon + 1,
      tminfo.tm_mday,
      tminfo.tm_hour,
      tminfo.tm_min,
      tminfo.tm_sec
    );
    return true;
  }
}

void digest(char *input, byte output[DIGEST_BYTE_LENGTH]) {
  const mbedtls_md_type_t md_type = MBEDTLS_MD_MD5;
  mbedtls_md_context_t ctx;

  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 0);
  mbedtls_md_starts(&ctx);
  mbedtls_md_update(&ctx, (const byte *) input, strlen(input));
  mbedtls_md_finish(&ctx, output);
  mbedtls_md_free(&ctx);
}

String encrypt(
  char input[PLAIN_LENGTH + 1],
  byte key[KEY_BYTE_LENGTH],
  byte iv[DIGEST_BYTE_LENGTH]
) {
  mbedtls_aes_context ctx;
  byte cipher[CIPHER_LENGTH], cipher_b64[65], plain[CIPHER_LENGTH];
  size_t olen;

  memcpy((void *) plain, (const void *) input, strlen(input));
  for (int i = 0; i < CIPHER_LENGTH - PLAIN_LENGTH; i++) {
    plain[PLAIN_LENGTH + i] = CIPHER_LENGTH - PLAIN_LENGTH;
  }

  mbedtls_aes_init(&ctx);
  mbedtls_aes_setkey_enc(&ctx, key, 256);
  mbedtls_aes_crypt_cbc(
    &ctx, MBEDTLS_AES_ENCRYPT, sizeof(plain), iv, plain, cipher
  );
  mbedtls_aes_free(&ctx);

  mbedtls_base64_encode(
    cipher_b64, sizeof(cipher_b64), &olen, cipher, sizeof(cipher)
  );

  return String((const char *) cipher_b64);
}

String generate_request_body(
  float value, char date[DATE_LENGTH + 1], byte key[KEY_BYTE_LENGTH]
) {
  byte iv[DIGEST_BYTE_LENGTH], value_digest[DIGEST_BYTE_LENGTH];
  char plain[PLAIN_LENGTH + 1], str_value[VALUE_LENGTH + 1];
  char str_value_digest[DIGEST_LENGTH + 1] = "";

  sprintf(str_value, "%+06.1f", value);
  digest(date, iv);
  digest(str_value, value_digest);
  for (int i=0; i<sizeof(value_digest); i++) {
    sprintf(&str_value_digest[i*2], "%02x", (const int) value_digest[i]);
  }
  sprintf(plain, "%s,%s", str_value, str_value_digest);

  return "{\"strDate\":\"" + \
    String(date) + \
    "\",\"cipherText\":\"" + \
    encrypt(plain, key, iv) + \
    "\"}";
}

void post_datum(int sensor_id, String request_body) {
  WiFiClientSecure client;
  unsigned long timeout;
  const unsigned long https_timeout_threshold_sec = 10;

  client.setCACert(heroku_root_ca);
  Serial.println("Starting connection...");
  if (!client.connect(heroku_host, 443)) {
    Serial.println("Connection failed");
    return;
  } else {
    Serial.println("Connected");

    client.println("POST /sensors/" + String(sensor_id) + "/datum HTTP/1.1");
    client.println("Host: " + String(heroku_host));
    client.println("Content-Type: application/json");
    client.println("Content-Length: " + String(request_body.length()));
    client.println();
    client.println(request_body);
  }

  timeout = millis() + https_timeout_threshold_sec * 1000;
  while (client.available() == 0) {
    if (timeout - millis() < 0) {
      Serial.println("Client timeout");
      client.stop();
      return;
    }
  }

  while (client.available()) {
    Serial.print(client.readStringUntil('\r'));
  }
  Serial.println();
  Serial.println("Closing connection");
  client.stop();

  return;
}

void loop() {
  char date[DATE_LENGTH + 1];
  float sensor1_value = bme.readTemperature();
  float sensor2_value = bme.readHumidity();

  if (get_iso_formatted_date(date)) {
    if (!isnan(sensor1_value)) {
      post_datum(
        sensor1_id,
        generate_request_body(sensor1_value, date, sensor1_key)
      );
    }

    if (!isnan(sensor2_value)) {
      post_datum(
        sensor2_id,
        generate_request_body(sensor2_value, date, sensor2_key)
      );
    }
  }

  delay(delay_sec * 1000);
}
